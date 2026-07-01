import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit } from '../_shared/compliance.ts';
import { chatJSON } from '../_shared/llm.ts';

// search-network (v1): the "who can help me with X" half of the Circle box.
//
// First CLASSIFY the query: is the user describing their OWN direction
// ("working_on") — in which case the client falls back to the existing read+rank
// loop — or looking to FIND a person / a kind of person ("find_people")? For a
// find, prefilter the WHOLE circle over data we ALREADY have (title, company, tags,
// note, dossier) and LLM-rank the grounded first-degree fits, each with a one-line
// why + the real fact that matched + a confidence.
//
// Honest by construction: only people whose REAL data supports the match are
// returned; nothing is invented. v1 does NO new enrichment and NO second-degree
// ("might know someone") — those arrive with the pgvector engine + the credit-gated
// max-effort enrichment (see the plan). Provider-fallback LLM via _shared/llm.ts.

const MAX_CANDIDATES = 50;   // cap what we hand the ranker (token budget)
const MAX_FETCH = 120;       // cap what we pull to prefilter over
const MAX_RESULTS = 6;

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'to', 'of', 'in', 'on', 'at', 'with', 'who',
  'someone', 'people', 'person', 'find', 'looking', 'need', 'want', 'know', 'anyone',
  'that', 'this', 'help', 'me', 'my', 'is', 'are', 'can', 'i', 'im',
]);

const CLASSIFY = `Decide what a fractional executive means by a short phrase they typed into a box that can either (a) capture what THEY are working on / their own offer / direction, or (b) search their network to FIND a person or a TYPE of person who could help.

Return ONLY JSON: { "intent": "working_on" | "find_people", "confidence": number }

- "find_people": naming a person, a role, a company/kind of company, an industry, or an ask like "who knows a…", "intro to…", "someone at…", or a bare noun phrase that reads as a target to find (e.g. "venture fund", "a fractional CFO", "someone in fintech").
- "working_on": describing their own situation, offer, or goal in the first person or as a statement about their practice (e.g. "productizing my CFO service", "pricing my retainer").
- When genuinely torn, prefer "find_people" (the box's find path degrades gracefully to an honest empty state; the working_on path rewrites their profile).`;

const RANK = `You match a fractional executive's REAL network to a "who can help with this" query. For each candidate you are given only facts we already hold (title, company, tags, note, and an enrichment summary / past employers when present).

Return ONLY JSON: { "people": [ { "candidate_id": string, "why": string, "matched_on": string, "confidence": number } ] }

Rules:
- Pick from the candidates only; use their exact candidate_id.
- FIRST-DEGREE ONLY: include a person only if THEIR OWN data fits the query (they are, or have been, the thing being sought). Do NOT guess who someone "might know" — that second-degree step does not exist yet.
- "why": one tight sentence, grounded in the candidate's real facts, addressed to the user. NEVER a message to send.
- "matched_on": the specific real fact that made them a fit, short (e.g. "Partner at Accel", "past: Sequoia", "tag: fintech", "title: Investor").
- "confidence": 0..1 — how well the real facts support the match. Be conservative.
- Only include grounded matches. If nothing genuinely fits, return an empty array. Never invent employers, roles, or relationships.
- Return at most ${MAX_RESULTS} people, best first.`;

interface Row {
  id: string;
  display_name: string;
  title: string | null;
  company: string | null;
  tags: string[] | null;
  note: string | null;
  dossier: Record<string, unknown> | null;
  warmth: number | null;
}

const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);

// Compact, token-cheap view of a candidate for both the keyword prefilter and the ranker.
function compact(r: Row) {
  const d = r.dossier ?? {};
  const summary = typeof d.summary === 'string' ? d.summary : (typeof d.llm_summary === 'string' ? d.llm_summary : '');
  const exp = Array.isArray(d.experience) ? d.experience : [];
  const past = exp
    .map((e) => (e && typeof e === 'object' ? [(e as Record<string, unknown>).title, (e as Record<string, unknown>).company].filter(Boolean).join(' @ ') : ''))
    .filter(Boolean)
    .slice(0, 6)
    .join('; ');
  return {
    candidate_id: r.id,
    name: r.display_name,
    title: r.title,
    company: r.company,
    tags: (r.tags ?? []).slice(0, 8),
    note: r.note ? trunc(r.note, 200) : null,
    summary: summary ? trunc(summary, 240) : null,
    past: past || null,
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { userId, supabase } = await requireAuth(req);
    checkRateLimit(`search-network:${userId}`, 12, 60_000);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const query: string = typeof body?.query === 'string' ? body.query.slice(0, 400).trim() : '';
    if (!query) {
      return new Response(JSON.stringify({ error: 'Tell me who or what you are looking for.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Classify intent ──────────────────────────────────────────────────────
    let intent: 'working_on' | 'find_people' = 'find_people';
    try {
      const { content } = await chatJSON({ system: CLASSIFY, user: query, temperature: 0, maxTokens: 60 });
      const parsed = JSON.parse(content);
      if (parsed?.intent === 'working_on') intent = 'working_on';
    } catch {
      // Fail toward find_people — the honest, non-destructive path.
    }
    if (intent === 'working_on') {
      return new Response(JSON.stringify({ intent }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Prefilter the whole circle over data we already have ─────────────────
    const { data: rows } = await supabase
      .from('circle_person')
      .select('id, display_name, title, company, tags, note, dossier, warmth')
      .eq('user_id', userId)
      .order('warmth', { ascending: false, nullsFirst: false })
      .limit(MAX_FETCH);
    const all = ((rows ?? []) as Row[]).map(compact);
    if (!all.length) {
      return new Response(JSON.stringify({ intent, people: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Keyword-score candidates on literal token overlap, then blend with top-warmth
    // fill so semantic-but-non-literal fits (e.g. "venture fund" vs "Partner at
    // Sequoia") still reach the ranker. No embeddings yet — that's the v2 engine.
    const tokens = query.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2 && !STOPWORDS.has(t));
    const textOf = (c: ReturnType<typeof compact>) =>
      [c.name, c.title, c.company, (c.tags ?? []).join(' '), c.note, c.summary, c.past].filter(Boolean).join(' ').toLowerCase();
    const scored = all.map((c) => {
      const hay = textOf(c);
      const score = tokens.reduce((n, t) => (hay.includes(t) ? n + 1 : n), 0);
      return { c, score };
    });
    const hits = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).map((s) => s.c);
    const rest = scored.filter((s) => s.score === 0).map((s) => s.c); // already warmth-ordered
    const seen = new Set<string>();
    const candidates: ReturnType<typeof compact>[] = [];
    for (const c of [...hits, ...rest]) {
      if (seen.has(c.candidate_id)) continue;
      seen.add(c.candidate_id);
      candidates.push(c);
      if (candidates.length >= MAX_CANDIDATES) break;
    }

    // ── Rank the grounded first-degree fits ──────────────────────────────────
    let ranked: Array<{ candidate_id: string; why: string; matched_on: string; confidence: number }> = [];
    try {
      const { content } = await chatJSON({
        system: RANK,
        user: JSON.stringify({ query, candidates }),
        temperature: 0.2,
        maxTokens: 700,
      });
      const parsed = JSON.parse(content);
      ranked = Array.isArray(parsed?.people) ? parsed.people : [];
    } catch (e) {
      return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'search failed' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const byId = new Map(candidates.map((c) => [c.candidate_id, c]));
    const people = ranked
      .filter((r) => byId.has(r.candidate_id) && typeof r.why === 'string' && r.why.trim())
      .slice(0, MAX_RESULTS)
      .map((r) => {
        const c = byId.get(r.candidate_id)!;
        return {
          id: c.candidate_id,
          name: c.name,
          title: c.title,
          company: c.company,
          why: r.why.trim(),
          matched_on: typeof r.matched_on === 'string' && r.matched_on.trim() ? r.matched_on.trim() : null,
          confidence: typeof r.confidence === 'number' ? Math.max(0, Math.min(1, r.confidence)) : null,
        };
      });

    return new Response(JSON.stringify({ intent, people }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

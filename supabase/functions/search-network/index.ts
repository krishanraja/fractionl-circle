import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit } from '../_shared/compliance.ts';
import { chatJSON, embed } from '../_shared/llm.ts';
import { backfillEmbeddings, vecToStr } from '../_shared/circleEmbed.ts';

// search-network (v2): the "who can help me with X" half of the Circle box.
//
// First CLASSIFY the query: is the user describing their OWN direction
// ("working_on") - the client then falls back to the existing read+rank loop - or
// looking to FIND a person / a kind of person ("find_people")?
//
// For a find, retrieve candidates two ways and union them:
//   • SEMANTIC - pgvector nearest-neighbour over each person's embedded profile, so
//     "venture fund" reaches "Partner at Sequoia" by meaning, beyond warmth or exact
//     words. (Embeddings are topped up just-in-time + nightly; see cron-embed-circle.)
//   • KEYWORD - literal token hits, to catch exact matches the vector may deprioritise.
// When no embeddings provider is configured the semantic half is simply empty and
// the search degrades to keyword + warmth - never broken.
//
// Then LLM-rank the grounded fits. Two degrees, both EVIDENCE-BACKED:
//   • first  - the person themselves fits the query.
//   • second - the person is a real, evidence-cited ROUTE to the target (a shared
//     employer/school in THEIR OWN history), tagged INFERRED. Never an invented
//     relationship: every claim must cite a real field or it is dropped.
// Provider-fallback LLM via _shared/llm.ts.

const MAX_CANDIDATES = 50;   // cap what we hand the ranker (token budget)
const MAX_FETCH = 120;       // cap what we pull for the keyword/warmth prefilter
const SEM_K = 40;            // semantic nearest-neighbours to retrieve
const MAX_RESULTS = 6;
const SECOND_DEGREE_CONF_CAP = 0.6; // never over-claim an inferred route

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

const RANK = `You match a fractional executive's REAL network to a "who can help with this" query. For each candidate you are given only facts we already hold (title, company, tags, note, enrichment summary, past employers, education, skills).

Return ONLY JSON: { "people": [ {
  "candidate_id": string,
  "degree": "first" | "second",
  "why": string,
  "matched_on": string,
  "confidence": number,
  "evidence": [ { "claim": string, "source": string } ]
} ] }

Two kinds of match, BOTH grounded in the candidate's own real facts:
- "first": the candidate THEMSELVES fit the query (they are, or have been, the thing sought).
- "second": the candidate is a warm ROUTE to the target because THEIR OWN history overlaps it - e.g. they worked at, or studied where, the target sits. This is an inference about a likely connection, never a stated relationship.

Rules:
- Pick from the candidates only; use their exact candidate_id.
- "why": one tight sentence, grounded, addressed to the user. For a "second" match, frame it as a likely route (e.g. "was a Principal at Accel 2018–21, so a warm way into that fund"). NEVER a message to send.
- "matched_on": the single specific real fact behind the match, short (e.g. "Partner at Accel", "past: Sequoia", "tag: fintech").
- "evidence": one or more { claim, source } citing the EXACT facts used. "source" must be one of: "title", "company", "tags", "note", "summary", "experience", "education", "skills". Every claim must be supported by the candidate's given data.
- "confidence": 0..1. Be conservative. A "second" match is inherently uncertain - keep it modest.
- Do NOT invent employers, roles, relationships, or "they probably know someone" guesses with no cited fact. If a match has no real evidence, drop it.
- Prefer "first" matches. Include a "second" only when the overlap is concrete and cited.
- Only include grounded matches. Return an empty array if nothing genuinely fits. At most ${MAX_RESULTS} people, best first.`;

interface Row {
  id: string;
  display_name: string;
  title: string | null;
  company: string | null;
  tags: string[] | null;
  note: string | null;
  dossier: Record<string, unknown> | null;
  warmth?: number | null;
}

const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);
const listFrom = (arr: unknown, keys: string[], n: number): string[] =>
  (Array.isArray(arr) ? arr : [])
    .map((e) => (e && typeof e === 'object' ? keys.map((k) => (e as Record<string, unknown>)[k]).filter(Boolean).join(' @ ') : ''))
    .filter(Boolean)
    .slice(0, n);

// Compact, token-cheap view of a candidate for both the keyword prefilter and the
// ranker. Works on circle_person rows and on match_circle_persons() RPC rows alike.
function compact(r: Row) {
  const d = r.dossier ?? {};
  const summary = typeof d.summary === 'string' ? d.summary : (typeof d.llm_summary === 'string' ? d.llm_summary : '');
  const past = listFrom(d.experience, ['title', 'company'], 6).join('; ');
  const edu = listFrom(d.education, ['degree', 'school'], 4).join('; ');
  const skills = Array.isArray(d.skills) ? d.skills.filter((s) => typeof s === 'string').slice(0, 12) : [];
  return {
    candidate_id: r.id,
    name: r.display_name,
    title: r.title,
    company: r.company,
    tags: (r.tags ?? []).slice(0, 8),
    note: r.note ? trunc(r.note, 200) : null,
    summary: summary ? trunc(summary, 240) : null,
    past: past || null,
    education: edu || null,
    skills: skills.length ? skills : null,
  };
}
type Compact = ReturnType<typeof compact>;

const textOf = (c: Compact) =>
  [c.name, c.title, c.company, (c.tags ?? []).join(' '), c.note, c.summary, c.past, c.education, (c.skills ?? []).join(' ')]
    .filter(Boolean).join(' ').toLowerCase();

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
      if (JSON.parse(content)?.intent === 'working_on') intent = 'working_on';
    } catch {
      // Fail toward find_people - the honest, non-destructive path.
    }
    if (intent === 'working_on') {
      return new Response(JSON.stringify({ intent }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Keep the relevant slice embedded (best-effort, bounded, no-op w/o a key) ─
    try { await backfillEmbeddings(supabase, { userId, limit: 40, window: 160 }); } catch { /* keyword fallback */ }

    // ── Keyword / warmth prefilter (also the graceful fallback) ──────────────
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
    const tokens = query.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2 && !STOPWORDS.has(t));
    const scored = all.map((c) => {
      const hay = textOf(c);
      return { c, score: tokens.reduce((n, t) => (hay.includes(t) ? n + 1 : n), 0) };
    });
    const keywordHits = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).map((s) => s.c);
    const warmthFill = scored.filter((s) => s.score === 0).map((s) => s.c); // already warmth-ordered

    // ── Semantic nearest-neighbours (recall beyond warmth / exact words) ─────
    let semantic: Compact[] = [];
    const queryVecs = await embed([query]);
    if (queryVecs) {
      const { data: sem } = await supabase.rpc('match_circle_persons', {
        query_embedding: vecToStr(queryVecs[0]),
        match_count: SEM_K,
      });
      semantic = ((sem ?? []) as Row[]).map(compact);
    }

    // Union, semantic-first (best recall), then literal hits, then warmth fill.
    const seen = new Set<string>();
    const candidates: Compact[] = [];
    for (const c of [...semantic, ...keywordHits, ...warmthFill]) {
      if (seen.has(c.candidate_id)) continue;
      seen.add(c.candidate_id);
      candidates.push(c);
      if (candidates.length >= MAX_CANDIDATES) break;
    }

    // ── Rank grounded first- and (evidence-backed) second-degree fits ────────
    let ranked: Array<{ candidate_id: string; degree?: string; why: string; matched_on?: string; confidence?: number; evidence?: Array<{ claim: string; source: string }> }> = [];
    try {
      const { content } = await chatJSON({
        system: RANK,
        user: JSON.stringify({ query, candidates }),
        temperature: 0.2,
        maxTokens: 1100,
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
      .map((r) => {
        const degree: 'first' | 'second' = r.degree === 'second' ? 'second' : 'first';
        const evidence = Array.isArray(r.evidence)
          ? r.evidence.filter((e) => e && typeof e.claim === 'string' && e.claim.trim()).map((e) => ({ claim: e.claim.trim(), source: typeof e.source === 'string' ? e.source : 'note' }))
          : [];
        return { r, degree, evidence };
      })
      // A second-degree (inferred) match with no cited evidence is exactly the
      // hallucination we refuse to surface - drop it.
      .filter(({ degree, evidence }) => degree === 'first' || evidence.length > 0)
      .slice(0, MAX_RESULTS)
      .map(({ r, degree, evidence }) => {
        const c = byId.get(r.candidate_id)!;
        let confidence = typeof r.confidence === 'number' ? Math.max(0, Math.min(1, r.confidence)) : null;
        if (degree === 'second' && confidence != null) confidence = Math.min(confidence, SECOND_DEGREE_CONF_CAP);
        return {
          id: c.candidate_id,
          name: c.name,
          title: c.title,
          company: c.company,
          why: r.why.trim(),
          degree,
          matched_on: typeof r.matched_on === 'string' && r.matched_on.trim() ? r.matched_on.trim() : null,
          confidence,
          evidence,
        };
      });

    return new Response(JSON.stringify({ intent, people }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

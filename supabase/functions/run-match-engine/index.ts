import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit } from '../_shared/compliance.ts';

// Match Engine v1. Pulls a user's active Ideas + Circle, pre-filters
// candidates with cheap heuristics, then asks an LLM to pick the top 3 and
// draft a Move. Writes matches + moves. RLS handles scoping.

interface Idea {
  id: string;
  title: string;
  one_liner: string | null;
  offer: string | null;
  price_band: string | null;
  icp: string | null;
}

interface Person {
  id: string;
  display_name: string;
  company: string | null;
  title: string | null;
  primary_email: string | null;
  linkedin_url: string | null;
  last_interaction_at: string | null;
}

interface LlmMatch {
  candidate_id: string;
  rationale: string;
  warm_path?: { via?: string; context?: string } | null;
  score: number;
  draft?: { channel?: string; subject?: string | null; body: string } | null;
}

const MAX_IDEAS_PER_RUN = 3;
const PREFILTER_TOP_N = 15;
const MATCHES_PER_IDEA = 3;

const tokens = (s: string | null | undefined): string[] =>
  (s ?? '').toLowerCase().match(/[a-z0-9]+/g) ?? [];

// Cheap pre-filter: score each person against an Idea's ICP tokens and
// available contact surface, keep the top N.
const prefilter = (idea: Idea, people: Person[]): Person[] => {
  const icpTokens = new Set([
    ...tokens(idea.icp),
    ...tokens(idea.offer),
    ...tokens(idea.one_liner),
  ]);
  if (!icpTokens.size) {
    // No signal in Idea text -> take the most recently updated people.
    return [...people]
      .sort((a, b) => (b.last_interaction_at ?? '').localeCompare(a.last_interaction_at ?? ''))
      .slice(0, PREFILTER_TOP_N);
  }

  const scored = people.map((p) => {
    const titleToks = tokens(p.title);
    const companyToks = tokens(p.company);
    let score = 0;
    for (const t of titleToks) if (icpTokens.has(t)) score += 2;
    for (const t of companyToks) if (icpTokens.has(t)) score += 1;
    if (p.primary_email) score += 0.3;
    if (p.linkedin_url) score += 0.3;
    return { p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const winners = scored.filter((s) => s.score > 0).slice(0, PREFILTER_TOP_N).map((s) => s.p);

  if (winners.length >= MATCHES_PER_IDEA) return winners;
  // Backfill with recency so the LLM always has enough to pick from.
  const seen = new Set(winners.map((w) => w.id));
  const backfill = [...people]
    .filter((p) => !seen.has(p.id))
    .sort((a, b) => (b.last_interaction_at ?? '').localeCompare(a.last_interaction_at ?? ''))
    .slice(0, PREFILTER_TOP_N - winners.length);
  return [...winners, ...backfill];
};

const buildPrompt = (idea: Idea, candidates: Person[]): { system: string; user: string } => {
  const system = `You are a matchmaker for a fractional executive. Given one of their Ideas and a short list of people in their personal network, pick the top ${MATCHES_PER_IDEA} who are most likely to actually pay for this Idea.

Return JSON: { "matches": [ { "candidate_id": string, "rationale": string, "warm_path": { "via": string | null, "context": string | null }, "score": number between 0 and 1, "draft": { "channel": "linkedin_dm" | "email", "subject": string | null, "body": string } } ] }

Rules:
- Pick from candidates only — use their exact candidate_id string.
- "rationale" is one tight sentence: why this person, why now.
- "warm_path" is how the user plausibly knows them (prior company, shared title, etc.). If the raw data doesn't support a warm path, return both fields as null.
- "draft" is a short (under 450 chars) DM the user could plausibly send. Use their first name, reference the warm path, and ask ONE clear thing. No "I hope this finds you well" schlock.
- "channel" defaults to linkedin_dm if a linkedin_url exists, else email if primary_email exists, else linkedin_dm.
- Be conservative. If no one is a credible fit, return an empty array.`;

  const user = JSON.stringify({
    idea: {
      title: idea.title,
      one_liner: idea.one_liner,
      offer: idea.offer,
      price_band: idea.price_band,
      icp: idea.icp,
    },
    candidates: candidates.map((p) => ({
      candidate_id: p.id,
      name: p.display_name,
      company: p.company,
      title: p.title,
      has_email: !!p.primary_email,
      has_linkedin: !!p.linkedin_url,
    })),
  });
  return { system, user };
};

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { userId, supabase } = await requireAuth(req);
    checkRateLimit(`run-match-engine:${userId}`, 6, 60_000);

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(JSON.stringify({ error: 'Service unavailable' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const ideaIds: string[] | undefined = Array.isArray(body?.idea_ids) ? body.idea_ids : undefined;

    let ideaQuery = supabase
      .from('ideas')
      .select('id, title, one_liner, offer, price_band, icp')
      .eq('user_id', userId)
      .in('status', ['voiced', 'proposed', 'active'])
      .order('created_at', { ascending: false })
      .limit(MAX_IDEAS_PER_RUN);
    if (ideaIds?.length) ideaQuery = ideaQuery.in('id', ideaIds);

    const { data: ideas, error: ideasErr } = await ideaQuery;
    if (ideasErr) throw ideasErr;
    if (!ideas?.length) {
      return new Response(JSON.stringify({ matches_created: 0, ideas_considered: 0, note: 'No active Ideas to match.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: circle, error: circleErr } = await supabase
      .from('circle_person')
      .select('id, display_name, company, title, primary_email, linkedin_url, last_interaction_at')
      .eq('user_id', userId)
      .order('last_interaction_at', { ascending: false })
      .limit(500);
    if (circleErr) throw circleErr;
    if (!circle?.length) {
      return new Response(JSON.stringify({ matches_created: 0, ideas_considered: ideas.length, note: 'Circle is empty — add a source first.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let totalCreated = 0;
    const errors: string[] = [];

    for (const idea of ideas as Idea[]) {
      const candidates = prefilter(idea, circle as Person[]);
      if (!candidates.length) continue;
      const { system, user } = buildPrompt(idea, candidates);

      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
          store: false,
        }),
      });
      if (!resp.ok) {
        errors.push(`idea ${idea.id}: OpenAI ${resp.status}`);
        continue;
      }
      const result = await resp.json();
      let parsed: { matches?: LlmMatch[] };
      try {
        parsed = JSON.parse(result.choices[0].message.content);
      } catch {
        errors.push(`idea ${idea.id}: malformed JSON`);
        continue;
      }

      const candidateById = new Map(candidates.map((c) => [c.id, c]));
      const valid = (parsed.matches ?? [])
        .filter((m) => candidateById.has(m.candidate_id))
        .slice(0, MATCHES_PER_IDEA);
      if (!valid.length) continue;

      const matchRows = valid.map((m) => ({
        user_id: userId,
        idea_id: idea.id,
        circle_person_id: m.candidate_id,
        warm_path: m.warm_path ?? null,
        rationale: m.rationale,
        score: Math.max(0, Math.min(1, Number(m.score) || 0)),
        state: 'new' as const,
      }));
      const { data: inserted, error: insertErr } = await supabase
        .from('matches')
        .insert(matchRows)
        .select('id, circle_person_id');
      if (insertErr) {
        errors.push(`idea ${idea.id}: insert matches ${insertErr.message}`);
        continue;
      }
      totalCreated += inserted?.length ?? 0;

      const moveRows = (inserted ?? []).map((row) => {
        const m = valid.find((v) => v.candidate_id === row.circle_person_id)!;
        const candidate = candidateById.get(row.circle_person_id)!;
        const channel = m.draft?.channel === 'email'
          ? (candidate.primary_email ? 'email' : 'linkedin_dm')
          : (candidate.linkedin_url ? 'linkedin_dm' : (candidate.primary_email ? 'email' : 'linkedin_dm'));
        return {
          user_id: userId,
          match_id: row.id,
          channel,
          state: 'draft' as const,
          draft_subject: m.draft?.subject ?? null,
          draft_body: m.draft?.body ?? '',
        };
      });
      if (moveRows.length) {
        const { error: moveErr } = await supabase.from('moves').insert(moveRows);
        if (moveErr) errors.push(`idea ${idea.id}: insert moves ${moveErr.message}`);
      }
    }

    return new Response(JSON.stringify({
      matches_created: totalCreated,
      ideas_considered: ideas.length,
      errors,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

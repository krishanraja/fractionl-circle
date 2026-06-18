import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit } from '../_shared/compliance.ts';
import { chatJSON } from '../_shared/llm.ts';
import { recencyDays } from '../_shared/grounding.ts';

// rank-inner-circle: given the user's current direction (the_read) and their real
// network, return the few people who matter most for THIS fork, each with a role +
// one-line why. STATELESS about behaviour: re-reads circle_person + signals fresh
// every call, reads NO prior matches/decisions, persists no "did you contact" state.
// Caches the result on the_read (inner_circle + inner_circle_fork) so the Path paints
// from cache and only re-ranks when the direction changes. Gemini via the fallback.

const ROLES = ['PROOF', 'UNLOCK', 'MULTIPLIER', 'RISK', 'MIRROR'];

const SYSTEM = `You are a chief of staff ranking a fractional executive's real network for their CURRENT direction. Pick the 3 to 5 people who matter MOST for where they are headed, and give each a ROLE and a one-line WHY grounded in their title/company.

Roles:
- "PROOF": living proof the path works (already did or bought the thing the user is moving toward). The imposter-syndrome killer, not a prospect.
- "UNLOCK": opens a door to the buyer, or sits inside the niche the user is targeting.
- "MULTIPLIER": cross-referral / complementary function (a CFO refers a CMO) / a pod partner.
- "RISK": a concentration or stagnation risk (e.g. an anchor client who is too much of the revenue).
- "MIRROR": a peer one step ahead on the user's exact path.

Return ONLY JSON: { "people": [ { "candidate_id": string, "role": "PROOF"|"UNLOCK"|"MULTIPLIER"|"RISK"|"MIRROR", "why": string } ] }

Rules:
- Pick from the candidates only; use their exact candidate_id.
- The WHY is one tight sentence grounded in their title/company and the user's direction. It is ABOUT the person, addressed to the user. NEVER a message to send.
- Only include a person if you can ground the role in real data. If the network is thin or nothing fits, return fewer people, or an empty array. Do not invent.`;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { userId, supabase } = await requireAuth(req);
    checkRateLimit(`rank-inner-circle:${userId}`, 10, 60_000);

    const { data: read } = await supabase.from('the_read').select('*').eq('user_id', userId).maybeSingle();
    if (!read) return new Response(JSON.stringify({ people: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Re-read the network fresh (stateless). Prefilter by warmth/recency to a small set.
    const { data: people } = await supabase
      .from('circle_person')
      .select('id, display_name, company, title, warmth, last_interaction_at')
      .eq('user_id', userId)
      .order('warmth', { ascending: false, nullsFirst: false })
      .limit(40);
    const candidates = (people ?? []) as Array<{ id: string; display_name: string; company: string | null; title: string | null; warmth: number | null; last_interaction_at: string | null }>;
    if (!candidates.length) {
      await supabase.from('the_read').update({ inner_circle: [], inner_circle_fork: read.lit_fork_domain }).eq('user_id', userId);
      return new Response(JSON.stringify({ people: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const user = JSON.stringify({
      direction: { segment: read.segment, lit_fork: read.lit_fork_domain, niche: read.niche, function: read.function, offer: read.offer_one_liner },
      candidates: candidates.map((p) => ({ candidate_id: p.id, name: p.display_name, title: p.title, company: p.company, warmth: p.warmth, recency_days: recencyDays(p.last_interaction_at) })),
    });

    let ranked: Array<{ candidate_id: string; role: string; why: string }> = [];
    try {
      const { content } = await chatJSON({ system: SYSTEM, user, temperature: 0.3 });
      const parsed = JSON.parse(content);
      ranked = Array.isArray(parsed?.people) ? parsed.people : [];
    } catch (e) {
      return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'rank failed' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const byId = new Map(candidates.map((c) => [c.id, c]));
    const out = ranked
      .filter((r) => byId.has(r.candidate_id) && ROLES.includes(r.role) && typeof r.why === 'string' && r.why.trim())
      .slice(0, 5)
      .map((r) => {
        const c = byId.get(r.candidate_id)!;
        return { id: c.id, name: c.display_name, title: c.title, company: c.company, role: r.role, why: r.why.trim() };
      });

    await supabase.from('the_read').update({ inner_circle: out, inner_circle_fork: read.lit_fork_domain }).eq('user_id', userId);
    return new Response(JSON.stringify({ people: out }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

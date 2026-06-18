import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit } from '../_shared/compliance.ts';
import { chatJSON } from '../_shared/llm.ts';

// decision-engine: the reasoning inside the Decision Room. The deterministic branches
// (fit / benchmark / obstacle) are computed client-side from the corpus seed; this adds
// the connective tissue they lack: a personalised read-back of THIS exec's situation, the
// consequence of deciding (what changes downstream), the honest trade-off, and the one
// question that sharpens the call. Grounded in the_read + the comparable cohort + the
// landmine for this fork. Returns reasoning only; writes nothing. Gemini via the fallback.

const SYSTEM = `You are a sharp, calm chief of staff helping a fractional executive commit a single decision. You are given their Read, the fork they are deciding, the comparable-cohort outcome, and the landmine ahead.

Return ONLY JSON:
{ "headline": string, "consequence": string, "watch_out": string, "question": string }

- "headline": one sentence naming the real choice underneath this fork, in their specific situation. Not generic. No filler.
- "consequence": what committing the recommended direction actually changes downstream (the next decision it unlocks, the landmine it defuses). Concrete, grounded in the cohort/landmine you were given.
- "watch_out": the honest cost or the thing peers got wrong here. One sentence. Never hype.
- "question": the single question that, once they answer it, makes the decision obvious. Specific to their work.

Rules: ground every claim in the data provided; if the cohort has no real sample, speak from the benchmark, never invent a statistic. Plain, declarative, no em dashes, no exclamation marks. Each field is one tight sentence.`;

const FORK_LABEL: Record<string, string> = {
  offer_pricing: 'Offer and pricing', icp_positioning: 'Niche and positioning',
  network_strategy: 'Network strategy', scaling_leverage: 'Scaling and leverage',
};

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { userId, supabase } = await requireAuth(req);
    checkRateLimit(`decision-engine:${userId}`, 12, 60_000);

    const { data: read } = await supabase.from('the_read').select('*').eq('user_id', userId).maybeSingle();
    if (!read) return new Response(JSON.stringify({ error: 'no read' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const fork: string = body?.fork_domain || read.lit_fork_domain || 'icp_positioning';

    const [{ data: cohort }, { data: landmines }] = await Promise.all([
      supabase.from('comparable_cohort').select('what_they_chose, what_happened, n_count, niche, stage_band').eq('fork_domain', fork),
      supabase.from('landmines').select('name, survivor_pattern, description').eq('fork_domain', fork),
    ]);

    const user = JSON.stringify({
      read: { segment: read.segment, function: read.function, niche: read.niche, stage: read.stage, client_count: read.client_count, offer: read.offer_one_liner },
      fork: FORK_LABEL[fork] ?? fork,
      cohort: (cohort ?? []).map((c: Record<string, unknown>) => ({ chose: c.what_they_chose, outcome: c.what_happened, sample: c.n_count, niche: c.niche })),
      landmine: (landmines ?? [])[0] ?? null,
    });

    let parsed: { headline?: string; consequence?: string; watch_out?: string; question?: string };
    try {
      const { content } = await chatJSON({ system: SYSTEM, user, temperature: 0.3 });
      parsed = JSON.parse(content);
    } catch (e) {
      return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'reasoning failed' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const cohortHasN = (cohort ?? []).some((c: Record<string, unknown>) => (c.n_count as number) > 0);
    const brief = {
      headline: typeof parsed.headline === 'string' ? parsed.headline : null,
      consequence: typeof parsed.consequence === 'string' ? parsed.consequence : null,
      watch_out: typeof parsed.watch_out === 'string' ? parsed.watch_out : null,
      question: typeof parsed.question === 'string' ? parsed.question : null,
      grounded: cohortHasN, // false => the room shows "from the benchmark, not yet a cohort"
    };
    return new Response(JSON.stringify({ brief }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit } from '../_shared/compliance.ts';
import { chatJSON } from '../_shared/llm.ts';
import { loadProfileContext, profilePromptBlock, profileFactsLine } from '../_shared/profileContext.ts';
import { loadUserAiPreferences, personalitySystemSuffix, assistantPersona } from '../_shared/aiPersonality.ts';
import { getUserTier } from '../_shared/tiers.ts';

// strengthen-plan: the voiced strengtheners on the "Make it stronger" surface. Two modes,
// both about the PLAN (never the circle):
//   - concern:   the user voices a worry/risk/what-if. We RESEARCH it live (Perplexity,
//                sourced), then say plainly what it means for the plan and what to do.
//   - evolution: the user voices a new idea/angle/offer tweak. We fold it into what makes
//                them different and say how it strengthens the plan (no external research).
// The result maps to one of the read's dimensions so the client can bank it into
// thesis_answers, where the next read folds it in - same compounding loop as the coach.

// The read's canonical dimensions, so a banked strengthener lands on the right one.
const DIMENSIONS = ['Demand', 'Burning need', 'Crowding', 'What makes you different', 'Fit to you', 'Warm reach', 'Credibility'];

async function researchConcern(concern: string, thesis: string, identity: string): Promise<{ text: string; citations: string[] }> {
  const key = Deno.env.get('PERPLEXITY_API_KEY');
  if (!key) throw new Error('PERPLEXITY_API_KEY not set');
  const prompt = `A fractional executive has a specific CONCERN about their business plan. Research it with current, real sources and inline source numbers.
THEIR PLAN: ${thesis}
${identity ? `WHO THEY ARE: ${identity}` : ''}
THEIR CONCERN (in their words): ${concern}
Do this:
1. Take the concern seriously and check what the evidence actually says about it for THIS specific niche - is it real, overblown, or worse than they think?
2. Cite what operators who faced this same concern did about it (community discussion, practitioner writing).
3. End with the single most useful thing this means for their plan.
Be specific and honest. If the concern is a genuine risk, say so plainly.`;
  const body = { model: 'sonar', messages: [{ role: 'user', content: prompt }], max_tokens: 700 };
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`perplexity ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  const text: string = j.choices?.[0]?.message?.content ?? '';
  const citations: string[] = (j.citations ?? (j.search_results ?? []).map((s: { url?: string }) => s.url)).filter(Boolean);
  return { text, citations };
}

const CONCERN_SYSTEM = `${assistantPersona()} You turn live research on the user's CONCERN about their plan into an honest, grounded answer they can act on.
Return ONLY JSON: { "dimension": string, "topic": string, "finding": string, "impact": string }
- "dimension": which part of their plan this concern bears on most. MUST be exactly one of: ${DIMENSIONS.join(', ')}.
- "topic": 2 to 4 words naming the concern.
- "finding": 2 to 4 plain sentences: what the research actually says about the concern - validate it, right-size it, or debunk it, grounded in the sources. Never hand-wave. If it is a real risk, say so.
- "impact": one plain sentence: the concrete thing to change or decide in the plan because of this. Actionable, specific.
- Plain, humanized language. No em dashes. No exclamation marks. No invented precise numbers - use bands.`;

const EVOLUTION_SYSTEM = `${assistantPersona()} You help the user evolve their plan. They have voiced a new idea, angle, or offer tweak. Fold it into what makes them different and say how it strengthens the plan.
Return ONLY JSON: { "dimension": string, "topic": string, "finding": string, "impact": string }
- "dimension": which part of the plan this idea sharpens most. MUST be exactly one of: ${DIMENSIONS.join(', ')}. For a positioning/offer/edge idea, use "What makes you different".
- "topic": 2 to 4 words naming the idea.
- "finding": 2 to 4 plain sentences: take the idea seriously, sharpen it, and state the stronger, more specific version of their plan it produces. Be honest if the idea would weaken focus rather than help.
- "impact": one plain sentence: the concrete change this makes to the plan.
- Plain, humanized language. No em dashes. No exclamation marks. No invented precise numbers - use bands.`;

function coerce(parsed: Record<string, unknown>, mode: string, sources: string[]) {
  const rawDim = typeof parsed.dimension === 'string' ? parsed.dimension : '';
  const dimension = DIMENSIONS.find((d) => d.toLowerCase() === rawDim.toLowerCase())
    ?? (mode === 'evolution' ? 'What makes you different' : 'Demand');
  return {
    mode,
    dimension,
    topic: typeof parsed.topic === 'string' ? parsed.topic.slice(0, 80) : (mode === 'concern' ? 'Your concern' : 'Your idea'),
    finding: typeof parsed.finding === 'string' ? parsed.finding.slice(0, 900) : '',
    impact: typeof parsed.impact === 'string' ? parsed.impact.slice(0, 400) : '',
    sources: sources.slice(0, 5),
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { userId, supabase } = await requireAuth(req);
    checkRateLimit(`strengthen-plan:${userId}`, 8, 60_000);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const mode: string = body?.mode === 'evolution' ? 'evolution' : body?.mode === 'concern' ? 'concern' : '';
    const input: string = typeof body?.input === 'string' ? body.input.slice(0, 1200) : '';
    const thesis: string = typeof body?.thesis === 'string' ? body.thesis.slice(0, 1000) : '';
    if (!mode) {
      return new Response(JSON.stringify({ error: 'mode must be "concern" or "evolution".' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!input.trim()) {
      return new Response(JSON.stringify({ error: mode === 'concern' ? 'Tell me the concern.' : 'Tell me the idea.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Strengthening is a Pro deepening tool (client gates it too). Enforce server-side
    // so a free JWT cannot spend paid research: free users get the upgrade path.
    const tier = await getUserTier(supabase, userId);
    if (tier === 'free') {
      return new Response(
        JSON.stringify({ error: 'Strengthening your plan is part of Pro. Upgrade for unlimited strengthening as your plan evolves.', code: 'upgrade_required' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const profile = await loadProfileContext(supabase, userId);
    const prefs = await loadUserAiPreferences(supabase, userId);

    // Ground on the latest read + thesis when the client did not pass one.
    const { data: run } = await supabase.from('thesis_runs').select('thesis, result').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    const planThesis = thesis || (typeof run?.thesis === 'string' ? run.thesis : '');
    const priorRead = run?.result && typeof run.result === 'object' ? JSON.stringify((run.result as { read?: string; opportunity?: unknown; ability?: unknown }).read ?? '') : '';

    let sources: string[] = [];
    let system: string;
    let userBlock: string;

    if (mode === 'concern') {
      const research = await researchConcern(input, planThesis, profileFactsLine(profile));
      sources = research.citations;
      system = CONCERN_SYSTEM + profilePromptBlock(profile) + personalitySystemSuffix(prefs?.ai_personality);
      userBlock = [
        `THEIR PLAN: ${planThesis || '(not provided)'}`,
        priorRead ? `THE CURRENT READ: ${priorRead}` : '',
        `THEIR CONCERN: ${input}`,
        `SOURCED RESEARCH:\n${research.text}`,
      ].filter(Boolean).join('\n\n');
    } else {
      system = EVOLUTION_SYSTEM + profilePromptBlock(profile) + personalitySystemSuffix(prefs?.ai_personality);
      userBlock = [
        `THEIR PLAN: ${planThesis || '(not provided)'}`,
        priorRead ? `THE CURRENT READ: ${priorRead}` : '',
        `THEIR NEW IDEA / EVOLUTION: ${input}`,
      ].filter(Boolean).join('\n\n');
    }

    let parsed: Record<string, unknown>;
    try {
      const { content } = await chatJSON({ system, user: userBlock, temperature: 0.3, maxTokens: 600 });
      parsed = JSON.parse(content);
    } catch (e) {
      return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Could not work that through.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify(coerce(parsed, mode, sources)),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit } from '../_shared/compliance.ts';
import { chatJSON } from '../_shared/llm.ts';
import { loadProfileContext, profilePromptBlock } from '../_shared/profileContext.ts';
import { loadUserAiPreferences, personalitySystemSuffix } from '../_shared/aiPersonality.ts';

// next-question: the proactive Socratic coach. Given the user's latest read, it
// finds the weakest graded dimension (or the biggest missing input) and asks the
// ONE highest-leverage question to sharpen it — framed as a DECISION (a few crisp
// options to choose), because the user should decide, not write an essay. The
// answer (saved client-side to thesis_answers) folds into the next read, raising
// the strength score toward 100. Resilient: a deterministic templated question per
// dimension if the LLM is unavailable, so the coach never dead-ends.

const BAND_W: Record<string, number> = { weak: 0.3, mixed: 0.62, strong: 1.0, risk: 0.42 };
const CONF_CAP: Record<string, number> = { high: 1.0, medium: 0.82, low: 0.6 };

interface Row { label: string; band: string; evidence?: string; confidence: string }

function weakestDimension(opp: Row[], ability: Row[]): { row: Row; side: string } | null {
  const all = [...opp.map((r) => ({ row: r, side: 'opportunity' })), ...ability.map((r) => ({ row: r, side: 'ability' }))];
  if (!all.length) return null;
  const scored = all.map((x) => ({ ...x, pct: (BAND_W[x.row.band] ?? 0.4) * (CONF_CAP[x.row.confidence] ?? 0.7) }));
  scored.sort((a, b) => a.pct - b.pct);
  return scored[0];
}

// Deterministic fallback questions per dimension — sharp, decision-shaped.
const FALLBACK: Record<string, { topic: string; question: string; options: string[] }> = {
  'Demand': { topic: 'Demand', question: 'Who, specifically, has this problem badly enough to pay this month?', options: ['Seed founders with no senior hire yet', 'Series A teams scaling too fast', 'PE-backed ops under margin pressure'] },
  'Burning need': { topic: 'The pain', question: 'What breaks for them if they do nothing for 90 days?', options: ['They miss their next raise', 'They burn cash on the wrong hires', 'They stall and a competitor passes them'] },
  'Crowding': { topic: 'Your wedge', question: 'In one line, what do you do that the crowded field does not?', options: ['I go deeper in one niche', 'I ship faster / hands-on', 'I bring a network they cannot'] },
  'Your edge': { topic: 'Your edge', question: 'What is the unfair advantage only you bring to this?', options: ['A track record in this exact niche', 'A warm network of buyers', 'A method I have proven before'] },
  'Fit to you': { topic: 'Your fit', question: 'What in your background makes you the obvious choice here?', options: ['Years doing exactly this in-house', 'A flagship result I can name', 'Deep relationships in the space'] },
  'Warm reach': { topic: 'Warm reach', question: 'Who in your network is closest to a buyer for this?', options: ['A former colleague now a founder', 'An investor who sees deal flow', 'A peer who refers work'] },
  'Credibility': { topic: 'Proof', question: 'What proof would make a skeptical buyer believe you fast?', options: ['A named case study', 'A strong referral', 'A sharp point of view published'] },
};

const SYSTEM = `You are a sharp, warm strategy coach for a fractional executive. Your job: ask the ONE question that most sharpens their business thesis right now, targeting the weakest part of their validated read. The user often does not know what to do next, so do NOT ask an open essay prompt — ask a focused question and offer 2 to 4 crisp, specific, MUTUALLY DISTINCT options they can pick to make a decision (they can also type their own). The question must develop their thinking in a way they would not have alone: concrete, grounded in their thesis and the weak dimension, never generic.

Return ONLY JSON: { "topic": string, "dimension": string, "question": string, "why": string, "options": [string, string, string] }
- "dimension": echo the weak dimension you are sharpening.
- "question": one tight sentence. Plain language, no jargon, no em dashes.
- "why": one short sentence on why answering this raises their score.
- "options": 2 to 4 short, concrete, decision-shaped choices specific to THEIR thesis (not abstract). No "other" option.`;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { userId, supabase } = await requireAuth(req);
    checkRateLimit(`next-question:${userId}`, 12, 60_000);

    // Optional focus: a journey move's title/why. When present, the question should
    // target THAT move, not just the globally-weakest dimension. Backward compatible.
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const focus = typeof body?.focus === 'string' && body.focus.trim() ? body.focus.trim().slice(0, 300) : null;

    const { data: run } = await supabase
      .from('thesis_runs')
      .select('id, thesis, background, result')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const result = (run?.result ?? {}) as { opportunity?: Row[]; ability?: Row[] };
    const opp = Array.isArray(result.opportunity) ? result.opportunity : [];
    const ability = Array.isArray(result.ability) ? result.ability : [];
    const weak = weakestDimension(opp, ability);
    const dimLabel = weak?.row.label ?? 'Your edge';

    // Recently answered, so we don't repeat a topic.
    const { data: prior } = await supabase
      .from('thesis_answers')
      .select('dimension, question')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    const asked = new Set((prior ?? []).map((p: { question: string }) => (p.question || '').toLowerCase()));

    const fb = FALLBACK[dimLabel] ?? FALLBACK['Your edge'];
    const buildFallback = () => ({
      run_id: run?.id ?? null,
      dimension: dimLabel,
      topic: fb.topic,
      question: fb.question,
      why: `Sharpening "${dimLabel}" is what moves your score most right now.`,
      options: fb.options,
      source: 'fallback' as const,
    });

    let out: Record<string, unknown> | null = null;
    try {
      const profile = await loadProfileContext(supabase, userId);
      const prefs = await loadUserAiPreferences(supabase, userId);
      const focusDirective = focus
        ? `\n\nThe user is working a SPECIFIC move on their path right now: "${focus}". Make the question directly advance THAT move (concrete next decision for it). Set "dimension" to a short name for the move.`
        : '';
      const system = SYSTEM + focusDirective + profilePromptBlock(profile) + personalitySystemSuffix(prefs?.ai_personality);
      const user = JSON.stringify({
        thesis: run?.thesis ?? '',
        background: run?.background ?? '',
        current_move: focus,
        weakest_dimension: weak ? { label: weak.row.label, side: weak.side, band: weak.row.band, confidence: weak.row.confidence, evidence: weak.row.evidence ?? '' } : null,
        already_asked: Array.from(asked).slice(0, 8),
      });
      const { content } = await chatJSON({ system, user, temperature: 0.5, maxTokens: 500 });
      const parsed = JSON.parse(content);
      if (parsed?.question && Array.isArray(parsed?.options) && parsed.options.length >= 2 && !asked.has(String(parsed.question).toLowerCase())) {
        out = {
          run_id: run?.id ?? null,
          dimension: typeof parsed.dimension === 'string' ? parsed.dimension : dimLabel,
          topic: typeof parsed.topic === 'string' ? parsed.topic : fb.topic,
          question: String(parsed.question).slice(0, 240),
          why: typeof parsed.why === 'string' ? parsed.why.slice(0, 200) : '',
          options: parsed.options.slice(0, 4).map((o: unknown) => String(o).slice(0, 80)),
          source: 'llm',
        };
      }
    } catch (_e) {
      // fall through to deterministic fallback
    }

    return new Response(JSON.stringify(out ?? buildFallback()), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

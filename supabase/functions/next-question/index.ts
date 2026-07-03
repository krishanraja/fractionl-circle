import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit } from '../_shared/compliance.ts';
import { chatJSON } from '../_shared/llm.ts';
import { loadProfileContext, profilePromptBlock } from '../_shared/profileContext.ts';
import { loadUserAiPreferences, personalitySystemSuffix } from '../_shared/aiPersonality.ts';
import { decisionLine, type DecisionRow } from '../_shared/decisionContext.ts';
import { FALLBACK, REDTEAM_FALLBACK } from '../_shared/coachQuestions.ts';

// next-question: the proactive Socratic coach. Given the user's latest read, it
// finds the weakest graded dimension (or the biggest missing input) and asks the
// ONE highest-leverage question to sharpen it - framed as a DECISION (a few crisp
// options to choose), because the user should decide, not write an essay. The
// answer (saved client-side to thesis_answers) folds into the next read, raising
// the strength score toward 100. Resilient: a deterministic templated question per
// dimension if the LLM is unavailable, so the coach never dead-ends.
//
// Memory-aware: settled decisions are never re-opened, skipped questions are never
// re-asked. And when every dimension is strong, the coach does not go quiet - it
// switches to the sparring partner and red-teams the strongest claim instead.

const BAND_W: Record<string, number> = { weak: 0.3, mixed: 0.62, strong: 1.0, risk: 0.42 };
const CONF_CAP: Record<string, number> = { high: 1.0, medium: 0.82, low: 0.6 };
// Above this, a dimension counts as strong (mirrors the client's sharpness model,
// where <70 marks a weakness worth coaching).
const STRONG_FLOOR = 0.7;

interface Row { label: string; band: string; evidence?: string; confidence: string }
interface Ranked { row: Row; side: string; pct: number }

function rankDimensions(opp: Row[], ability: Row[]): Ranked[] {
  const all = [...opp.map((r) => ({ row: r, side: 'opportunity' })), ...ability.map((r) => ({ row: r, side: 'ability' }))];
  const scored = all.map((x) => ({ ...x, pct: (BAND_W[x.row.band] ?? 0.4) * (CONF_CAP[x.row.confidence] ?? 0.7) }));
  scored.sort((a, b) => a.pct - b.pct);
  return scored;
}

// Deterministic fallback questions live in _shared/coachQuestions.ts (shared
// with the weekly chief-of-staff brief) so the coach and the brief ask with
// one voice.

const SYSTEM = `You are a sharp, warm strategy coach for a fractional executive. Your job: ask the ONE question that most sharpens their business thesis right now, targeting the weakest part of their validated read. The user often does not know what to do next, so do NOT ask an open essay prompt - ask a focused question and offer 2 to 4 crisp, specific, MUTUALLY DISTINCT options they can pick to make a decision (they can also type their own). The question must develop their thinking in a way they would not have alone: concrete, grounded in their thesis and the weak dimension, never generic.

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
    const ranked = rankDimensions(opp, ability);
    const weak = ranked[0] ?? null;
    const strongest = ranked.length ? ranked[ranked.length - 1] : null;
    // Strong across the board: switch from coach to sparring partner (red-team the
    // strongest claim) instead of going quiet at exactly the moment to attack the plan.
    const redteam = !focus && !!weak && weak.pct >= STRONG_FLOOR;
    const dimLabel = redteam ? (strongest?.row.label ?? 'Your edge') : (weak?.row.label ?? 'Your edge');

    // Recent history: never repeat a question verbatim, never re-ask one the user
    // declined (skipped), and treat settled (applied) decisions as fixed ground.
    const { data: prior } = await supabase
      .from('thesis_answers')
      .select('dimension, question, status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    const asked = new Set((prior ?? []).map((p: { question: string }) => (p.question || '').toLowerCase()));
    const declined = (prior ?? []).filter((p: { status?: string }) => p.status === 'skipped').map((p: { question: string }) => p.question || '').filter(Boolean);

    const { data: settledRows } = await supabase
      .from('thesis_answers')
      .select('dimension, question, answer, outcome')
      .eq('user_id', userId)
      .eq('status', 'answered')
      .not('applied_at', 'is', null)
      .order('created_at', { ascending: false })
      .limit(12);
    const settled = ((settledRows ?? []) as DecisionRow[]).map(decisionLine);

    const fb = redteam ? REDTEAM_FALLBACK : (FALLBACK[dimLabel] ?? FALLBACK['Your edge']);
    const buildFallback = () => ({
      run_id: run?.id ?? null,
      dimension: dimLabel,
      topic: fb.topic,
      question: fb.question,
      why: redteam
        ? 'Your read is strong; pressure-testing its strongest claim is what keeps it honest.'
        : `Sharpening "${dimLabel}" is what moves your score most right now.`,
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
      const redteamDirective = redteam
        ? `\n\nEvery dimension of their read is currently strong, so do NOT ask about a weakness. RED-TEAM instead: take the strongest claim (strongest_dimension below) and pose the single objection a hard-nosed sceptical buyer or the market would actually raise against it, as a decision-shaped question. The options are crisp, credible ways they could answer that objection. Set "topic" to "Red team" and "dimension" to the strongest dimension's label.`
        : '';
      const memoryDirective = `\n\nsettled_decisions are decisions they already made in earlier reads: fixed ground. Never re-open or re-ask them; ask what moves them FORWARD from those decisions. declined_questions are ones they chose not to engage with: do not re-ask them or close variants of them.`;
      const system = SYSTEM + focusDirective + redteamDirective + memoryDirective + profilePromptBlock(profile) + personalitySystemSuffix(prefs?.ai_personality);
      const user = JSON.stringify({
        thesis: run?.thesis ?? '',
        background: run?.background ?? '',
        current_move: focus,
        weakest_dimension: weak ? { label: weak.row.label, side: weak.side, band: weak.row.band, confidence: weak.row.confidence, evidence: weak.row.evidence ?? '' } : null,
        strongest_dimension: redteam && strongest ? { label: strongest.row.label, side: strongest.side, band: strongest.row.band, confidence: strongest.row.confidence, evidence: strongest.row.evidence ?? '' } : undefined,
        settled_decisions: settled.slice(0, 12),
        declined_questions: declined.slice(0, 8),
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

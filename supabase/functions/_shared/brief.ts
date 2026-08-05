// The weekly chief-of-staff brief: the $79 tier's Monday email, composed from
// brains that already exist - the user's latest read (thesis_runs), the decision
// log (thesis_answers), the strength score (_shared/sharpness.ts), the market
// facts (_shared/pulseFacts.ts), and the coach's deterministic questions
// (_shared/coachQuestions.ts). No new intelligence, no invented numbers: the
// brief only ever says what the product already knows. Selection + composition
// only; the caller (cron-warm-digest) renders and delivers.

// deno-lint-ignore-file no-explicit-any
import { computeSharpness, type ScoreRowT } from './sharpness.ts';
import { fetchPulseFacts, pulseFactLines } from './pulseFacts.ts';
import { questionForDimension, REDTEAM_FALLBACK, normalizeDimension, type CoachQuestion } from './coachQuestions.ts';

export interface ChiefOfStaffBrief {
  score: number;          // the same 0-100 the user sees on Home
  provisional: number;    // pending lift from banked-but-not-run decisions
  weakestLabel: string | null; // what is holding the score back (null = strong board)
  bankedCount: number;    // decisions waiting to fold into the next read
  decidedCount: number;   // decisions already locked into reads
  nextMove: string | null; // the current unlit move on the path
  question: CoachQuestion; // this week's one decision (deterministic, no LLM)
  redteam: boolean;        // true when the question is the sparring partner's
  marketLines: string[];   // honest Pulse numbers; empty when Pulse unreachable
}

interface RunRow {
  thesis: string | null;
  background: string | null;
  result: { opportunity?: ScoreRowT[]; ability?: ScoreRowT[]; steps?: Array<{ title?: string }> } | null;
  step_progress: unknown;
}

// Null when the user has no read yet - the brief has nothing honest to say and
// the caller falls back to the people-only digest.
export async function buildBriefForUser(
  userId: string,
  supabase: any,
): Promise<ChiefOfStaffBrief | null> {
  const { data: run } = await supabase
    .from('thesis_runs')
    .select('thesis, background, result, step_progress')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const r = run as RunRow | null;
  if (!r?.result) return null;

  const [{ count: circleCount }, { count: inspCount }, { count: bankedCount }, { count: decidedCount }] = await Promise.all([
    supabase.from('circle_person').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('thesis_inspiration').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('thesis_answers').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'answered').is('applied_at', null),
    supabase.from('thesis_answers').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'answered').not('applied_at', 'is', null),
  ]);

  // Same model as Home: linkedin only counts within a session, so a returning
  // user's score reads identically here and in the app.
  const sharp = computeSharpness(r.result, {
    hasBackground: !!(r.background && r.background.trim()),
    hasLinkedin: false,
    inspirationCount: inspCount ?? 0,
    circleCount: circleCount ?? 0,
  }, bankedCount ?? 0);

  const weakest = sharp.weakest[0] ?? null;
  const redteam = !weakest && sharp.byDimension.length > 0;
  const question = redteam ? REDTEAM_FALLBACK : questionForDimension(weakest?.label ?? null);

  const steps = Array.isArray(r.result?.steps) ? r.result!.steps! : [];
  const progress = Array.isArray(r.step_progress) ? (r.step_progress as number[]) : [];
  const nextIdx = steps.findIndex((_, i) => !progress.includes(i));
  const nextMove = nextIdx >= 0 ? (steps[nextIdx]?.title ?? null) : null;

  const marketLines = pulseFactLines(await fetchPulseFacts(r.thesis ?? ''));

  return {
    score: sharp.score,
    provisional: sharp.provisional,
    weakestLabel: weakest ? normalizeDimension(weakest.label) : null,
    bankedCount: bankedCount ?? 0,
    decidedCount: decidedCount ?? 0,
    nextMove,
    question,
    redteam,
    marketLines,
  };
}

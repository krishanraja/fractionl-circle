// The one orange action. Pure and unit-tested: given the journey state and the
// score, decide the single primary CTA the chief of staff hands the user - the
// Plan home pins exactly one, and the journey footer speaks the same words, so
// the action reads continuous across the two screens.
//
// Free tier never reaches these callers' surfaces un-gated: locked users land on
// the read (never home), and every destination routes through ThesisApp's go() /
// openSharpen(), which open the Pro gate. This module needs no tier input.
import type { StepT } from './thesisViews';
import type { JourneyState } from './JourneyMap';
import { PLAN } from './copy';

export type MovePrimary =
  | { kind: 'addpeople'; label: string }
  | { kind: 'reachout'; label: string }
  | { kind: 'sharpen'; label: string; focus: string };

// The journey's action-first branching (moved verbatim from the ThesisApp footer):
// the primary button DOES the current move, it does not just mark it complete.
export function movePrimary(js: JourneyState, steps: StepT[]): MovePrimary {
  if (js.warmBlocked) return { kind: 'addpeople', label: 'Add people to light up your warm reach' };
  const cur = steps[js.current];
  const t = (cur?.title || '').toLowerCase();
  const focus = cur ? `${cur.title}${cur.why ? '. ' + cur.why : ''}` : '';
  if (cur?.big || /network|warm|reach|intro|referr|consult|client|prospect|outreach/.test(t)) {
    return { kind: 'reachout', label: 'Reach out now' };
  }
  if (/value|position|offer|edge|differen|prop|pric|message|brand|narrativ|credib/.test(t)) {
    return { kind: 'sharpen', label: 'Make this move stronger', focus };
  }
  return { kind: 'sharpen', label: 'Work on this move', focus };
}

export type HomeAction =
  | { kind: 'sharpen'; label: string }
  | { kind: 'rerun'; label: string }
  | { kind: 'journey'; label: string };

// Below this, the weakest dimension is a genuine hole and strengthening leads.
// Deliberately NOT the coach's 70 threshold: in the 60-70 band the path move
// wins, so the app pushes the user to go sell rather than endlessly polish
// (the "architecture instead of output" trap).
export const ACTION_BIAS_FLOOR = 60;

export function pickHomeAction(a: {
  weakestPct: number | null; // sharp.weakest[0]?.pct ?? null
  unrunAnswers: number;
  provisional: number;
  js: JourneyState;
  steps: StepT[];
}): HomeAction {
  if (a.js.weak || (a.weakestPct !== null && a.weakestPct < ACTION_BIAS_FLOOR)) {
    return { kind: 'sharpen', label: PLAN.strengthen };
  }
  if (a.unrunAnswers > 0) {
    return { kind: 'rerun', label: `${PLAN.rerunAgain} (+${a.provisional})` };
  }
  if (a.js.allDone || a.steps.length === 0) {
    return { kind: 'journey', label: PLAN.openPath };
  }
  return { kind: 'journey', label: movePrimary(a.js, a.steps).label };
}

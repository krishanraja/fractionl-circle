// The one-orange-action selector is load-bearing UX: the Plan home pins exactly
// one CTA and the journey footer must speak the same words. Cover the precedence
// (genuinely-weak beats banked beats path), the ACTION_BIAS_FLOOR boundary (60-70
// band goes to the path, not to polishing), and every movePrimary branch.
import { describe, expect, it } from 'vitest';
import { ACTION_BIAS_FLOOR, movePrimary, pickHomeAction, homeRecommend } from './primaryAction';
import { PLAN } from './copy';
import type { JourneyState } from './JourneyMap';
import type { StepT } from './thesisViews';

const js = (o: Partial<JourneyState> = {}): JourneyState =>
  ({ weak: false, allDone: false, current: 0, warmBlocked: false, ...o });

const step = (title: string, o: Partial<StepT> = {}): StepT => ({ title, why: 'because', ...o });

describe('movePrimary', () => {
  it('warm-blocked wins everything', () => {
    const mp = movePrimary(js({ warmBlocked: true }), [step('Reach your network', { big: true })]);
    expect(mp).toEqual({ kind: 'addpeople', label: 'Add people to light up your warm reach' });
  });

  it('the big or reach-flavoured step is action-first outreach', () => {
    expect(movePrimary(js(), [step('Anything', { big: true })]).kind).toBe('reachout');
    expect(movePrimary(js(), [step('Warm intro sprint')]).label).toBe('Reach out now');
  });

  it('a positioning-flavoured step sharpens with the move as focus', () => {
    const mp = movePrimary(js(), [step('Sharpen your positioning')]);
    expect(mp.kind).toBe('sharpen');
    expect(mp.label).toBe('Make this move stronger');
    if (mp.kind === 'sharpen') expect(mp.focus).toBe('Sharpen your positioning. because');
  });

  it('a generic step works the move', () => {
    const mp = movePrimary(js(), [step('Write the one-pager')]);
    expect(mp.label).toBe('Work on this move');
  });

  it('never throws on a missing current step', () => {
    const mp = movePrimary(js({ current: 5 }), []);
    expect(mp.kind).toBe('sharpen');
    if (mp.kind === 'sharpen') expect(mp.focus).toBe('');
  });
});

describe('pickHomeAction', () => {
  const steps = [step('Reach your buyers', { big: true })];
  const base = { weakestPct: null, unrunAnswers: 0, provisional: 0, js: js(), steps };

  it('a genuinely weak dimension leads to strengthening', () => {
    expect(pickHomeAction({ ...base, weakestPct: ACTION_BIAS_FLOOR - 1 }))
      .toEqual({ kind: 'sharpen', label: 'Make it stronger' });
    expect(pickHomeAction({ ...base, js: js({ weak: true }) }).kind).toBe('sharpen');
  });

  it('in the 60-70 band the path move wins: sell, do not polish', () => {
    const act = pickHomeAction({ ...base, weakestPct: ACTION_BIAS_FLOOR });
    expect(act).toEqual({ kind: 'journey', label: 'Reach out now' });
    expect(pickHomeAction({ ...base, weakestPct: 69 }).kind).toBe('journey');
  });

  it('banked answers beat the path and carry the pending lift', () => {
    const act = pickHomeAction({ ...base, unrunAnswers: 2, provisional: 6 });
    expect(act).toEqual({ kind: 'rerun', label: 'See how it lands again (+6)' });
  });

  it('weak beats banked', () => {
    expect(pickHomeAction({ ...base, weakestPct: 30, unrunAnswers: 2, provisional: 6 }).kind).toBe('sharpen');
  });

  it('all done or no steps sends you to the path itself', () => {
    expect(pickHomeAction({ ...base, js: js({ allDone: true, current: 1 }) }).label).toBe(PLAN.openPath);
    expect(pickHomeAction({ ...base, steps: [] }).label).toBe(PLAN.openPath);
  });

  it('warm-blocked with strong dims mirrors the journey wording', () => {
    const act = pickHomeAction({ ...base, js: js({ warmBlocked: true }) });
    expect(act).toEqual({ kind: 'journey', label: 'Add people to light up your warm reach' });
  });
});

describe('homeRecommend (exactly two doors)', () => {
  const steps = [step('Reach your buyers', { big: true })];
  const base = { weakestPct: null, unrunAnswers: 0, provisional: 0, js: js(), steps };

  it('a genuine hole recommends the strengthen door', () => {
    expect(homeRecommend({ ...base, weakestPct: ACTION_BIAS_FLOOR - 1 })).toBe('strengthen');
    expect(homeRecommend({ ...base, js: js({ weak: true }) })).toBe('strengthen');
  });

  it('banked-but-unread answers recommend the strengthen door (lock in the gains)', () => {
    expect(homeRecommend({ ...base, unrunAnswers: 2, provisional: 6 })).toBe('strengthen');
  });

  it('a plan ready to move recommends the act door', () => {
    expect(homeRecommend({ ...base, weakestPct: ACTION_BIAS_FLOOR })).toBe('act');
    expect(homeRecommend({ ...base, js: js({ allDone: true, current: 1 }) })).toBe('act');
    expect(homeRecommend({ ...base, steps: [] })).toBe('act');
  });
});

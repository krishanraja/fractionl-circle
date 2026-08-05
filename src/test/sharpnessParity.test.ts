// The strength score exists twice by design: the client (src/pathroom/sharpness.ts,
// canonical) and the server port used by the weekly chief-of-staff brief
// (supabase/functions/_shared/sharpness.ts). This test imports BOTH and asserts
// identical output on fixtures, so any weight drift in either copy fails CI -
// the brief must never show a different number than Home.
import { describe, expect, it } from 'vitest';
import { computeSharpness as client } from '../pathroom/sharpness';
import { computeSharpness as server } from '../../supabase/functions/_shared/sharpness';
import { voicePromptBlock } from '../../supabase/functions/_shared/warmDigestCore';
import { pulseFactLines } from '../../supabase/functions/_shared/pulseFacts';
import { questionForDimension, REDTEAM_FALLBACK } from '../../supabase/functions/_shared/coachQuestions';
import type { Scorecard } from '../pathroom/thesisViews';

const READ = {
  read: 'Real demand, crowded field.',
  opportunity: [
    { label: 'Demand', band: 'strong', evidence: '', confidence: 'high' },
    { label: 'Burning need', band: 'mixed', evidence: '', confidence: 'medium' },
    { label: 'Crowding', band: 'risk', evidence: '', confidence: 'high' },
    { label: 'What makes you different', band: 'weak', evidence: '', confidence: 'low' },
  ],
  ability: [
    { label: 'Fit to you', band: 'strong', evidence: '', confidence: 'medium' },
    { label: 'Warm reach', band: 'mixed', evidence: '', confidence: 'low' },
    { label: 'Credibility', band: 'strong', evidence: '', confidence: 'high' },
  ],
  flags: [], steps: [], journey: [],
} as unknown as Scorecard;

const INPUTS = { hasBackground: true, hasLinkedin: false, inspirationCount: 1, circleCount: 12 };

describe('sharpness parity (client vs server port)', () => {
  it('agrees on a full read with banked answers', () => {
    const a = client(READ, INPUTS, 3);
    const b = server(READ as never, INPUTS, 3);
    expect(b.score).toBe(a.score);
    expect(b.provisional).toBe(a.provisional);
    expect(b.pending).toBe(a.pending);
    expect(b.weakest.map((d) => d.label)).toEqual(a.weakest.map((d) => d.label));
  });

  it('agrees on the no-read floor and the strong board', () => {
    expect(server(null, INPUTS, 0).score).toBe(client(null, INPUTS, 0).score);
    const strong = {
      ...READ,
      opportunity: (READ.opportunity).map((r) => ({ ...r, band: 'strong', confidence: 'high' })),
      ability: (READ.ability).map((r) => ({ ...r, band: 'strong', confidence: 'high' })),
    } as unknown as Scorecard;
    const a = client(strong, INPUTS, 0);
    const b = server(strong as never, INPUTS, 0);
    expect(b.score).toBe(a.score);
    expect(a.weakest).toHaveLength(0);
    expect(b.weakest).toHaveLength(0);
  });
});

describe('brief building blocks', () => {
  it('renders honest market lines and omits what Pulse did not return', () => {
    const lines = pulseFactLines({
      market: { score: 62, label: 'Stable', delta: 1.2 },
      role: { label: 'CMO', demand: 124, band: 'HIGH', rank: 2, total: 6 },
      asOf: null,
    });
    expect(lines[0]).toContain('62 - Stable (up 1.2 in 30 days)');
    expect(lines[1]).toContain('Demand for fractional CMOs: 124, 2nd of 6 tracked roles (high)');
    expect(pulseFactLines({ market: null, role: null, asOf: null })).toEqual([]);
  });

  it('picks the coach question for the weakest dimension, red-team when strong', () => {
    expect(questionForDimension('Warm reach').question).toContain('network');
    expect(questionForDimension('Nonexistent').topic).toBe('What makes you different');
    // Legacy runs stored "Your edge"; it must still resolve to the same coach question.
    expect(questionForDimension('Your edge').question).toContain('unfair advantage');
    expect(REDTEAM_FALLBACK.topic).toBe('Red team');
  });

  it('voice block few-shots edited finals and stays silent with none', () => {
    expect(voicePromptBlock([])).toBe('');
    const block = voicePromptBlock(['hey sam - long time. coffee next week?']);
    expect(block).toContain('HOW THIS USER ACTUALLY WRITES');
    expect(block).toContain('coffee next week');
  });
});

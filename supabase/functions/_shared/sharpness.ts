// Server-side port of the thesis-strength score. CANONICAL SOURCE:
// src/pathroom/sharpness.ts - the two implementations must agree, and a unit
// test (src/test/sharpnessParity.test.ts) imports BOTH and asserts identical
// output on fixtures, so a drift in either fails CI. Keep the weights in sync.
//
// Used by the weekly chief-of-staff brief, which needs the same 0-100 score the
// user sees on Home without a browser in the loop.

export type Band = 'weak' | 'mixed' | 'strong' | 'risk';
export interface ScoreRowT { label: string; band: Band; evidence?: string; confidence: 'high' | 'medium' | 'low' }

export interface SharpnessInputs {
  hasBackground: boolean;
  hasLinkedin: boolean;
  inspirationCount: number;
  circleCount: number;
}

export interface DimensionScore {
  label: string;
  side: 'opportunity' | 'ability';
  pct: number;
  band: Band;
  confidence: 'high' | 'medium' | 'low';
}

export interface Sharpness {
  score: number;
  provisional: number;
  pending: number;
  byDimension: DimensionScore[];
  weakest: DimensionScore[];
}

const BAND_W: Record<Band, number> = { weak: 0.3, mixed: 0.62, strong: 1.0, risk: 0.42 };
const CONF_CAP: Record<string, number> = { high: 1.0, medium: 0.82, low: 0.6 };

export function rowPct(r: ScoreRowT): number {
  const base = BAND_W[r.band] ?? 0.4;
  const cap = CONF_CAP[r.confidence] ?? 0.7;
  return Math.round(base * cap * 100);
}

function inputsPct(i: SharpnessInputs): number {
  const insp = Math.min(i.inspirationCount, 2) / 2;
  const circ = i.circleCount > 0 ? Math.min(i.circleCount, 5) / 5 : 0;
  return Math.round((
    (i.hasBackground ? 0.30 : 0) +
    (i.hasLinkedin ? 0.25 : 0) +
    insp * 0.20 +
    circ * 0.25
  ) * 100);
}

interface ScorecardLike { opportunity?: ScoreRowT[]; ability?: ScoreRowT[] }

export function computeSharpness(
  data: ScorecardLike | null,
  inputs: SharpnessInputs,
  unrunAnswers: number = 0,
): Sharpness {
  const inPct = inputsPct(inputs);

  if (!data) {
    const score = Math.round(0.4 * inPct);
    return { score, provisional: 0, pending: score, byDimension: [], weakest: [] };
  }

  const byDimension: DimensionScore[] = [
    ...((data.opportunity || []) as ScoreRowT[]).map((r) => ({ label: r.label, side: 'opportunity' as const, pct: rowPct(r), band: r.band, confidence: r.confidence })),
    ...((data.ability || []) as ScoreRowT[]).map((r) => ({ label: r.label, side: 'ability' as const, pct: rowPct(r), band: r.band, confidence: r.confidence })),
  ];

  const readPct = byDimension.length
    ? Math.round(byDimension.reduce((s, d) => s + d.pct, 0) / byDimension.length)
    : 0;

  const score = Math.round(0.78 * readPct + 0.22 * inPct);
  const provisional = Math.min(unrunAnswers * 3, 12);
  const pending = Math.min(100, score + provisional);
  const weakest = [...byDimension].sort((a, b) => a.pct - b.pct).filter((d) => d.pct < 70).slice(0, 2);

  return { score, provisional, pending, byDimension, weakest };
}

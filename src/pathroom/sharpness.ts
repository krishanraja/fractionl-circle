// Thesis-strength score (0-100), the number the app pushes toward 100. Pure and
// explainable: the read's seven graded dimensions (band x confidence) carry the
// bulk, grounded inputs add the rest, and answered sharpen-questions add a small
// PROVISIONAL lift until the next re-run locks them into a fresh read. The same
// computation surfaces the weakest dimension(s) - exactly what the question engine
// asks about next.
import type { Scorecard, ScoreRowT, Band } from './thesisViews';
import { dimLabel } from './copy';

export interface SharpnessInputs {
  hasBackground: boolean;
  hasLinkedin: boolean;
  inspirationCount: number;
  circleCount: number;
}

export interface DimensionScore {
  label: string;
  side: 'opportunity' | 'ability';
  pct: number; // 0-100, this dimension's strength
  band: Band;
  confidence: 'high' | 'medium' | 'low';
}

export interface Sharpness {
  score: number; // locked score from the current read + inputs, 0-100
  provisional: number; // extra points pending from unrun answers
  pending: number; // score + provisional, capped at 100
  byDimension: DimensionScore[];
  weakest: DimensionScore[]; // lowest dimensions, the question targets
}

// A band's intrinsic strength. "risk" (used for Crowding) is a genuine drag, not
// a neutral - a crowded niche is a real weakness - so it scores low.
const BAND_W: Record<Band, number> = { weak: 0.3, mixed: 0.62, strong: 1.0, risk: 0.42 };
// Low confidence caps how strong a dimension can read: you cannot be at 100 on a
// finding the research could not stand behind.
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

export function computeSharpness(
  data: Scorecard | null,
  inputs: SharpnessInputs,
  unrunAnswers: number = 0,
): Sharpness {
  const inPct = inputsPct(inputs);

  if (!data) {
    // No read yet: a deliberately low, honest floor driven only by inputs.
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

  // The read is the substance; inputs are the supporting fuel.
  const score = Math.round(0.78 * readPct + 0.22 * inPct);

  // Each answered-but-not-yet-rerun question is worth a few provisional points,
  // capped, so the user sees movement before spending a live re-run.
  const provisional = Math.min(unrunAnswers * 3, 12);
  const pending = Math.min(100, score + provisional);

  const weakest = [...byDimension].sort((a, b) => a.pct - b.pct).filter((d) => d.pct < 70).slice(0, 2);

  return { score, provisional, pending, byDimension, weakest };
}

// A short, honest line on what is holding the score back, for the UI.
export function holdingBack(s: Sharpness): string {
  if (!s.byDimension.length) return 'Run your read to start scoring this.';
  if (!s.weakest.length) return 'Strong across the board. Lock it in with a re-run.';
  const w = s.weakest[0];
  return `Weakest right now: ${dimLabel(w.label)}.`;
}

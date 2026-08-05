// Pure prompt-block builders for the decision memory that rides every read.
// The corpus rule these encode: a decision the user made is institutional
// memory - it must compound across reads, not evaporate after being folded in
// once. Settled decisions are context ("build on these, do not re-open them");
// new decisions are the fold-in queue; the previous read is the baseline the
// new read moves from. Dependency-free so the app's test runner can cover them.

export interface DecisionRow {
  dimension: string | null;
  question: string | null;
  answer: string;
  outcome?: string | null; // 'worked' | 'didnt_work' | null
}

const OUTCOME_NOTE: Record<string, string> = {
  worked: 'outcome: this worked',
  didnt_work: 'outcome: this did not work - weigh it accordingly',
};

export function decisionLine(d: DecisionRow): string {
  const head = `${d.dimension ? '[' + d.dimension + '] ' : ''}${d.question ? d.question + ' -> ' : ''}${d.answer}`;
  const note = d.outcome ? OUTCOME_NOTE[d.outcome] : null;
  return note ? `${head} (${note})` : head;
}

// Decisions a previous read already folded in. They are settled: the read must
// build on them and never re-litigate them as open questions.
export function settledDecisionsBlock(rows: DecisionRow[]): string {
  const lines = rows.map(decisionLine);
  return `DECISIONS THEY HAVE ALREADY MADE (settled in earlier reads - treat as fixed ground, build on them, do NOT re-open or contradict them):\n${lines.length ? lines.join('\n') : '(none yet)'}`;
}

// Fresh decisions banked since the last read - the fold-in queue that should
// directly raise the matching dimensions.
export function newDecisionsBlock(rows: DecisionRow[]): string {
  const lines = rows.map(decisionLine);
  return `WHAT THEY'VE CLARIFIED SINCE THE LAST READ (their own new decisions, weight these into the matching dimensions):\n${lines.length ? lines.join('\n') : '(none yet)'}`;
}

interface PriorRow { label?: string; band?: string; confidence?: string }

// A compact baseline from the previous run's scorecard, so the new read has
// continuity: it can note genuine movement and must not fabricate improvement.
export function priorReadBlock(result: unknown): string {
  const r = (result ?? {}) as { read?: unknown; opportunity?: unknown; ability?: unknown };
  const rows = [
    ...(Array.isArray(r.opportunity) ? (r.opportunity as PriorRow[]) : []),
    ...(Array.isArray(r.ability) ? (r.ability as PriorRow[]) : []),
  ].filter((x) => x && typeof x.label === 'string');
  if (!rows.length) return '';
  const dims = rows.map((x) => `${x.label}: ${x.band ?? '?'} (${x.confidence ?? '?'})`).join(' | ');
  const readLine = typeof r.read === 'string' && r.read.trim() ? `\nTheir previous overall read: "${r.read.trim()}"` : '';
  return `THEIR PREVIOUS READ (the baseline this read moves from - note genuine movement where the new evidence supports it, and never fabricate improvement):\n${dims}${readLine}`;
}

export interface BenchmarkRow {
  metric: string;
  value_low: number | null;
  value_mid: number | null;
  value_high: number | null;
  unit: string | null;
  source_tier: string | null;
}

export interface LandmineRow {
  name: string;
  description: string | null;
  survivor_pattern: string | null;
}

// Corpus benchmarks + named failure modes, with honest provenance. These ground
// the read's flags and pricing in seeded facts instead of whatever the live
// research happened to find that day. The tier rule keeps the honesty contract
// mechanical: a practitioner number is opinion, never telemetry.
export function corpusFactsBlock(benchmarks: BenchmarkRow[], landmines: LandmineRow[]): string {
  const b = benchmarks.map((x) => {
    const band = [x.value_low, x.value_mid, x.value_high].filter((v) => v != null);
    const range = band.length >= 2 && x.value_low !== x.value_high
      ? `${x.value_low}-${x.value_high}${x.value_mid != null ? ` (mid ${x.value_mid})` : ''}`
      : String(x.value_mid ?? x.value_low ?? x.value_high ?? '?');
    return `${x.metric}: ${range} ${x.unit ?? ''} [${x.source_tier ?? 'survey'}]`.trim();
  });
  const l = landmines.map((x) =>
    `${x.name}: ${x.description ?? ''}${x.survivor_pattern ? ` Survivors: ${x.survivor_pattern}` : ''}`.trim());
  if (!b.length && !l.length) return '';
  const parts: string[] = ['CORPUS BENCHMARKS AND KNOWN FAILURE MODES (fractional-market reference data; use to ground flags and pricing. State the provenance tier honestly: survey and expert_opinion numbers are directional bands or opinion, never hard telemetry. Do not invent numbers beyond these bands):'];
  if (b.length) parts.push(b.join('\n'));
  if (l.length) parts.push('Named failure modes for this path:\n' + l.join('\n'));
  return parts.join('\n');
}

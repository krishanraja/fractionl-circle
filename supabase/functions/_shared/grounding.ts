// Pure grounding helpers for the Match Engine. No DB imports, fully unit-testable.
// The job: hand the model real "why this person, why now" facts (warmth, recency,
// source, signal) and refuse the content-free role-equivalence tautology
// ("both are fractional executives", "shared title") at the server, so the
// generic-AI tell the product is fleeing can never be persisted.

export interface PersonSignal {
  kind: string;
  headline: string;
  occurred_at: string | null;
}

// Whole days since the last real interaction, or null when there has been none.
export const recencyDays = (
  iso: string | null | undefined,
  now: number = Date.now(),
): number | null => {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.round((now - t) / 86_400_000));
};

// The grounded facts handed to the model for one candidate. Nulls are kept (an
// honest "we do not know this") rather than omitted, so the model can see what
// it lacks and refuse to invent a warm path or a reason it is timely.
export const candidateFacts = (
  p: {
    warmth?: number | null;
    response_rate?: number | null;
    last_interaction_at?: string | null;
  },
  signal: PersonSignal | null,
  now?: number,
) => ({
  warmth: p.warmth ?? null,
  response_rate: p.response_rate ?? null,
  recency_days: recencyDays(p.last_interaction_at, now),
  signal: signal
    ? { kind: signal.kind, headline: signal.headline, occurred_at: signal.occurred_at ?? null }
    : null,
});

// A warm_path is ungrounded when it is empty, or when it restates role/category
// equivalence with no specific fact ("both are fractional executives", "shared
// title", "same role"). These are the confabulations the product must never show.
// Specific facts ("ex-colleague at Acme", "met at SaaStr", "introduced by Dana")
// are NOT matched, so legitimate warm paths survive.
const TAUTOLOGY =
  /\b(both (are |of you )?fractional|shared (the )?(title|role)|same (role|title|industry|space)|both .{0,24}(executives|operators|fractionals)|you both are)\b/i;

export const isUngroundedWarmPath = (
  warm: { via?: string | null; context?: string | null } | null | undefined,
): boolean => {
  if (!warm) return true;
  const text = `${warm.via ?? ''} ${warm.context ?? ''}`.trim();
  if (!text) return true;
  return TAUTOLOGY.test(text);
};

// Server-side backstop: null an ungrounded warm_path so it is never persisted,
// even if the model ignores the prompt rule.
export const groundWarmPath = (
  warm: { via?: string | null; context?: string | null } | null | undefined,
): { via?: string | null; context?: string | null } | null =>
  isUngroundedWarmPath(warm) ? null : (warm ?? null);

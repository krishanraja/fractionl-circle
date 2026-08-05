// Server-side tier catalogue. Mirrors src/lib/tiers.ts on the client. Kept
// self-contained so edge functions can import without dragging the whole
// client bundle through Deno.

// deno-lint-ignore-file no-explicit-any

export type Tier = 'free' | 'pro' | 'executive';

export interface TierQuotas {
  matches_per_week: number;
  active_streams: number;
  ask_messages_per_week: number;
  has_sunday_letter_text: boolean;
  has_sunday_letter_audio: boolean;
  has_external_signals: boolean;
  has_dedupe: boolean;
}

export const QUOTAS: Record<Tier, TierQuotas> = {
  free: {
    // P0: ungate the first session. A single weekly match made the cold-start
    // loop unusable (one move, then a wall). 3 lets a new user actually feel
    // the loop before any upgrade prompt. Revisit with the P1 first-run.
    matches_per_week: 3,
    active_streams: 1,
    ask_messages_per_week: 5,
    has_sunday_letter_text: false,
    has_sunday_letter_audio: false,
    has_external_signals: false,
    has_dedupe: false,
  },
  pro: {
    matches_per_week: 21,
    active_streams: 3,
    ask_messages_per_week: Number.POSITIVE_INFINITY,
    has_sunday_letter_text: true,
    has_sunday_letter_audio: false,
    has_external_signals: false,
    has_dedupe: true,
  },
  executive: {
    matches_per_week: Number.POSITIVE_INFINITY,
    active_streams: Number.POSITIVE_INFINITY,
    ask_messages_per_week: Number.POSITIVE_INFINITY,
    has_sunday_letter_text: true,
    has_sunday_letter_audio: true,
    has_external_signals: true,
    has_dedupe: true,
  },
};

// Pulls the user's current tier. Honours trial periods (trialing counts as
// pro). Falls back to 'free' if no subscription row.
export async function getUserTier(supabase: any, userId: string): Promise<Tier> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('tier, status, trial_ends_at')
    .eq('user_id', userId)
    .maybeSingle();
  // Fail CLOSED: a real read error must NOT be silently treated as 'free' (that
  // would 402 a paying customer) - propagate so the caller returns 5xx and the
  // user retries. A genuine no-row (new user, RLS-empty) is not an error and is free.
  if (error) throw new Error(`getUserTier read failed: ${error.message || error.code}`);
  if (!data) return 'free';
  const trialing = data.status === 'trialing'
    && data.trial_ends_at
    && new Date(data.trial_ends_at) > new Date();
  if (trialing) {
    // Trials always feel like pro at minimum.
    return (data.tier === 'executive' ? 'executive' : 'pro');
  }
  const tier = (data.tier ?? 'free') as Tier;
  return tier;
}

// ── Current-product entitlements (the read + the plan) ─────────────────────────
// The pricing ladder today is: Free = one read then a Pro gate; Pro/Executive =
// unlimited reads + full-network warm-reach search. `getUserTier` already treats an
// active trial as pro, so these gates only bite a genuinely free (post-trial) user.

// Free plan: one full read, then upgrade. Mirrors the client gate in ThesisApp
// (locked && runCount >= 1 -> Pro gate).
export const FREE_READ_LIMIT = 1;

// How many reads this user has already run. The paid work (Perplexity + structuring
// LLM) is what the free cap protects, so every persisted run counts.
export async function countThesisRuns(supabase: any, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('thesis_runs')
    .select('id', { head: true, count: 'exact' })
    .eq('user_id', userId);
  // Fail CLOSED: an errored count must not read as 0 (that would let a free user
  // past their cap). Propagate so the caller 5xxs instead of leaking a paid read.
  if (error) throw new Error(`countThesisRuns failed: ${error.message || error.code}`);
  return count ?? 0;
}

// A free (post-trial) user has spent their read allowance once they have >= 1 run.
export async function freeReadCapReached(supabase: any, userId: string): Promise<boolean> {
  const tier = await getUserTier(supabase, userId);
  if (tier !== 'free') return false;
  return (await countThesisRuns(supabase, userId)) >= FREE_READ_LIMIT;
}

// Full-network people search ("find_people") is a Pro capability. The free
// "working_on" path (rewrite my own profile) stays open to everyone.
export async function networkSearchIsPro(supabase: any, userId: string): Promise<boolean> {
  return (await getUserTier(supabase, userId)) === 'free';
}

// Count active-or-archived matches created in the trailing window.
// Idempotency skips + declines all count against the cap intentionally:
// the LLM call is what costs money, not the approval state.
export async function countMatchesSince(
  supabase: any,
  userId: string,
  sinceIso: string
): Promise<number> {
  const { count } = await supabase
    .from('matches')
    .select('id', { head: true, count: 'exact' })
    .eq('user_id', userId)
    .gte('surfaced_at', sinceIso);
  return count ?? 0;
}

export function startOfWeekIso(): string {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = date.getUTCDay();
  const delta = dow === 0 ? -6 : 1 - dow;
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString();
}

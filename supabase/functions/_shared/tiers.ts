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
  const { data } = await supabase
    .from('subscriptions')
    .select('tier, status, trial_ends_at')
    .eq('user_id', userId)
    .maybeSingle();
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

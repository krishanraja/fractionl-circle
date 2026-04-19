import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type SubscriptionTier = 'free' | 'pro' | 'executive';

interface Subscription {
  tier: SubscriptionTier;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

interface UsageData {
  voice_logs: number;
  ai_queries: number;
  contacts: number;
}

// Feature limits per tier (redesign ontology).
// Keyed feature names match what the rest of the app asks about: match_engine
// limits gate the Today "Surface Matches" action; streams gates how many
// active Ideas can compound into Streams; sunday_letter_text / _audio gate
// the Sunday Letter surfaces; ask_messages_per_week gates the Ask persona.
const LIMITS: Record<SubscriptionTier, Record<string, number>> = {
  free: {
    matches_per_day: 1 / 7,         // 1 per week, expressed as per-day budget
    matches_per_week: 1,
    active_streams: 1,
    ask_messages_per_week: 5,
    circle_sources: 1,
  },
  pro: {
    matches_per_day: 3,
    matches_per_week: 21,
    active_streams: 3,
    ask_messages_per_week: Infinity,
    circle_sources: Infinity,
  },
  executive: {
    matches_per_day: Infinity,
    matches_per_week: Infinity,
    active_streams: Infinity,
    ask_messages_per_week: Infinity,
    circle_sources: Infinity,
  },
};

// Feature gates for the redesign. Match Engine itself is free-tier-available
// (capped by matches_per_week); premium gates live in signal/letter-audio
// territory.
const TIER_FEATURES: Record<string, SubscriptionTier> = {
  sunday_letter_text: 'pro',
  sunday_letter_audio: 'executive',
  inbox_connect: 'pro',
  calendar_connect: 'pro',
  ledger: 'pro',
  ask_memory: 'pro',
  circle_dedupe: 'pro',
  external_signals: 'executive',
  autosend: 'executive',
  market_intelligence: 'executive',
  concierge: 'executive',
  priority_compute: 'executive',
};

const TIER_RANK: Record<SubscriptionTier, number> = { free: 0, pro: 1, executive: 2 };

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageData>({ voice_logs: 0, ai_queries: 0, contacts: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetchSubscription = async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setSubscription(data as unknown as Subscription);
      } else {
        // Default to free tier
        setSubscription({
          tier: 'free',
          status: 'active',
          stripe_customer_id: null,
          stripe_subscription_id: null,
          trial_ends_at: null,
          current_period_end: null,
          cancel_at_period_end: false,
        });
      }
      setLoading(false);
    };

    const fetchUsage = async () => {
      const periodStart = new Date();
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from('usage_tracking')
        .select('feature, count')
        .eq('user_id', user.id)
        .gte('period_start', periodStart.toISOString());

      if (data) {
        const usageMap: UsageData = { voice_logs: 0, ai_queries: 0, contacts: 0 };
        data.forEach((row: { feature: string; count: number }) => {
          if (row.feature in usageMap) {
            (usageMap as Record<string, number>)[row.feature] = row.count;
          }
        });
        setUsage(usageMap);
      }
    };

    fetchSubscription();
    fetchUsage();

    // Listen for subscription changes
    const channel = supabase
      .channel('subscription-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'subscriptions',
        filter: `user_id=eq.${user.id}`,
      }, () => fetchSubscription())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const tier = subscription?.tier || 'free';
  const isTrialing = subscription?.status === 'trialing' && subscription?.trial_ends_at
    ? new Date(subscription.trial_ends_at) > new Date()
    : false;
  const effectiveTier: SubscriptionTier = isTrialing ? 'pro' : tier;

  const trialDaysRemaining = subscription?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0;

  const isProOrAbove = TIER_RANK[effectiveTier] >= TIER_RANK.pro;
  const isExecutive = TIER_RANK[effectiveTier] >= TIER_RANK.executive;

  const canUse = useCallback((feature: string): boolean => {
    const requiredTier = TIER_FEATURES[feature];
    if (!requiredTier) return true; // Not gated
    return TIER_RANK[effectiveTier] >= TIER_RANK[requiredTier];
  }, [effectiveTier]);

  const getLimit = useCallback((feature: string): number => {
    return LIMITS[effectiveTier]?.[feature] ?? Infinity;
  }, [effectiveTier]);

  const isAtLimit = useCallback((feature: keyof UsageData): boolean => {
    const limit = LIMITS[effectiveTier]?.[feature] ?? Infinity;
    return usage[feature] >= limit;
  }, [effectiveTier, usage]);

  const getUsagePercent = useCallback((feature: keyof UsageData): number => {
    const limit = LIMITS[effectiveTier]?.[feature] ?? Infinity;
    if (limit === Infinity) return 0;
    return Math.min((usage[feature] / limit) * 100, 100);
  }, [effectiveTier, usage]);

  const incrementUsage = useCallback(async (feature: string) => {
    if (!user?.id) return;
    const periodStart = new Date();
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await supabase.rpc('increment_usage', {
      p_user_id: user.id,
      p_feature: feature,
      p_period_start: periodStart.toISOString(),
      p_period_end: periodEnd.toISOString(),
    }).then(() => {
      setUsage(prev => ({
        ...prev,
        [feature]: (prev[feature as keyof UsageData] || 0) + 1,
      }));
    }).catch(() => {
      // Fallback: upsert directly
      supabase.from('usage_tracking').upsert({
        user_id: user.id,
        feature,
        count: (usage[feature as keyof UsageData] || 0) + 1,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
      }, { onConflict: 'user_id,feature,period_start' });
    });
  }, [user?.id, usage]);

  const openCheckout = useCallback(async (priceId: string) => {
    const { data, error } = await supabase.functions.invoke('stripe-checkout', {
      body: { price_id: priceId },
    });
    if (error) throw error;
    if (!data?.url) {
      throw new Error('No checkout URL returned');
    }
    window.location.href = data.url;
  }, []);

  const openPortal = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('stripe-portal');
    if (error) throw error;
    if (data?.url) {
      window.location.href = data.url;
    }
  }, []);

  return {
    tier,
    effectiveTier,
    isTrialing,
    trialDaysRemaining,
    isProOrAbove,
    isExecutive,
    isPastDue: subscription?.status === 'past_due',
    cancelAtPeriodEnd: subscription?.cancel_at_period_end || false,
    currentPeriodEnd: subscription?.current_period_end,
    usage,
    loading,
    canUse,
    getLimit,
    isAtLimit,
    getUsagePercent,
    incrementUsage,
    openCheckout,
    openPortal,
  };
}

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

// Feature limits per tier
const LIMITS: Record<SubscriptionTier, Record<string, number>> = {
  free: {
    clients: 3,
    voice_logs: 20,
    ai_queries: 10,
    contacts: 25,
    history_days: 30,
    nudges_per_day: 3,
  },
  pro: {
    clients: Infinity,
    voice_logs: Infinity,
    ai_queries: 100,
    contacts: Infinity,
    history_days: Infinity,
    nudges_per_day: Infinity,
  },
  executive: {
    clients: Infinity,
    voice_logs: Infinity,
    ai_queries: Infinity,
    contacts: Infinity,
    history_days: Infinity,
    nudges_per_day: Infinity,
  },
};

// Features gated by tier
const TIER_FEATURES: Record<string, SubscriptionTier> = {
  relationship_health: 'pro',
  voice_commands: 'pro',
  full_desktop: 'pro',
  data_export: 'pro',
  google_sheets: 'pro',
  custom_pipeline: 'pro',
  full_briefing: 'pro',
  predictions: 'executive',
  custom_commands: 'executive',
  pdf_reports: 'executive',
  calendar_integration: 'executive',
  priority_support: 'executive',
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
    if (data?.url) {
      window.location.href = data.url;
    }
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

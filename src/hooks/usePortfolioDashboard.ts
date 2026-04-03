import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Client {
  id: string;
  name: string;
  color: string | null;
  status: string | null;
  engagement_type: string | null;
  monthly_revenue_target: number | null;
  hours_weekly: number | null;
  last_activity_date: string | null;
  activity_count: number;
}

export interface PortfolioDashboard {
  revenue: {
    current: number;
    target: number;
    currency: string;
    trend_pct: number | null;
  };
  clients: Client[];
  pipeline: {
    active: number;
    totalValue: number;
  };
  weeklyInsight: {
    ai_summary: string | null;
    highlights: string[];
    total_hours: number | null;
    total_activities: number | null;
  } | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

async function fetchDashboardData(userId: string) {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const monthStart = `${currentMonth}-01T00:00:00.000Z`;
  const nextMonth = new Date(currentMonth + '-01');
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const monthEnd = nextMonth.toISOString();

  const [
    revenueRes,
    activityRevenueRes,
    clientsRes,
    pipelineRes,
    activityRes,
    goalsRes,
    weeklyRes,
  ] = await Promise.all([
    supabase
      .from('revenue_entries')
      .select('amount')
      .eq('user_id', userId)
      .eq('month', currentMonth),

    supabase
      .from('activity_logs')
      .select('revenue')
      .eq('user_id', userId)
      .gte('logged_at', monthStart)
      .lt('logged_at', monthEnd),

    supabase
      .from('clients')
      .select('id, name, color, status, engagement_type, monthly_revenue_target, hours_weekly, last_activity_date')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('last_activity_date', { ascending: false }),

    supabase
      .from('opportunities')
      .select('id, estimated_value, stage')
      .eq('user_id', userId)
      .in('stage', ['lead', 'qualified', 'proposal', 'negotiation']),

    supabase
      .from('activity_logs')
      .select('client_id')
      .eq('user_id', userId)
      .gte('logged_at', thirtyDaysAgo),

    supabase
      .from('monthly_goals')
      .select('revenue_forecast, total_revenue_target')
      .eq('user_id', userId)
      .eq('month', currentMonth)
      .maybeSingle(),

    supabase
      .from('weekly_summaries')
      .select('ai_summary, highlights, total_hours, total_activities')
      .eq('user_id', userId)
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Revenue from both revenue_entries and activity_logs
  const revenueEntriesTotal = (revenueRes.data || []).reduce((sum, r) => sum + (r.amount || 0), 0);
  const activityRevenueTotal = (activityRevenueRes.data || []).reduce((sum, r) => sum + (r.revenue || 0), 0);
  const currentRevenue = revenueEntriesTotal + activityRevenueTotal;
  const revenueTarget = goalsRes.data?.total_revenue_target || goalsRes.data?.revenue_forecast || 0;

  // Activity counts per client
  const activityCounts: Record<string, number> = {};
  (activityRes.data || []).forEach(log => {
    if (log.client_id) activityCounts[log.client_id] = (activityCounts[log.client_id] || 0) + 1;
  });

  const maxActivity = Math.max(...Object.values(activityCounts), 1);

  const clients: Client[] = (clientsRes.data || []).map(c => ({
    ...c,
    activity_count: activityCounts[c.id] || 0,
    activity: Math.round(((activityCounts[c.id] || 0) / maxActivity) * 100),
  }));

  const activeOpps = pipelineRes.data || [];
  const totalValue = activeOpps.reduce((sum, o) => sum + (o.estimated_value || 0), 0);

  return {
    revenue: {
      current: currentRevenue,
      target: revenueTarget,
      currency: 'USD' as const,
      trend_pct: null as number | null,
    },
    clients,
    pipeline: {
      active: activeOpps.length,
      totalValue,
    },
    weeklyInsight: weeklyRes.data ? {
      ai_summary: weeklyRes.data.ai_summary,
      highlights: weeklyRes.data.highlights || [],
      total_hours: weeklyRes.data.total_hours,
      total_activities: weeklyRes.data.total_activities,
    } : null,
  };
}

export function usePortfolioDashboard(): PortfolioDashboard {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['portfolio-dashboard', user?.id],
    queryFn: () => fetchDashboardData(user!.id),
    enabled: !!user?.id,
    staleTime: 30_000, // 30s — revenue data is relatively fresh
    refetchOnWindowFocus: true,
  });

  // Real-time subscriptions invalidate the query instead of refetching everything
  useEffect(() => {
    if (!user?.id) return;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-dashboard', user.id] });
    };

    const channel = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs', filter: `user_id=eq.${user.id}` }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients', filter: `user_id=eq.${user.id}` }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'revenue_entries', filter: `user_id=eq.${user.id}` }, invalidate)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  const defaults = {
    revenue: { current: 0, target: 0, currency: 'USD', trend_pct: null },
    clients: [] as Client[],
    pipeline: { active: 0, totalValue: 0 },
    weeklyInsight: null,
  };

  return {
    ...(data ?? defaults),
    isLoading,
    error: error ? 'Failed to load dashboard' : null,
    refetch: () => { refetch(); },
  };
}

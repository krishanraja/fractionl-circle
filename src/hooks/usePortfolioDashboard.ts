import { useState, useEffect } from 'react';
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

export function usePortfolioDashboard(): PortfolioDashboard {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Omit<PortfolioDashboard, 'isLoading' | 'error' | 'refetch'>>({
    revenue: { current: 0, target: 0, currency: 'USD', trend_pct: null },
    clients: [],
    pipeline: { active: 0, totalValue: 0 },
    weeklyInsight: null,
  });

  const fetchDashboard = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    setError(null);

    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [
        revenueRes,
        clientsRes,
        pipelineRes,
        activityRes,
        goalsRes,
        weeklyRes,
      ] = await Promise.all([
        // Current month revenue
        supabase
          .from('revenue_entries')
          .select('amount')
          .eq('user_id', user.id)
          .eq('month', currentMonth),

        // Active clients
        supabase
          .from('clients')
          .select('id, name, color, status, engagement_type, monthly_revenue_target, hours_weekly, last_activity_date')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('last_activity_date', { ascending: false }),

        // Pipeline opportunities
        supabase
          .from('opportunities')
          .select('id, estimated_value, stage')
          .eq('user_id', user.id)
          .not('stage', 'eq', 'closed_lost'),

        // Activity counts per client (last 30 days)
        supabase
          .from('activity_logs')
          .select('client_id')
          .eq('user_id', user.id)
          .gte('logged_at', thirtyDaysAgo),

        // Monthly revenue goal
        supabase
          .from('monthly_goals')
          .select('revenue_forecast, total_revenue_target')
          .eq('user_id', user.id)
          .eq('month', currentMonth)
          .maybeSingle(),

        // Latest weekly summary
        supabase
          .from('weekly_summaries')
          .select('ai_summary, highlights, total_hours, total_activities')
          .eq('user_id', user.id)
          .order('week_start', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      // Revenue
      const currentRevenue = (revenueRes.data || []).reduce((sum, r) => sum + (r.amount || 0), 0);
      const revenueTarget = goalsRes.data?.total_revenue_target || goalsRes.data?.revenue_forecast || 0;

      // Activity counts per client
      const activityCounts: Record<string, number> = {};
      (activityRes.data || []).forEach(log => {
        if (log.client_id) activityCounts[log.client_id] = (activityCounts[log.client_id] || 0) + 1;
      });

      // Max activity count for normalisation
      const maxActivity = Math.max(...Object.values(activityCounts), 1);

      // Clients with activity bars
      const clients: Client[] = (clientsRes.data || []).map(c => ({
        ...c,
        activity_count: activityCounts[c.id] || 0,
        // Normalise to 0-100 for the activity bar
        activity: Math.round(((activityCounts[c.id] || 0) / maxActivity) * 100),
      }));

      // Pipeline
      const activeOpps = (pipelineRes.data || []);
      const totalValue = activeOpps.reduce((sum, o) => sum + (o.estimated_value || 0), 0);

      setData({
        revenue: {
          current: currentRevenue,
          target: revenueTarget,
          currency: 'USD',
          trend_pct: null, // TODO: compare to last month
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
      });

    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();

    // Real-time subscriptions
    if (!user?.id) return;
    const channel = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs', filter: `user_id=eq.${user.id}` }, fetchDashboard)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients', filter: `user_id=eq.${user.id}` }, fetchDashboard)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'revenue_entries', filter: `user_id=eq.${user.id}` }, fetchDashboard)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  return { ...data, isLoading, error, refetch: fetchDashboard };
}

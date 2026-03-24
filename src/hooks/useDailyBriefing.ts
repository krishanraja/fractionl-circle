import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface BriefingAlert {
  type: 'client_stale' | 'revenue' | 'pipeline' | 'momentum';
  priority: 'high' | 'medium' | 'low';
  message: string;
  client_name?: string;
}

interface BriefingAction {
  label: string;
  type: 'log' | 'call' | 'review' | 'plan';
}

interface BriefingMetrics {
  revenue_current: number;
  revenue_target: number;
  revenue_pacing: number;
  clients_active: number;
  clients_needing_attention: number;
  pipeline_value: number;
  opportunities_active: number;
  opportunities_stale: number;
  activities_this_week: number;
}

export interface DailyBriefing {
  greeting: string;
  headline: string;
  alerts: BriefingAlert[];
  actions: BriefingAction[];
  mood: 'positive' | 'neutral' | 'attention';
  metrics: BriefingMetrics;
}

const BRIEFING_CACHE_KEY = 'circle_daily_briefing';
const BRIEFING_CACHE_EXPIRY = 4 * 60 * 60 * 1000; // 4 hours

export function useDailyBriefing() {
  const { user } = useAuth();
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    // Check cache first
    const cached = localStorage.getItem(BRIEFING_CACHE_KEY);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < BRIEFING_CACHE_EXPIRY) {
          setBriefing(data);
          setLoading(false);
          return;
        }
      } catch {
        // Cache invalid, proceed to fetch
      }
    }

    const fetchBriefing = async () => {
      setLoading(true);
      try {
        const { data, error: fnError } = await supabase.functions.invoke('daily-briefing');
        if (fnError) throw fnError;

        setBriefing(data as DailyBriefing);

        // Cache the result
        localStorage.setItem(BRIEFING_CACHE_KEY, JSON.stringify({
          data,
          timestamp: Date.now(),
        }));
      } catch (err) {
        console.error('Failed to fetch briefing:', err);
        setError('Could not load your briefing');
      } finally {
        setLoading(false);
      }
    };

    fetchBriefing();
  }, [user?.id]);

  const refresh = async () => {
    localStorage.removeItem(BRIEFING_CACHE_KEY);
    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('daily-briefing');
      if (fnError) throw fnError;
      setBriefing(data as DailyBriefing);
      localStorage.setItem(BRIEFING_CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch (err) {
      console.error('Failed to refresh briefing:', err);
    } finally {
      setLoading(false);
    }
  };

  const dismiss = () => {
    setBriefing(prev => prev ? { ...prev, alerts: [] } : null);
  };

  return { briefing, loading, error, refresh, dismiss };
}

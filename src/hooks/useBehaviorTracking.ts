import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface BehaviorEvent {
  event_type: string;
  event_category: string;
  event_action: string;
  event_label?: string;
  event_value?: number;
  page_path?: string;
  component_name?: string;
  metadata?: Record<string, unknown>;
}

export const useBehaviorTracking = () => {
  const { user } = useAuth();
  const sessionIdRef = useRef<string | null>(null);
  const eventQueueRef = useRef<BehaviorEvent[]>([]);
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate or retrieve session ID
  useEffect(() => {
    if (!user?.id) return;

    const existingSessionId = sessionStorage.getItem('portfolio_session_id');
    if (existingSessionId) {
      sessionIdRef.current = existingSessionId;
    } else {
      const newSessionId = crypto.randomUUID();
      sessionStorage.setItem('portfolio_session_id', newSessionId);
      sessionIdRef.current = newSessionId;

      // Create session record
      createSession(newSessionId);
    }

    // Track session end on unload
    const handleUnload = () => {
      if (sessionIdRef.current) {
        endSession(sessionIdRef.current);
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [user?.id]);

  // Create session record
  const createSession = async (sessionId: string) => {
    if (!user?.id) return;

    try {
      await supabase.from('user_sessions').insert({
        id: sessionId,
        user_id: user.id,
        device_type: getDeviceType(),
        browser: getBrowser(),
        screen_width: window.innerWidth
      });
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  // End session
  const endSession = async (sessionId: string) => {
    if (!user?.id) return;

    try {
      const startTime = sessionStorage.getItem('portfolio_session_start');
      const duration = startTime 
        ? Math.floor((Date.now() - parseInt(startTime)) / 1000)
        : 0;

      await supabase.from('user_sessions').update({
        ended_at: new Date().toISOString(),
        duration_seconds: duration
      }).eq('id', sessionId);
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  // Batch flush events
  const flushEvents = useCallback(async () => {
    if (!user?.id || eventQueueRef.current.length === 0) return;

    const events = [...eventQueueRef.current];
    eventQueueRef.current = [];

    try {
      const formattedEvents = events.map(event => ({
        ...event,
        user_id: user.id,
        session_id: sessionIdRef.current,
        device_type: getDeviceType()
      }));

      await supabase.from('user_behavior_logs').insert(formattedEvents);
    } catch (error) {
      console.error('Error logging behavior:', error);
      // Re-add failed events to queue
      eventQueueRef.current.unshift(...events);
    }
  }, [user?.id]);

  // Track event with batching
  const trackEvent = useCallback((event: BehaviorEvent) => {
    if (!user?.id) return;

    eventQueueRef.current.push({
      ...event,
      page_path: event.page_path || window.location.pathname
    });

    // Debounce flush
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
    }
    flushTimeoutRef.current = setTimeout(flushEvents, 2000);

    // Immediate flush if queue is large
    if (eventQueueRef.current.length >= 10) {
      flushEvents();
    }
  }, [user?.id, flushEvents]);

  // Convenience tracking methods
  const trackPageView = useCallback((pagePath: string, pageTitle?: string) => {
    trackEvent({
      event_type: 'page_view',
      event_category: 'navigation',
      event_action: 'view',
      event_label: pageTitle,
      page_path: pagePath
    });
  }, [trackEvent]);

  const trackFeatureUse = useCallback((featureKey: string, action: string, metadata?: Record<string, unknown>) => {
    trackEvent({
      event_type: 'feature_use',
      event_category: 'engagement',
      event_action: action,
      event_label: featureKey,
      metadata
    });

    // Also update feature_usage table
    updateFeatureUsage(featureKey);
  }, [trackEvent]);

  const trackClick = useCallback((componentName: string, action: string, metadata?: Record<string, unknown>) => {
    trackEvent({
      event_type: 'click',
      event_category: 'interaction',
      event_action: action,
      component_name: componentName,
      metadata
    });
  }, [trackEvent]);

  const trackAIInteraction = useCallback((action: string, query?: string, metadata?: Record<string, unknown>) => {
    trackEvent({
      event_type: 'ai_interaction',
      event_category: 'ai',
      event_action: action,
      event_label: query?.substring(0, 100),
      metadata
    });
  }, [trackEvent]);

  const trackGoalUpdate = useCallback((goalType: string, value: number, metadata?: Record<string, unknown>) => {
    trackEvent({
      event_type: 'goal_update',
      event_category: 'data_entry',
      event_action: 'update',
      event_label: goalType,
      event_value: value,
      metadata
    });
  }, [trackEvent]);

  // Update feature usage
  const updateFeatureUsage = async (featureKey: string) => {
    if (!user?.id) return;

    try {
      const { data: existing } = await supabase
        .from('feature_usage')
        .select('id, usage_count')
        .eq('user_id', user.id)
        .eq('feature_key', featureKey)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('feature_usage')
          .update({ 
            usage_count: (existing.usage_count || 0) + 1,
            last_used_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('feature_usage')
          .insert({
            user_id: user.id,
            feature_key: featureKey,
            usage_count: 1
          });
      }
    } catch (error) {
      console.error('Error updating feature usage:', error);
    }
  };

  return {
    trackEvent,
    trackPageView,
    trackFeatureUse,
    trackClick,
    trackAIInteraction,
    trackGoalUpdate
  };
};

// Utility functions
function getDeviceType(): string {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function getBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Other';
}

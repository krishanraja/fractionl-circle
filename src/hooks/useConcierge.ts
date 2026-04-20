import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type ConciergeStatus = 'requested' | 'scheduled' | 'in_progress' | 'delivered' | 'cancelled';

export interface ConciergeRequest {
  id: string;
  user_id: string;
  status: ConciergeStatus;
  preferred_times: string | null;
  notes: string | null;
  scheduled_at: string | null;
  assigned_to: string | null;
  ops_notes: string | null;
  result_stats: Record<string, unknown> | null;
  booking_url: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConciergeAttachment {
  path: string;
  name: string;
  size: number;
  contentType: string;
}

const ACTIVE_STATES: ConciergeStatus[] = ['requested', 'scheduled', 'in_progress'];
const VISIBLE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export const useConcierge = () => {
  const { user } = useAuth();
  const [request, setRequest] = useState<ConciergeRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setRequest(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('concierge_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setRequest((data as ConciergeRequest | null) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const submit = useCallback(async (payload: {
    preferred_times: string;
    notes: string;
    files: File[];
  }): Promise<ConciergeRequest> => {
    if (!user) throw new Error('Not signed in');
    setSubmitting(true);
    try {
      const { data: inserted, error } = await supabase
        .from('concierge_requests')
        .insert({
          user_id: user.id,
          status: 'requested' as const,
          preferred_times: payload.preferred_times.trim() || null,
          notes: payload.notes.trim() || null,
        })
        .select('*')
        .single();
      if (error || !inserted) throw error ?? new Error('Could not create request');

      const req = inserted as ConciergeRequest;

      // Best-effort attachment upload; don't abort the whole submit on a
      // single failed file.
      for (const file of payload.files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_');
        const path = `${user.id}/${req.id}/${Date.now()}_${safeName}`;
        const { error: upErr } = await supabase.storage
          .from('concierge-uploads')
          .upload(path, file, {
            contentType: file.type || 'application/octet-stream',
            upsert: false,
          });
        if (upErr) {
          console.warn('concierge upload failed:', file.name, upErr.message);
        }
      }

      // Fire-and-forget notification; we don't want Slack/email hiccups to
      // block the UI flow.
      void supabase.functions
        .invoke('notify-concierge-event', {
          body: { event: 'requested', request_id: req.id },
        })
        .catch((e) => console.warn('notify-concierge-event failed', e));

      setRequest(req);
      return req;
    } finally {
      setSubmitting(false);
    }
  }, [user]);

  const cancel = useCallback(async () => {
    if (!request) return;
    const { error } = await supabase
      .from('concierge_requests')
      .update({ status: 'cancelled' as const, cancelled_at: new Date().toISOString() })
      .eq('id', request.id);
    if (error) throw error;
    void supabase.functions
      .invoke('notify-concierge-event', {
        body: { event: 'cancelled', request_id: request.id },
      })
      .catch((e) => console.warn('notify-concierge-event failed', e));
    await refresh();
  }, [request, refresh]);

  const isActive = !!request && ACTIVE_STATES.includes(request.status);
  const isRecentDelivery = !!request
    && request.status === 'delivered'
    && request.completed_at
    && Date.now() - new Date(request.completed_at).getTime() < VISIBLE_WINDOW_MS;
  const showCard = isActive || isRecentDelivery || !request;

  return {
    request,
    loading,
    submitting,
    isActive,
    isRecentDelivery,
    showCard,
    refresh,
    submit,
    cancel,
  };
};

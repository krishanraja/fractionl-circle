import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Reminder = Database['public']['Tables']['reminders']['Row'];
type ReminderInsert = Database['public']['Tables']['reminders']['Insert'];

export function useReminders() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReminders = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true)
        .is('completed_at', null)
        .order('scheduled_at', { ascending: true });

      if (!error && data) setReminders(data);
    } catch {
      // Table may not exist yet -- fail silently
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchReminders(); }, [fetchReminders]);

  const addReminder = async (reminder: Omit<ReminderInsert, 'user_id'>) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from('reminders')
      .insert({ ...reminder, user_id: user.id });

    if (error) {
      toast.error('Failed to create reminder');
      throw error;
    }
    toast.success('Reminder set');
    fetchReminders();
  };

  const completeReminder = async (id: string) => {
    const { error } = await supabase
      .from('reminders')
      .update({ completed_at: new Date().toISOString(), active: false })
      .eq('id', id);

    if (!error) {
      setReminders(prev => prev.filter(r => r.id !== id));
      toast.success('Reminder completed');
    }
  };

  const dismissReminder = async (id: string) => {
    const { error } = await supabase
      .from('reminders')
      .update({ active: false })
      .eq('id', id);

    if (!error) {
      setReminders(prev => prev.filter(r => r.id !== id));
    }
  };

  // Get upcoming reminders (within next 24h)
  const upcoming = reminders.filter(r => {
    const scheduledTime = new Date(r.scheduled_at).getTime();
    const now = Date.now();
    return scheduledTime <= now + 86400000 && scheduledTime >= now - 3600000;
  });

  return {
    reminders,
    upcoming,
    loading,
    addReminder,
    completeReminder,
    dismissReminder,
    refetch: fetchReminders,
  };
}

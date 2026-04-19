import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SundayLetterStats {
  matches_surfaced?: number;
  matches_approved?: number;
  matches_declined?: number;
  moves_sent?: number;
  moves_drafted?: number;
  new_circle_people?: number;
  active_ideas?: number;
}

export interface SundayLetterRow {
  id: string;
  user_id: string;
  week_of: string;
  text_body: string;
  audio_url: string | null;
  stats: SundayLetterStats | null;
  model: string | null;
  created_at: string;
}

const startOfWeekIso = (d: Date = new Date()): string => {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = date.getUTCDay();
  const delta = dow === 0 ? -6 : 1 - dow;
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
};

export const useSundayLetter = () => {
  const { user } = useAuth();
  const [letter, setLetter] = useState<SundayLetterRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const weekOf = startOfWeekIso();

  const refresh = useCallback(async () => {
    if (!user) {
      setLetter(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('sunday_letters')
      .select('*')
      .eq('user_id', user.id)
      .order('week_of', { ascending: false })
      .limit(1)
      .maybeSingle();
    setLetter((data as SundayLetterRow | null) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const generate = useCallback(async (opts?: { force?: boolean }): Promise<SundayLetterRow | null> => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-sunday-letter', {
        body: { force: opts?.force ?? false },
      });
      if (error) throw error;
      const next = (data as { letter?: SundayLetterRow } | null)?.letter ?? null;
      if (next) setLetter(next);
      return next;
    } finally {
      setGenerating(false);
    }
  }, []);

  const isThisWeek = letter?.week_of === weekOf;

  return { letter, loading, generating, refresh, generate, isThisWeek, weekOf };
};

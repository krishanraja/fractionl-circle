import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// A Stream is an Idea that has earned its way in. This hook reads the user's
// streams, joins the originating Idea title, and sums realized revenue from
// ledger_entries so the closed-loop view shows what is actually working.

export interface EnrichedStream {
  id: string;
  name: string;
  state: string;
  ideaTitle: string | null;
  earnedCents: number;
  monthlyTargetCents: number | null;
  activatedAt: string | null;
}

export const useStreams = () => {
  const { user } = useAuth();
  const [streams, setStreams] = useState<EnrichedStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setStreams([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const { data: rows, error: streamErr } = await supabase
      .from('streams')
      .select('id, name, state, idea_id, monthly_target_cents, activated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (streamErr) {
      setError('Could not load your Streams. Tap to retry.');
      setStreams([]);
      setLoading(false);
      return;
    }

    const streamRows = rows ?? [];
    const ideaIds = Array.from(
      new Set(streamRows.map((s) => s.idea_id).filter((id): id is string => Boolean(id)))
    );

    const [{ data: ledger }, { data: ideas }] = await Promise.all([
      supabase.from('ledger_entries').select('stream_id, amount_cents').eq('user_id', user.id),
      ideaIds.length
        ? supabase.from('ideas').select('id, title').in('id', ideaIds)
        : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    ]);

    const earnedByStream = new Map<string, number>();
    for (const entry of ledger ?? []) {
      if (!entry.stream_id) continue;
      earnedByStream.set(entry.stream_id, (earnedByStream.get(entry.stream_id) ?? 0) + (entry.amount_cents ?? 0));
    }
    const titleByIdea = new Map<string, string>((ideas ?? []).map((i) => [i.id, i.title]));

    setStreams(
      streamRows.map((s) => ({
        id: s.id,
        name: s.name,
        state: s.state,
        ideaTitle: s.idea_id ? titleByIdea.get(s.idea_id) ?? null : null,
        earnedCents: earnedByStream.get(s.id) ?? 0,
        monthlyTargetCents: s.monthly_target_cents ?? null,
        activatedAt: s.activated_at ?? null,
      }))
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { streams, loading, error, refresh };
};

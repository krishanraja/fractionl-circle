import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Database } from '@/integrations/supabase/types';

export type Source = Database['public']['Tables']['sources']['Row'];

interface CircleSnapshot {
  totalPeople: number;
  sources: Source[];
}

export const useCircle = () => {
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<CircleSnapshot>({ totalPeople: 0, sources: [] });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setSnapshot({ totalPeople: 0, sources: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ count }, { data: sources }] = await Promise.all([
      supabase
        .from('circle_person')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabase
        .from('sources')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ]);
    setSnapshot({ totalPeople: count ?? 0, sources: sources ?? [] });
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...snapshot, loading, refresh };
};

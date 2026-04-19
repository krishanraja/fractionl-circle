import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Database } from '@/integrations/supabase/types';

export type Idea = Database['public']['Tables']['ideas']['Row'];

export const useIdeas = () => {
  const { user } = useAuth();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIdeas([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('ideas')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['voiced', 'proposed', 'active'])
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (!error && data) setIdeas(data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { ideas, loading };
};

// Live data layer for the thesis app. validate-thesis runs the research + structuring
// and persists the run server-side (RLS, user-owned); we read the latest run back.
import { supabase } from '@/integrations/supabase/client';
import type { Scorecard } from './thesisViews';

export async function getLatestRun(userId: string): Promise<Scorecard | null> {
  const { data } = await supabase
    .from('thesis_runs')
    .select('result')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data as { result?: Scorecard } | null)?.result) ?? null;
}

export async function runValidation(thesis: string, linkedin: string, background: string): Promise<Scorecard> {
  const { data, error } = await supabase.functions.invoke('validate-thesis', {
    body: { thesis, linkedin_url: linkedin || undefined, background: background || undefined },
  });
  if (error) throw error;
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as Scorecard;
}

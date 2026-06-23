// Client glue for the surfacing loop. Both edge functions already exist and are
// auth'd + rate-limited; this just wires them to the Circle hero:
//   setReadFromText  -> extract-read   (free text -> structured the_read)
//   rankInnerCircle  -> rank-inner-circle (the_read + circle -> who matters now)
import { supabase } from '@/integrations/supabase/client';

export type InnerRole = 'PROOF' | 'UNLOCK' | 'MULTIPLIER' | 'RISK' | 'MIRROR';

export interface RankedPerson {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  role: InnerRole | string;
  why: string;
}

// Update the_read from the user's own words ("what are you working on right now?").
export async function setReadFromText(text: string): Promise<void> {
  const { error } = await supabase.functions.invoke('extract-read', { body: { text } });
  if (error) throw error;
}

// Re-rank the user's real network for their current direction. Returns [] when
// the read is thin or the circle is empty — an encouraging empty state, not an error.
export async function rankInnerCircle(): Promise<RankedPerson[]> {
  const { data, error } = await supabase.functions.invoke('rank-inner-circle');
  if (error) throw error;
  const people = (data as { people?: unknown })?.people;
  return Array.isArray(people) ? (people as RankedPerson[]) : [];
}

// The last thing they told us they were working on, to prefill the input.
export async function getReadOffer(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('the_read')
    .select('offer_one_liner')
    .eq('user_id', userId)
    .maybeSingle();
  return (data as { offer_one_liner: string | null } | null)?.offer_one_liner ?? null;
}

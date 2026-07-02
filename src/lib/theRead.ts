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
// the read is thin or the circle is empty - an encouraging empty state, not an error.
export async function rankInnerCircle(): Promise<RankedPerson[]> {
  const { data, error } = await supabase.functions.invoke('rank-inner-circle');
  if (error) throw error;
  const people = (data as { people?: unknown })?.people;
  return Array.isArray(people) ? (people as RankedPerson[]) : [];
}

// One cited fact behind a match, so the UI can show honest provenance.
export interface MatchEvidence {
  claim: string;
  source: string; // title | company | tags | note | summary | experience | education | skills
}

// A person surfaced by a people-search (find_people intent). Unlike RankedPerson
// there is no inner-circle role; instead we carry the degree of the match, the real
// fact that matched (matched_on), the cited evidence, and how sure we are
// (confidence 0..1). "second" degree = an evidence-backed route to the target
// (INFERRED), never an invented relationship.
export interface NetworkMatch {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  why: string;
  degree: 'first' | 'second';
  matched_on: string | null;
  confidence: number | null;
  evidence: MatchEvidence[];
}

export type BoxIntent = 'working_on' | 'find_people';

// Search the WHOLE network for people who fit a "who can help with X" query.
// v1 matches over data already connected (title/company/tags/note/dossier); no new
// enrichment. Returns [] on a thin/ungrounded result - an honest empty state.
export async function searchNetwork(query: string): Promise<NetworkMatch[]> {
  const { data, error } = await supabase.functions.invoke('search-network', { body: { query } });
  if (error) throw error;
  const people = (data as { people?: unknown })?.people;
  return Array.isArray(people) ? (people as NetworkMatch[]) : [];
}

// Route one box submission. The edge function first classifies the query: if the
// user is describing THEIR OWN direction we fall back to the existing read+rank
// loop; if they're looking for someone we return network matches. The single
// server round trip owns the classification so the client never has to guess.
export interface BoxResult {
  intent: BoxIntent;
  working?: RankedPerson[];
  found?: NetworkMatch[];
}

export async function runBoxQuery(text: string): Promise<BoxResult> {
  const { data } = await supabase.functions.invoke('search-network', { body: { query: text } });
  const intent = (data as { intent?: string } | null)?.intent;
  if (intent === 'find_people') {
    const people = (data as { people?: unknown })?.people;
    return { intent: 'find_people', found: Array.isArray(people) ? (people as NetworkMatch[]) : [] };
  }
  // working_on: the query is about the user's own direction - read it and rank the
  // inner circle, exactly as the box did before.
  await setReadFromText(text);
  const working = await rankInnerCircle();
  return { intent: 'working_on', working };
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

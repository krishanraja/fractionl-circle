// Supabase access for the Path Room. the_read + decision_ledger are user-owned
// (RLS scopes to the caller); benchmarks/landmines/cohort are shared-reference
// (read-all-authenticated). No service-role key on the client.
import { supabase } from '@/integrations/supabase/client';
import type { Benchmark, Cohort, ForkDomain, Landmine, LedgerEntry, Segment, TheRead } from './engine';

export async function getRead(userId: string): Promise<TheRead | null> {
  const { data } = await supabase.from('the_read').select('*').eq('user_id', userId).maybeSingle();
  return (data as TheRead) ?? null;
}

export async function upsertRead(userId: string, patch: Partial<TheRead>): Promise<void> {
  await supabase.from('the_read').upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() } as never, { onConflict: 'user_id' });
}

export async function getEngineData(): Promise<{ benchmarks: Benchmark[]; landmines: Landmine[]; cohort: Cohort[] }> {
  const [b, l, c] = await Promise.all([
    supabase.from('benchmarks').select('*'),
    supabase.from('landmines').select('*'),
    supabase.from('comparable_cohort').select('*'),
  ]);
  return {
    benchmarks: (b.data as Benchmark[]) ?? [],
    landmines: (l.data as Landmine[]) ?? [],
    cohort: (c.data as Cohort[]) ?? [],
  };
}

export async function getLedger(userId: string): Promise<LedgerEntry[]> {
  const { data } = await supabase
    .from('decision_ledger')
    .select('id, fork_domain, decision_one_liner, reasoning, outcome, committed_at')
    .eq('user_id', userId)
    .order('committed_at', { ascending: false });
  return (data as LedgerEntry[]) ?? [];
}

export async function commitDecision(
  userId: string,
  d: { fork_domain: ForkDomain; decision_one_liner: string; chosen_branch: string; reasoning: string; branches_considered: unknown },
): Promise<void> {
  await supabase.from('decision_ledger').insert({
    user_id: userId,
    fork_domain: d.fork_domain,
    decision_one_liner: d.decision_one_liner,
    chosen_branch: d.chosen_branch,
    reasoning: d.reasoning,
    branches_considered: d.branches_considered as never,
  } as never);
}

export interface CirclePerson { id: string; display_name: string; company: string | null; title: string | null; warmth: number | null; last_interaction_at: string | null }
export async function getInnerCircle(userId: string): Promise<CirclePerson[]> {
  const { data } = await supabase
    .from('circle_person')
    .select('id, display_name, company, title, warmth, last_interaction_at')
    .eq('user_id', userId)
    .order('warmth', { ascending: false, nullsFirst: false })
    .limit(8);
  return (data as CirclePerson[]) ?? [];
}

// The living inner circle: who + why + role for the current direction. Reads the
// cache on the_read when it matches the lit fork; otherwise re-ranks (Gemini), which
// also refreshes the cache. Re-ranks on direction change, cheap on every paint.
export interface RankedPerson { id: string; name: string; title: string | null; company: string | null; role: string; why: string }
export async function getRankedInnerCircle(read: TheRead): Promise<RankedPerson[]> {
  if (Array.isArray(read.inner_circle) && read.inner_circle_fork === read.lit_fork_domain) {
    return read.inner_circle as RankedPerson[];
  }
  const { data } = await supabase.functions.invoke('rank-inner-circle', { body: {} });
  return ((data as { people?: RankedPerson[] })?.people) ?? [];
}

// The reasoning inside the Decision Room: a personalised read-back + the consequence of
// deciding + the honest trade-off + the sharpening question (decision-engine, Gemini).
export interface DecisionBrief { headline: string | null; consequence: string | null; watch_out: string | null; question: string | null; grounded: boolean }
export async function getDecisionBrief(forkDomain: string): Promise<DecisionBrief | null> {
  const { data } = await supabase.functions.invoke('decision-engine', { body: { fork_domain: forkDomain } });
  return ((data as { brief?: DecisionBrief })?.brief) ?? null;
}

// The smart onboarding path: infer the Read from the user's own words (Gemini).
export async function extractRead(text: string): Promise<void> {
  const { error } = await supabase.functions.invoke('extract-read', { body: { text } });
  if (error) throw error;
}

// Onboarding pill answers -> the_read fields.
export function segmentFromAnswer(a: string): Segment {
  if (a.startsWith('Just left') || a.startsWith('A few months')) return 'new';
  if (a.startsWith('Established')) return 'seasoned';
  return 'new';
}

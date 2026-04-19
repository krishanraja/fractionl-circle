import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Match state is an enum in the DB. Phase 4 only reads/writes via string literals;
// a regenerated types file will later give us the full enum type.
export type MatchState = 'new' | 'approved' | 'edited' | 'sent' | 'won' | 'cold' | 'declined';
export type MoveChannel = 'email' | 'linkedin_dm' | 'sms' | 'call' | 'calendar_invite' | 'post' | 'other';
export type MoveState = 'draft' | 'approved' | 'sent' | 'responded' | 'declined';

export interface MatchRow {
  id: string;
  user_id: string;
  idea_id: string | null;
  circle_person_id: string;
  signal_id: string | null;
  stream_id: string | null;
  warm_path: { via?: string | null; context?: string | null } | null;
  rationale: string | null;
  score: number | null;
  state: MatchState;
  surfaced_at: string;
  approved_at: string | null;
  closed_at: string | null;
  closed_reason: string | null;
}

export interface MatchPerson {
  id: string;
  display_name: string;
  company: string | null;
  title: string | null;
  primary_email: string | null;
  linkedin_url: string | null;
}

export interface MatchIdea {
  id: string;
  title: string;
  one_liner: string | null;
}

export interface MatchMove {
  id: string;
  match_id: string;
  channel: MoveChannel;
  state: MoveState;
  draft_subject: string | null;
  draft_body: string;
  final_body: string | null;
}

export interface EnrichedMatch {
  match: MatchRow;
  person: MatchPerson | null;
  idea: MatchIdea | null;
  move: MatchMove | null;
}

const ACTIVE_STATES: MatchState[] = ['new', 'approved', 'edited'];

export const useMatches = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<EnrichedMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data: matches, error } = await supabase
      .from('matches')
      .select('*')
      .eq('user_id', user.id)
      .in('state', ACTIVE_STATES)
      .order('surfaced_at', { ascending: false })
      .limit(30);
    if (error || !matches) {
      setItems([]);
      setLoading(false);
      return;
    }

    const personIds = Array.from(new Set(matches.map((m: MatchRow) => m.circle_person_id).filter(Boolean)));
    const ideaIds = Array.from(new Set(matches.map((m: MatchRow) => m.idea_id).filter(Boolean))) as string[];
    const matchIds = matches.map((m: MatchRow) => m.id);

    const [{ data: people }, { data: ideas }, { data: moves }] = await Promise.all([
      personIds.length
        ? supabase.from('circle_person').select('id, display_name, company, title, primary_email, linkedin_url').in('id', personIds)
        : Promise.resolve({ data: [] as MatchPerson[] }),
      ideaIds.length
        ? supabase.from('ideas').select('id, title, one_liner').in('id', ideaIds)
        : Promise.resolve({ data: [] as MatchIdea[] }),
      matchIds.length
        ? supabase.from('moves').select('id, match_id, channel, state, draft_subject, draft_body, final_body').in('match_id', matchIds)
        : Promise.resolve({ data: [] as MatchMove[] }),
    ]);

    const personById = new Map<string, MatchPerson>((people ?? []).map((p: MatchPerson) => [p.id, p]));
    const ideaById = new Map<string, MatchIdea>((ideas ?? []).map((i: MatchIdea) => [i.id, i]));
    const moveByMatch = new Map<string, MatchMove>((moves ?? []).map((m: MatchMove) => [m.match_id, m]));

    const enriched: EnrichedMatch[] = (matches as MatchRow[]).map((m) => ({
      match: m,
      person: personById.get(m.circle_person_id) ?? null,
      idea: m.idea_id ? ideaById.get(m.idea_id) ?? null : null,
      move: moveByMatch.get(m.id) ?? null,
    }));
    setItems(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateMatchState = useCallback(
    async (matchId: string, state: MatchState, extras?: { closed_reason?: string }) => {
      const patch: Record<string, unknown> = { state };
      if (state === 'approved') patch.approved_at = new Date().toISOString();
      if (state === 'declined' || state === 'cold' || state === 'won') {
        patch.closed_at = new Date().toISOString();
        if (extras?.closed_reason) patch.closed_reason = extras.closed_reason;
      }
      await supabase.from('matches').update(patch).eq('id', matchId);
      await refresh();
    },
    [refresh]
  );

  return { matches: items, loading, refresh, updateMatchState };
};

interface RunResponse {
  matches_created?: number;
  ideas_considered?: number;
  duplicates_skipped?: number;
  note?: string;
  errors?: string[];
  quota_blocked?: boolean;
  quota_limit?: number;
  tier?: 'free' | 'pro' | 'executive';
}

export const runMatchEngine = async (): Promise<RunResponse> => {
  const { data, error } = await supabase.functions.invoke('run-match-engine', { body: {} });
  if (error) throw error;
  return (data as RunResponse) ?? {};
};

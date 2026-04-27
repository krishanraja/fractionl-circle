import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { ContactableRaw } from '@/lib/primaryContact';

export interface CirclePerson {
  id: string;
  display_name: string;
  company: string | null;
  title: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  linkedin_url: string | null;
  handles: {
    linkedin?: string | null;
    instagram?: string | null;
    tiktok?: string | null;
    x?: string | null;
    whatsapp?: string | null;
  } | null;
  avatar_url: string | null;
  tags: string[] | null;
  warmth: number | null;
  last_interaction_at: string | null;
  updated_at: string;
}

const PAGE_LIMIT = 500;
const PERSON_COLUMNS =
  'id, display_name, company, title, primary_email, primary_phone, linkedin_url, handles, avatar_url, tags, warmth, last_interaction_at, updated_at';

interface UseCirclePeopleResult {
  people: CirclePerson[];
  rawsByPerson: Map<string, ContactableRaw[]>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  truncated: boolean;
}

export const useCirclePeople = (search: string = ''): UseCirclePeopleResult => {
  const { user } = useAuth();
  const [people, setPeople] = useState<CirclePerson[]>([]);
  const [rawsByPerson, setRawsByPerson] = useState<Map<string, ContactableRaw[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);

  const trimmed = search.trim();

  const refresh = useCallback(async () => {
    if (!user) {
      setPeople([]);
      setRawsByPerson(new Map());
      setLoading(false);
      setError(null);
      setTruncated(false);
      return;
    }
    setLoading(true);
    setError(null);

    let query = supabase
      .from('circle_person')
      .select(PERSON_COLUMNS)
      .eq('user_id', user.id)
      .order('display_name', { ascending: true })
      .limit(PAGE_LIMIT);

    if (trimmed.length > 0) {
      // Escape % and , which have special meaning in supabase .or() / ilike.
      const safe = trimmed.replace(/[%,]/g, ' ');
      query = query.or(
        `display_name.ilike.%${safe}%,company.ilike.%${safe}%,title.ilike.%${safe}%`
      );
    }

    const { data, error: peopleError } = await query;

    if (peopleError) {
      setError(peopleError.message);
      setPeople([]);
      setRawsByPerson(new Map());
      setLoading(false);
      setTruncated(false);
      return;
    }

    const rows = (data ?? []) as CirclePerson[];
    setPeople(rows);
    setTruncated(rows.length === PAGE_LIMIT);

    const personIds = rows.map((p) => p.id);
    if (personIds.length === 0) {
      setRawsByPerson(new Map());
      setLoading(false);
      return;
    }

    const { data: raws } = await supabase
      .from('person_raw')
      .select('circle_person_id, ingested_at, payload, sources(kind)')
      .in('circle_person_id', personIds)
      .order('ingested_at', { ascending: true });

    const map = new Map<string, ContactableRaw[]>();
    for (const row of (raws ?? []) as Array<{
      circle_person_id: string | null;
      ingested_at: string;
      payload: Record<string, unknown> | null;
      sources: { kind: string | null } | { kind: string | null }[] | null;
    }>) {
      if (!row.circle_person_id) continue;
      const src = Array.isArray(row.sources) ? row.sources[0] : row.sources;
      const entry: ContactableRaw = {
        source_kind: src?.kind ?? null,
        ingested_at: row.ingested_at,
        payload: row.payload,
      };
      const bucket = map.get(row.circle_person_id) ?? [];
      bucket.push(entry);
      map.set(row.circle_person_id, bucket);
    }
    setRawsByPerson(map);
    setLoading(false);
  }, [user, trimmed]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { people, rawsByPerson, loading, error, refresh, truncated };
};

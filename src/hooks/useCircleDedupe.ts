import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Phase 3: LLM-powered Circle dedupe review. Ephemeral - suggestions live in
// memory until the user acts on them. Next `scan()` re-generates fresh.

export interface DedupePerson {
  id: string;
  display_name: string;
  primary_email: string | null;
  primary_phone: string | null;
  linkedin_url: string | null;
  company: string | null;
  title: string | null;
  fingerprint: string | null;
}

export interface DedupeSuggestion {
  a: DedupePerson;
  b: DedupePerson;
  confidence: number;
  rationale: string | null;
  auto_accept: boolean;
}

interface ScanResult {
  suggestions: DedupeSuggestion[];
  scanned: number;
  chunks: number;
}

// Pick the "keeper" deterministically so repeat-accept is idempotent.
// Prefers: has linkedin_url > has primary_email > more non-null fields >
// lexicographic id.
const pickKeeper = (a: DedupePerson, b: DedupePerson): [DedupePerson, DedupePerson] => {
  const score = (p: DedupePerson) => {
    let s = 0;
    if (p.linkedin_url) s += 4;
    if (p.primary_email) s += 2;
    if (p.primary_phone) s += 1;
    if (p.company) s += 1;
    if (p.title) s += 1;
    return s;
  };
  const sa = score(a);
  const sb = score(b);
  if (sa !== sb) return sa > sb ? [a, b] : [b, a];
  return a.id < b.id ? [a, b] : [b, a];
};

export const useCircleDedupe = () => {
  const [suggestions, setSuggestions] = useState<DedupeSuggestion[]>([]);
  const [scanning, setScanning] = useState(false);
  const [merging, setMerging] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<{ scanned: number; chunks: number } | null>(null);

  const scan = useCallback(async (): Promise<ScanResult | null> => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('dedupe-circle', { body: {} });
      if (error) throw error;
      const res = data as ScanResult | null;
      if (!res) return null;
      setSuggestions(res.suggestions ?? []);
      setLastScan({ scanned: res.scanned, chunks: res.chunks });
      return res;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Duplicate scan failed');
      return null;
    } finally {
      setScanning(false);
    }
  }, []);

  const accept = useCallback(async (suggestion: DedupeSuggestion) => {
    const key = suggestionKey(suggestion);
    setMerging(key);
    try {
      const [keep, drop] = pickKeeper(suggestion.a, suggestion.b);
      const { data, error } = await supabase.functions.invoke('merge-persons', {
        body: { keep_id: keep.id, drop_id: drop.id },
      });
      if (error) throw error;
      setSuggestions((prev) => prev.filter((s) => suggestionKey(s) !== key));
      return (data as { kept: string; dropped: string } | null) ?? null;
    } finally {
      setMerging(null);
    }
  }, []);

  const reject = useCallback((suggestion: DedupeSuggestion) => {
    const key = suggestionKey(suggestion);
    setSuggestions((prev) => prev.filter((s) => suggestionKey(s) !== key));
  }, []);

  const reset = useCallback(() => {
    setSuggestions([]);
    setLastScan(null);
  }, []);

  return {
    suggestions,
    scanning,
    merging,
    lastScan,
    scan,
    accept,
    reject,
    reset,
  };
};

export const suggestionKey = (s: DedupeSuggestion): string =>
  [s.a.id, s.b.id].sort().join('::');

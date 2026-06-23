// Client wrapper for the deep LinkedIn enrichment pipeline (enrich-linkedin).
import { supabase } from '@/integrations/supabase/client';

export interface ProfileCandidate {
  name: string;
  headline: string;
  url: string;
  photo_url?: string;
  company?: string;
  title?: string;
  city?: string;
}

export type EnrichResponse =
  | { status: 'done'; dossier: Record<string, unknown>; note: string | null }
  | { status: 'needs_disambiguation'; candidates: ProfileCandidate[] }
  | { status: 'no_keys' }
  | { status: 'failed'; reason?: string };

// Enrich a person. Pass linkedinUrl to skip resolution (e.g. after the user
// picked the right profile). Returns a discriminated status the UI reacts to.
export async function enrichLinkedin(personId: string, linkedinUrl?: string): Promise<EnrichResponse> {
  const { data, error } = await supabase.functions.invoke('enrich-linkedin', {
    body: { person_id: personId, ...(linkedinUrl ? { linkedin_url: linkedinUrl } : {}) },
  });
  if (error) return { status: 'failed', reason: error.message };
  return (data ?? { status: 'failed' }) as EnrichResponse;
}

export const dossierSummary = (dossier: Record<string, unknown> | null | undefined): string | null => {
  if (!dossier) return null;
  const s = dossier.summary ?? dossier.llm_summary;
  return typeof s === 'string' && s.trim() ? s.trim() : null;
};

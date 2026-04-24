// Write path for Circle Ingestion sources.
// Creates a `sources` row, inserts `person_raw`, canonicalizes into
// `circle_person`, and links the raw rows to their canonical person.
// Phase 2b: deterministic fingerprint-based dedupe. LLM dedupe comes in Phase 3.

import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import {
  personFingerprint,
  normalizeName,
  normalizeCompany,
  linkedinSlug,
} from '@/lib/fingerprint';
import type { LinkedInConnection } from '@/lib/linkedinCsv';
import {
  handleForPlatform,
  inferHandlesFromUrl,
  mergeHandles,
  type HandleBlob,
} from '@/lib/handles';

type SourceKind = Database['public']['Enums']['source_kind'];

export interface IngestResult {
  sourceId: string;
  rawInserted: number;
  circleNew: number;
  circleMerged: number;
  skipped: number;
}

interface PersonCandidate {
  fingerprint: string;
  display_name: string;
  primary_email: string | null;
  primary_phone: string | null;
  linkedin_url: string | null;
  company: string | null;
  title: string | null;
  payload: Json;
  external_id: string | null;
  handles?: HandleBlob;
}

// Create a new source row and return its id.
const createSource = async (
  userId: string,
  kind: SourceKind,
  label: string,
): Promise<string> => {
  const { data, error } = await supabase
    .from('sources')
    .insert({
      user_id: userId,
      kind,
      status: 'ingesting',
      label,
    })
    .select('id')
    .single();
  if (error || !data) throw error ?? new Error('Could not create source');
  return data.id;
};

const markSourceActive = async (sourceId: string, count: number) => {
  await supabase
    .from('sources')
    .update({
      status: 'active',
      last_ingested_at: new Date().toISOString(),
      scope_payload: { ingested_count: count },
    })
    .eq('id', sourceId);
};

const markSourceFailed = async (sourceId: string, err: unknown) => {
  await supabase
    .from('sources')
    .update({
      status: 'failed',
      last_error: err instanceof Error ? err.message : String(err),
    })
    .eq('id', sourceId);
};

// Canonicalize + write a batch of PersonCandidates under an existing source.
const writeCandidates = async (
  userId: string,
  sourceId: string,
  candidates: PersonCandidate[],
): Promise<IngestResult> => {
  if (!candidates.length) {
    return { sourceId, rawInserted: 0, circleNew: 0, circleMerged: 0, skipped: 0 };
  }

  // Dedupe within the batch by fingerprint (first occurrence wins).
  const seen = new Set<string>();
  const unique: PersonCandidate[] = [];
  let skipped = 0;
  for (const c of candidates) {
    if (!c.fingerprint) {
      skipped++;
      continue;
    }
    if (seen.has(c.fingerprint)) {
      skipped++;
      continue;
    }
    seen.add(c.fingerprint);
    unique.push(c);
  }

  // Find which fingerprints already exist for this user in circle_person.
  const fingerprints = unique.map((c) => c.fingerprint);
  const existing = await fetchExistingByFingerprint(userId, fingerprints);

  // Partition: merge into existing vs. insert new.
  const toInsert: PersonCandidate[] = [];
  const mergeTargets = new Map<string, string>(); // fingerprint -> existing circle_person.id
  for (const c of unique) {
    const existingId = existing.get(c.fingerprint);
    if (existingId) {
      mergeTargets.set(c.fingerprint, existingId);
    } else {
      toInsert.push(c);
    }
  }

  // Insert the new canonical rows, then map fingerprint -> new id.
  let inserted: { id: string; fingerprint: string | null }[] = [];
  if (toInsert.length) {
    const now = new Date().toISOString();
    const payload = toInsert.map((c) => {
      // Mirror linkedin_url into handles.linkedin so the resolver finds the
      // same value regardless of which field it reads.
      const handles = mergeHandles(
        c.handles,
        c.linkedin_url ? { linkedin: c.linkedin_url } : {},
      );
      const row: Database['public']['Tables']['circle_person']['Insert'] = {
        user_id: userId,
        display_name: c.display_name,
        primary_email: c.primary_email,
        primary_phone: c.primary_phone,
        linkedin_url: c.linkedin_url,
        company: c.company,
        title: c.title,
        fingerprint: c.fingerprint,
        last_interaction_at: now,
      };
      if (Object.keys(handles).length) row.handles = handles;
      return row;
    });
    const { data, error } = await supabase
      .from('circle_person')
      .insert(payload)
      .select('id, fingerprint');
    if (error) throw error;
    inserted = data ?? [];
  }

  const idByFingerprint = new Map<string, string>(mergeTargets);
  for (const row of inserted) {
    if (row.fingerprint) idByFingerprint.set(row.fingerprint, row.id);
  }

  // Handles-merge pass for existing rows: when a re-share brings new IG /
  // TikTok / X URLs for a person who's already in the Circle, splice them
  // into handles without clobbering what's already there.
  const toMergeHandles = unique.filter((c) => {
    const existingId = mergeTargets.get(c.fingerprint);
    if (!existingId) return false;
    return c.handles && Object.keys(c.handles).length > 0;
  });
  if (toMergeHandles.length) {
    const existingIds = Array.from(new Set(toMergeHandles.map((c) => mergeTargets.get(c.fingerprint)!)));
    const { data: existingRows } = await supabase
      .from('circle_person')
      .select('id, fingerprint, handles')
      .eq('user_id', userId)
      .in('id', existingIds);
    const byId = new Map<string, HandleBlob>(
      (existingRows ?? []).map((r) => [r.id, (r.handles as HandleBlob | null) ?? {}])
    );
    for (const c of toMergeHandles) {
      const rowId = mergeTargets.get(c.fingerprint)!;
      const next = mergeHandles(byId.get(rowId) ?? {}, c.handles ?? {});
      await supabase.from('circle_person').update({ handles: next }).eq('id', rowId);
    }
  }

  // Insert person_raw rows linked to their canonical circle_person.
  const rawPayload = unique.map((c) => ({
    user_id: userId,
    source_id: sourceId,
    external_id: c.external_id,
    payload: c.payload,
    fingerprint: c.fingerprint,
    circle_person_id: idByFingerprint.get(c.fingerprint) ?? null,
  }));

  let rawInserted = 0;
  // Batch inserts to keep each request modest. Supabase has a ~1MB row limit.
  const BATCH = 200;
  for (let i = 0; i < rawPayload.length; i += BATCH) {
    const chunk = rawPayload.slice(i, i + BATCH);
    const { error } = await supabase.from('person_raw').insert(chunk);
    if (error) throw error;
    rawInserted += chunk.length;
  }

  return {
    sourceId,
    rawInserted,
    circleNew: inserted.length,
    circleMerged: mergeTargets.size,
    skipped,
  };
};

// Query circle_person for any of the fingerprints we're about to ingest.
const fetchExistingByFingerprint = async (
  userId: string,
  fingerprints: string[],
): Promise<Map<string, string>> => {
  const result = new Map<string, string>();
  if (!fingerprints.length) return result;

  // `in` filter is bounded; chunk large inputs.
  const BATCH = 200;
  for (let i = 0; i < fingerprints.length; i += BATCH) {
    const chunk = fingerprints.slice(i, i + BATCH);
    const { data, error } = await supabase
      .from('circle_person')
      .select('id, fingerprint')
      .eq('user_id', userId)
      .in('fingerprint', chunk);
    if (error) throw error;
    for (const row of data ?? []) {
      if (row.fingerprint) result.set(row.fingerprint, row.id);
    }
  }
  return result;
};

// Map a CrmContact (from lib/crmCsv.ts) to our PersonCandidate shape.
import type { CrmContact, CrmFormat } from '@/lib/crmCsv';

const CRM_SOURCE_KIND: Record<CrmFormat, SourceKind> = {
  linkedin: 'linkedin_csv',
  hubspot: 'legacy_crm_csv',
  attio: 'legacy_crm_csv',
  folk: 'legacy_crm_csv',
  generic: 'sheet_upload',
};

const CRM_LABEL: Record<CrmFormat, string> = {
  linkedin: 'LinkedIn export',
  hubspot: 'HubSpot export',
  attio: 'Attio export',
  folk: 'Folk export',
  generic: 'CSV upload',
};

export const ingestCrmCsv = async (
  userId: string,
  format: CrmFormat,
  contacts: CrmContact[],
): Promise<IngestResult> => {
  const sourceId = await createSource(userId, CRM_SOURCE_KIND[format], CRM_LABEL[format]);
  try {
    const candidates: PersonCandidate[] = contacts
      .map((c): PersonCandidate | null => {
        const fp = personFingerprint({
          name: c.fullName,
          email: c.email,
          linkedinUrl: c.linkedinUrl,
          phone: c.phone,
          company: c.company,
        });
        if (!fp) return null;
        const slug = linkedinSlug(c.linkedinUrl);
        return {
          fingerprint: fp,
          display_name: c.fullName,
          primary_email: c.email,
          primary_phone: c.phone,
          linkedin_url: c.linkedinUrl,
          company: c.company,
          title: c.title,
          payload: {
            first_name: c.firstName,
            last_name: c.lastName,
            full_name: c.fullName,
            email: c.email,
            phone: c.phone,
            company: c.company,
            title: c.title,
            linkedin_url: c.linkedinUrl,
            location: c.location,
            normalized: {
              name: normalizeName(c.fullName),
              company: normalizeCompany(c.company),
            },
            format,
          },
          external_id: slug || c.linkedinUrl || c.email || null,
          handles: c.linkedinUrl ? inferHandlesFromUrl(c.linkedinUrl) : undefined,
        } satisfies PersonCandidate;
      })
      .filter((x): x is PersonCandidate => Boolean(x));

    const result = await writeCandidates(userId, sourceId, candidates);
    await markSourceActive(sourceId, result.rawInserted);
    return result;
  } catch (err) {
    await markSourceFailed(sourceId, err);
    throw err;
  }
};

// Public: ingest a parsed LinkedIn CSV for a user.
export const ingestLinkedInCsv = async (
  userId: string,
  connections: LinkedInConnection[],
): Promise<IngestResult> => {
  const sourceId = await createSource(userId, 'linkedin_csv', 'LinkedIn export');
  try {
    const candidates: PersonCandidate[] = connections
      .map((c): PersonCandidate | null => {
        const fullName = c.fullName || `${c.firstName} ${c.lastName}`.trim();
        const fp = personFingerprint({
          name: fullName,
          email: c.email || null,
          linkedinUrl: c.url || null,
          company: c.company || null,
        });
        if (!fp) return null;
        const slug = linkedinSlug(c.url);
        return {
          fingerprint: fp,
          display_name: fullName,
          primary_email: c.email || null,
          primary_phone: null,
          linkedin_url: c.url || null,
          company: c.company ? c.company.trim() : null,
          title: c.position ? c.position.trim() : null,
          payload: {
            first_name: c.firstName,
            last_name: c.lastName,
            url: c.url,
            email: c.email,
            company: c.company,
            position: c.position,
            connected_on: c.connectedOn,
            normalized: {
              name: normalizeName(fullName),
              company: normalizeCompany(c.company),
            },
          },
          external_id: slug || c.url || null,
        } satisfies PersonCandidate;
      })
      .filter((x): x is PersonCandidate => Boolean(x));

    const result = await writeCandidates(userId, sourceId, candidates);
    await markSourceActive(sourceId, result.rawInserted);
    return result;
  } catch (err) {
    await markSourceFailed(sourceId, err);
    throw err;
  }
};

export interface VoiceSeedPerson {
  name: string;
  hint?: string | null;
  company?: string | null;
  title?: string | null;
}

export interface SharedContactInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  company?: string | null;
  title?: string | null;
  location?: string | null;
  headline?: string | null;
  profile_url?: string | null;
  platform?: string | null;
}

// Public: ingest a single person captured via the OS share sheet
// (PWA share_target or iOS Shortcut). Writes to a new `share_sheet` source
// and returns the resulting circle_person row id.
export const ingestSharedContact = async (
  userId: string,
  input: SharedContactInput,
): Promise<{ sourceId: string; circlePersonId: string | null; result: IngestResult }> => {
  const label = input.platform
    ? `Shared (${input.platform})`
    : 'Shared';
  const sourceId = await createSource(userId, 'share_sheet', label);
  try {
    const name = input.name?.trim();
    if (!name) throw new Error('Name is required');

    const linkedin = input.linkedin_url
      ?? (input.profile_url?.includes('linkedin.com') ? input.profile_url : null);

    const fp = personFingerprint({
      name,
      email: input.email ?? null,
      linkedinUrl: linkedin ?? null,
      phone: input.phone ?? null,
      company: input.company ?? null,
    });
    if (!fp) throw new Error('Not enough signal to identify this person');

    // Resolve a canonical handle for whichever platform the share source
    // reported. Fall back to URL sniffing if the platform tag is missing.
    const platformHandles = handleForPlatform(input.platform ?? null, input.profile_url ?? null, null);
    const inferred = input.profile_url ? inferHandlesFromUrl(input.profile_url) : {};
    const handles = mergeHandles(platformHandles, inferred);
    if (linkedin) Object.assign(handles, { linkedin: handles.linkedin ?? linkedin });

    const candidate: PersonCandidate = {
      fingerprint: fp,
      display_name: name,
      primary_email: input.email?.trim() || null,
      primary_phone: input.phone?.trim() || null,
      linkedin_url: linkedin?.trim() || null,
      company: input.company?.trim() || null,
      title: input.title?.trim() || null,
      payload: {
        name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        linkedin_url: linkedin ?? null,
        profile_url: input.profile_url ?? null,
        company: input.company ?? null,
        title: input.title ?? null,
        location: input.location ?? null,
        headline: input.headline ?? null,
        platform: input.platform ?? null,
      },
      external_id: linkedin ?? input.profile_url ?? null,
      handles: Object.keys(handles).length ? handles : undefined,
    };

    const result = await writeCandidates(userId, sourceId, [candidate]);
    await markSourceActive(sourceId, result.rawInserted);

    // Resolve the circle_person_id the raw row linked to so the caller can
    // navigate directly to the (future) person screen.
    const { data: rawRow } = await supabase
      .from('person_raw')
      .select('circle_person_id')
      .eq('source_id', sourceId)
      .limit(1)
      .maybeSingle();

    return {
      sourceId,
      circlePersonId: (rawRow as { circle_person_id: string | null } | null)?.circle_person_id ?? null,
      result,
    };
  } catch (err) {
    await markSourceFailed(sourceId, err);
    throw err;
  }
};

// Public: ingest a batch of voice-named people under a `voice_seed` source.
export const ingestVoiceSeed = async (
  userId: string,
  people: VoiceSeedPerson[],
): Promise<IngestResult> => {
  const sourceId = await createSource(userId, 'voice_seed', 'Voice seed');
  try {
    const candidates: PersonCandidate[] = people
      .map((p): PersonCandidate | null => {
        const name = p.name?.trim();
        if (!name) return null;
        const fp = personFingerprint({ name, company: p.company || null });
        if (!fp) return null;
        return {
          fingerprint: fp,
          display_name: name,
          primary_email: null,
          primary_phone: null,
          linkedin_url: null,
          company: p.company ? p.company.trim() : null,
          title: p.title ? p.title.trim() : null,
          payload: {
            name,
            hint: p.hint ?? null,
            company: p.company ?? null,
            title: p.title ?? null,
          },
          external_id: null,
        } satisfies PersonCandidate;
      })
      .filter((x): x is PersonCandidate => Boolean(x));

    const result = await writeCandidates(userId, sourceId, candidates);
    await markSourceActive(sourceId, result.rawInserted);
    return result;
  } catch (err) {
    await markSourceFailed(sourceId, err);
    throw err;
  }
};

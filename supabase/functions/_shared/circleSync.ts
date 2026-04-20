// Phase 5/5b: shared canonicalization + write path used by sync-google,
// sync-microsoft, and their cron counterparts. Mirrors the client-side
// fingerprint logic (src/lib/fingerprint.ts) so dedupe is consistent across
// every ingestion path.

// deno-lint-ignore-file no-explicit-any

const STOPWORD_SUFFIXES = new Set([
  'jr', 'sr', 'ii', 'iii', 'iv', 'phd', 'md', 'mba', 'cfa', 'esq',
]);
const PUBLIC_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
  'me.com', 'mac.com', 'aol.com', 'proton.me', 'protonmail.com',
  'live.com', 'msn.com', 'fastmail.com', 'hey.com',
]);

export function normalizeName(name: string | null | undefined): string {
  if (!name) return '';
  return name.toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((tok) => tok && !STOPWORD_SUFFIXES.has(tok))
    .join(' ')
    .trim();
}

export function normalizeCompany(c: string | null | undefined): string {
  if (!c) return '';
  return c.toLowerCase()
    .replace(/\b(inc|incorporated|llc|ltd|limited|gmbh|corp|corporation|co|company|plc)\.?\b/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function emailDomain(email: string | null | undefined): string {
  if (!email) return '';
  const at = email.indexOf('@');
  return at < 0 ? '' : email.slice(at + 1).toLowerCase().trim();
}

export function linkedinSlug(url: string | null | undefined): string {
  if (!url) return '';
  const m = url.match(/linkedin\.com\/in\/([^/?#]+)/i);
  return m ? m[1].toLowerCase() : '';
}

export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D+/g, '');
  if (!digits) return '';
  return digits.length === 10 ? `1${digits}` : digits;
}

export function fingerprint(input: {
  name?: string | null;
  email?: string | null;
  linkedin?: string | null;
  phone?: string | null;
  company?: string | null;
}): string {
  const slug = linkedinSlug(input.linkedin);
  if (slug) return `li:${slug}`;
  const phone = normalizePhone(input.phone);
  if (phone) return `ph:${phone}`;
  const email = input.email?.toLowerCase().trim() ?? '';
  const domain = emailDomain(email);
  if (email && domain && !PUBLIC_DOMAINS.has(domain)) return `em:${email}`;
  const name = normalizeName(input.name);
  const company = normalizeCompany(input.company);
  if (name && company) return `nc:${name}|${company}`;
  if (name && email) return `ne:${name}|${email}`;
  if (name && domain) return `nd:${name}|${domain}`;
  return name ? `n:${name}` : '';
}

export interface Candidate {
  fingerprint: string;
  display_name: string;
  primary_email: string | null;
  primary_phone: string | null;
  linkedin_url: string | null;
  company: string | null;
  title: string | null;
  external_id: string | null;
  payload: Record<string, unknown>;
}

export interface WriteResult {
  inserted: number;
  merged: number;
  raw: number;
  skipped: number;
  idByFingerprint: Map<string, string>;
}

const BATCH = 200;

export async function writeCandidates(
  admin: any,
  userId: string,
  sourceId: string,
  candidates: Candidate[],
): Promise<WriteResult> {
  const seen = new Set<string>();
  const unique: Candidate[] = [];
  let skipped = 0;
  for (const c of candidates) {
    if (!c.fingerprint) { skipped++; continue; }
    if (seen.has(c.fingerprint)) { skipped++; continue; }
    seen.add(c.fingerprint);
    unique.push(c);
  }

  const existing = new Map<string, string>();
  const fps = unique.map((c) => c.fingerprint);
  for (let i = 0; i < fps.length; i += BATCH) {
    const chunk = fps.slice(i, i + BATCH);
    const { data } = await admin
      .from('circle_person')
      .select('id, fingerprint')
      .eq('user_id', userId)
      .in('fingerprint', chunk);
    for (const row of data ?? []) {
      if (row.fingerprint) existing.set(row.fingerprint, row.id);
    }
  }

  const toInsert = unique.filter((c) => !existing.has(c.fingerprint));
  const insertedRows: Array<{ id: string; fingerprint: string | null }> = [];
  if (toInsert.length) {
    const now = new Date().toISOString();
    const payload = toInsert.map((c) => ({
      user_id: userId,
      display_name: c.display_name,
      primary_email: c.primary_email,
      primary_phone: c.primary_phone,
      linkedin_url: c.linkedin_url,
      company: c.company,
      title: c.title,
      fingerprint: c.fingerprint,
      last_interaction_at: now,
    }));
    for (let i = 0; i < payload.length; i += BATCH) {
      const chunk = payload.slice(i, i + BATCH);
      const { data, error } = await admin.from('circle_person').insert(chunk).select('id, fingerprint');
      if (error) throw error;
      insertedRows.push(...(data ?? []));
    }
  }

  const idByFingerprint = new Map<string, string>(existing);
  for (const row of insertedRows) if (row.fingerprint) idByFingerprint.set(row.fingerprint, row.id);

  const rawPayload = unique.map((c) => ({
    user_id: userId,
    source_id: sourceId,
    external_id: c.external_id,
    payload: c.payload,
    fingerprint: c.fingerprint,
    circle_person_id: idByFingerprint.get(c.fingerprint) ?? null,
  }));
  let rawCount = 0;
  for (let i = 0; i < rawPayload.length; i += BATCH) {
    const chunk = rawPayload.slice(i, i + BATCH);
    const { error } = await admin.from('person_raw').insert(chunk);
    if (error) throw error;
    rawCount += chunk.length;
  }

  return {
    inserted: insertedRows.length,
    merged: existing.size,
    raw: rawCount,
    skipped,
    idByFingerprint,
  };
}

// Insert calendar/meeting signals, deduping by source_url. Returns the count
// successfully inserted.
export async function insertMeetingSignals(
  admin: any,
  userId: string,
  rows: Array<{
    circle_person_id: string;
    headline: string;
    source_url: string;
    occurred_at: string | null;
    raw: Record<string, unknown>;
  }>,
): Promise<number> {
  if (!rows.length) return 0;
  const urls = rows.map((s) => s.source_url);
  const seenUrls = new Set<string>();
  for (let i = 0; i < urls.length; i += BATCH) {
    const chunk = urls.slice(i, i + BATCH);
    const { data } = await admin
      .from('signals')
      .select('source_url')
      .eq('user_id', userId)
      .in('source_url', chunk);
    for (const r of data ?? []) seenUrls.add(r.source_url);
  }
  const fresh = rows.filter((r) => !seenUrls.has(r.source_url));
  let inserted = 0;
  const payload = fresh.map((r) => ({
    user_id: userId,
    subject: 'person' as const,
    kind: 'calendar_meeting' as const,
    circle_person_id: r.circle_person_id,
    headline: r.headline,
    detail: null,
    source_url: r.source_url,
    occurred_at: r.occurred_at,
    raw: r.raw,
  }));
  for (let i = 0; i < payload.length; i += BATCH) {
    const chunk = payload.slice(i, i + BATCH);
    const { error } = await admin.from('signals').insert(chunk);
    if (error) throw error;
    inserted += chunk.length;
  }
  return inserted;
}

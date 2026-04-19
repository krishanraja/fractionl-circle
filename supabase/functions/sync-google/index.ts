import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit } from '../_shared/compliance.ts';
import { getValidAccessToken } from '../_shared/googleOauth.ts';

// Phase 5: one-shot sync of Google Contacts, Other Contacts, and Calendar
// events into Circle + Signals. Non-restricted scopes only (see
// _shared/googleOauth.ts for the explicit scope list).

// deno-lint-ignore-file no-explicit-any

const PEOPLE_API = 'https://people.googleapis.com/v1';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

const CALENDAR_LOOKBACK_DAYS = 90;
const CONTACT_PAGE_LIMIT = 2;
const CALENDAR_EVENT_LIMIT = 500;

// Shared fingerprint logic — kept in sync with src/lib/fingerprint.ts.
const STOPWORD_SUFFIXES = new Set([
  'jr', 'sr', 'ii', 'iii', 'iv', 'phd', 'md', 'mba', 'cfa', 'esq',
]);
const PUBLIC_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
  'me.com', 'mac.com', 'aol.com', 'proton.me', 'protonmail.com',
  'live.com', 'msn.com', 'fastmail.com', 'hey.com',
]);

function normalizeName(name: string | null | undefined): string {
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

function normalizeCompany(c: string | null | undefined): string {
  if (!c) return '';
  return c.toLowerCase()
    .replace(/\b(inc|incorporated|llc|ltd|limited|gmbh|corp|corporation|co|company|plc)\.?\b/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function emailDomain(email: string | null | undefined): string {
  if (!email) return '';
  const at = email.indexOf('@');
  return at < 0 ? '' : email.slice(at + 1).toLowerCase().trim();
}

function linkedinSlug(url: string | null | undefined): string {
  if (!url) return '';
  const m = url.match(/linkedin\.com\/in\/([^/?#]+)/i);
  return m ? m[1].toLowerCase() : '';
}

function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D+/g, '');
  if (!digits) return '';
  return digits.length === 10 ? `1${digits}` : digits;
}

function fingerprint(input: {
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

interface Candidate {
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

// ---------------------------------------------------------------------------
// Google API helpers.
// ---------------------------------------------------------------------------

async function gFetch(url: string, accessToken: string): Promise<any> {
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Google ${url.split('?')[0]} -> ${resp.status}: ${txt.slice(0, 200)}`);
  }
  return resp.json();
}

interface PersonApiEntity {
  resourceName?: string;
  names?: Array<{ displayName?: string; unstructuredName?: string }>;
  emailAddresses?: Array<{ value?: string }>;
  phoneNumbers?: Array<{ value?: string }>;
  organizations?: Array<{ name?: string; title?: string }>;
  urls?: Array<{ value?: string; type?: string }>;
}

async function pullContacts(accessToken: string): Promise<PersonApiEntity[]> {
  const all: PersonApiEntity[] = [];
  const personFields = 'names,emailAddresses,phoneNumbers,organizations,urls,metadata';
  let pageToken: string | undefined;
  for (let i = 0; i < CONTACT_PAGE_LIMIT; i++) {
    const qs = new URLSearchParams({
      personFields,
      pageSize: '1000',
      ...(pageToken ? { pageToken } : {}),
    });
    const data = await gFetch(`${PEOPLE_API}/people/me/connections?${qs}`, accessToken);
    if (Array.isArray(data.connections)) all.push(...data.connections);
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return all;
}

async function pullOtherContacts(accessToken: string): Promise<PersonApiEntity[]> {
  const all: PersonApiEntity[] = [];
  const readMask = 'names,emailAddresses,phoneNumbers,metadata';
  let pageToken: string | undefined;
  for (let i = 0; i < CONTACT_PAGE_LIMIT; i++) {
    const qs = new URLSearchParams({
      readMask,
      pageSize: '1000',
      ...(pageToken ? { pageToken } : {}),
    });
    const data = await gFetch(`${PEOPLE_API}/otherContacts?${qs}`, accessToken);
    if (Array.isArray(data.otherContacts)) all.push(...data.otherContacts);
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return all;
}

interface CalendarEvent {
  id?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: Array<{ email?: string; displayName?: string; self?: boolean; responseStatus?: string }>;
  htmlLink?: string;
}

async function pullCalendarEvents(accessToken: string): Promise<CalendarEvent[]> {
  const timeMin = new Date(Date.now() - CALENDAR_LOOKBACK_DAYS * 86_400_000).toISOString();
  const timeMax = new Date().toISOString();
  const qs = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: String(CALENDAR_EVENT_LIMIT),
  });
  const data = await gFetch(`${CALENDAR_API}/calendars/primary/events?${qs}`, accessToken);
  return Array.isArray(data.items) ? data.items : [];
}

// ---------------------------------------------------------------------------
// Mapping API entities -> Candidates.
// ---------------------------------------------------------------------------

function contactToCandidate(p: PersonApiEntity): Candidate | null {
  const name = p.names?.[0]?.displayName ?? p.names?.[0]?.unstructuredName ?? '';
  const email = p.emailAddresses?.[0]?.value ?? null;
  const phone = p.phoneNumbers?.[0]?.value ?? null;
  const org = p.organizations?.[0];
  const company = org?.name ?? null;
  const title = org?.title ?? null;
  const linkedinUrl = p.urls?.find((u) => u.value?.includes('linkedin.com'))?.value ?? null;
  const display = name?.trim();
  if (!display) return null;
  const fp = fingerprint({ name: display, email, linkedin: linkedinUrl, phone, company });
  if (!fp) return null;
  return {
    fingerprint: fp,
    display_name: display,
    primary_email: email,
    primary_phone: phone,
    linkedin_url: linkedinUrl,
    company,
    title,
    external_id: p.resourceName ?? null,
    payload: { resourceName: p.resourceName, raw: p },
  };
}

// ---------------------------------------------------------------------------
// Canonicalization + ingest.
// ---------------------------------------------------------------------------

async function writeCandidates(
  admin: any,
  userId: string,
  sourceId: string,
  candidates: Candidate[],
): Promise<{ inserted: number; merged: number; raw: number; skipped: number; idByFingerprint: Map<string, string> }> {
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
  const BATCH = 200;
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
  let insertedRows: Array<{ id: string; fingerprint: string | null }> = [];
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

// ---------------------------------------------------------------------------
// Entry point.
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { userId } = await requireAuth(req);
    checkRateLimit(`sync-google:${userId}`, 4, 60_000);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const accessToken = await getValidAccessToken(admin, userId);

    // Locate the google source row (created/refreshed during callback).
    const { data: src, error: srcErr } = await admin
      .from('sources')
      .select('id')
      .eq('user_id', userId)
      .eq('kind', 'google')
      .maybeSingle();
    if (srcErr) throw srcErr;
    if (!src) {
      return new Response(JSON.stringify({ error: 'No google source — reconnect first.' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const sourceId = src.id as string;

    await admin.from('sources').update({ status: 'ingesting', last_error: null }).eq('id', sourceId);

    const errors: string[] = [];
    let contactsCandidates: Candidate[] = [];
    let otherCandidates: Candidate[] = [];
    let calendarEvents: CalendarEvent[] = [];

    try {
      const contacts = await pullContacts(accessToken);
      contactsCandidates = contacts.map(contactToCandidate).filter((x): x is Candidate => !!x);
    } catch (e) {
      errors.push(`contacts: ${e instanceof Error ? e.message : String(e)}`);
    }

    try {
      const others = await pullOtherContacts(accessToken);
      otherCandidates = others.map(contactToCandidate).filter((x): x is Candidate => !!x);
    } catch (e) {
      errors.push(`other_contacts: ${e instanceof Error ? e.message : String(e)}`);
    }

    try {
      calendarEvents = await pullCalendarEvents(accessToken);
    } catch (e) {
      errors.push(`calendar: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Write contacts + other contacts (same source row, provenance in payload).
    const allCandidates = [...contactsCandidates, ...otherCandidates];
    const contactResult = await writeCandidates(admin, userId, sourceId, allCandidates);

    // Turn calendar events into person candidates (by attendee email) AND
    // into calendar_meeting signals linked to those persons.
    const attendeeCandidates: Candidate[] = [];
    const eventsForSignals: Array<{ event: CalendarEvent; attendeeFp: string }> = [];
    const userGmail = await (async () => {
      const { data } = await admin
        .from('oauth_tokens')
        .select('scope')
        .eq('user_id', userId)
        .eq('provider', 'google')
        .maybeSingle();
      return data?.scope ?? null;
    })();
    void userGmail; // placeholder for later "exclude self" logic via userinfo email

    for (const event of calendarEvents) {
      if (!Array.isArray(event.attendees)) continue;
      for (const a of event.attendees) {
        if (a.self) continue;
        if (!a.email) continue;
        const display = a.displayName?.trim() || a.email.split('@')[0];
        const fp = fingerprint({ name: display, email: a.email });
        if (!fp) continue;
        attendeeCandidates.push({
          fingerprint: fp,
          display_name: display,
          primary_email: a.email,
          primary_phone: null,
          linkedin_url: null,
          company: null,
          title: null,
          external_id: `gcal:${a.email}`,
          payload: { from_calendar: true, attendee: a },
        });
        eventsForSignals.push({ event, attendeeFp: fp });
      }
    }

    const attendeeResult = await writeCandidates(admin, userId, sourceId, attendeeCandidates);

    // Merge maps so we can look up circle_person_id for the signal rows.
    const idByFingerprint = new Map<string, string>();
    for (const [fp, id] of contactResult.idByFingerprint) idByFingerprint.set(fp, id);
    for (const [fp, id] of attendeeResult.idByFingerprint) idByFingerprint.set(fp, id);

    // Build signal rows, deduping existing ones by (user_id, source_url=event.id).
    const signalsToConsider: Array<{
      user_id: string;
      subject: 'person';
      kind: 'calendar_meeting';
      circle_person_id: string;
      headline: string;
      detail: string | null;
      source_url: string;
      occurred_at: string | null;
      raw: Record<string, unknown>;
    }> = [];
    const seenKey = new Set<string>();
    for (const { event, attendeeFp } of eventsForSignals) {
      const personId = idByFingerprint.get(attendeeFp);
      if (!personId) continue;
      if (!event.id) continue;
      const key = `${personId}::${event.id}`;
      if (seenKey.has(key)) continue;
      seenKey.add(key);
      const occurred = event.start?.dateTime ?? (event.start?.date ? `${event.start.date}T00:00:00Z` : null);
      signalsToConsider.push({
        user_id: userId,
        subject: 'person',
        kind: 'calendar_meeting',
        circle_person_id: personId,
        headline: event.summary?.slice(0, 200) ?? 'Calendar meeting',
        detail: null,
        source_url: event.htmlLink ?? `gcal:${event.id}`,
        occurred_at: occurred,
        raw: { event_id: event.id, summary: event.summary },
      });
    }

    // Upsert-style: skip ones already written.
    let signalsInserted = 0;
    if (signalsToConsider.length) {
      const urls = signalsToConsider.map((s) => s.source_url);
      const { data: existing } = await admin
        .from('signals')
        .select('source_url')
        .eq('user_id', userId)
        .in('source_url', urls);
      const existingUrls = new Set((existing ?? []).map((r: { source_url: string }) => r.source_url));
      const fresh = signalsToConsider.filter((s) => !existingUrls.has(s.source_url));
      for (let i = 0; i < fresh.length; i += 200) {
        const chunk = fresh.slice(i, i + 200);
        const { error } = await admin.from('signals').insert(chunk);
        if (error) {
          errors.push(`signals: ${error.message}`);
          break;
        }
        signalsInserted += chunk.length;
      }
    }

    const rawTotal = contactResult.raw + attendeeResult.raw;
    await admin
      .from('sources')
      .update({
        status: errors.length ? 'active' : 'active',
        last_ingested_at: new Date().toISOString(),
        last_error: errors.length ? errors.join(' | ').slice(0, 500) : null,
        scope_payload: {
          contacts_raw: contactResult.raw,
          calendar_events: calendarEvents.length,
          signals_inserted: signalsInserted,
          circle_new: contactResult.inserted + attendeeResult.inserted,
          circle_merged: contactResult.merged + attendeeResult.merged,
        },
      })
      .eq('id', sourceId);

    return new Response(
      JSON.stringify({
        ok: true,
        circle_new: contactResult.inserted + attendeeResult.inserted,
        circle_merged: contactResult.merged + attendeeResult.merged,
        raw_inserted: rawTotal,
        signals_inserted: signalsInserted,
        calendar_events: calendarEvents.length,
        errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

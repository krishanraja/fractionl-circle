// Phase 5: shared Google sync logic. Both sync-google (auth'd, user-triggered)
// and cron-sync-google (service-role, nightly) call runGoogleSync.

// deno-lint-ignore-file no-explicit-any

import { getValidAccessToken } from './googleOauth.ts';
import {
  fingerprint,
  writeCandidates,
  insertMeetingSignals,
  type Candidate,
} from './circleSync.ts';

const PEOPLE_API = 'https://people.googleapis.com/v1';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

const CALENDAR_LOOKBACK_DAYS = 90;
const CONTACT_PAGE_LIMIT = 2;
const CALENDAR_EVENT_LIMIT = 500;

interface PersonApiEntity {
  resourceName?: string;
  names?: Array<{ displayName?: string; unstructuredName?: string }>;
  emailAddresses?: Array<{ value?: string }>;
  phoneNumbers?: Array<{ value?: string }>;
  organizations?: Array<{ name?: string; title?: string }>;
  urls?: Array<{ value?: string; type?: string }>;
}

interface CalendarEvent {
  id?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: Array<{ email?: string; displayName?: string; self?: boolean }>;
  htmlLink?: string;
}

async function gFetch(url: string, accessToken: string): Promise<any> {
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Google ${url.split('?')[0]} -> ${resp.status}: ${txt.slice(0, 200)}`);
  }
  return resp.json();
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

export interface GoogleSyncResult {
  ok: boolean;
  circle_new: number;
  circle_merged: number;
  raw_inserted: number;
  signals_inserted: number;
  calendar_events: number;
  errors: string[];
}

export async function runGoogleSync(admin: any, userId: string): Promise<GoogleSyncResult> {
  const accessToken = await getValidAccessToken(admin, userId);

  const { data: src, error: srcErr } = await admin
    .from('sources')
    .select('id')
    .eq('user_id', userId)
    .eq('kind', 'google')
    .maybeSingle();
  if (srcErr) throw srcErr;
  if (!src) throw new Error('no_google_source');
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

  const contactResult = await writeCandidates(admin, userId, sourceId, [...contactsCandidates, ...otherCandidates]);

  const attendeeCandidates: Candidate[] = [];
  const eventsForSignals: Array<{ event: CalendarEvent; attendeeFp: string }> = [];
  for (const event of calendarEvents) {
    if (!Array.isArray(event.attendees)) continue;
    for (const a of event.attendees) {
      if (a.self || !a.email) continue;
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

  const idByFingerprint = new Map<string, string>(contactResult.idByFingerprint);
  for (const [fp, id] of attendeeResult.idByFingerprint) idByFingerprint.set(fp, id);

  const signalRows: Array<{
    circle_person_id: string;
    headline: string;
    source_url: string;
    occurred_at: string | null;
    raw: Record<string, unknown>;
  }> = [];
  const seenKey = new Set<string>();
  for (const { event, attendeeFp } of eventsForSignals) {
    const personId = idByFingerprint.get(attendeeFp);
    if (!personId || !event.id) continue;
    const key = `${personId}::${event.id}`;
    if (seenKey.has(key)) continue;
    seenKey.add(key);
    signalRows.push({
      circle_person_id: personId,
      headline: event.summary?.slice(0, 200) ?? 'Calendar meeting',
      source_url: event.htmlLink ?? `gcal:${event.id}`,
      occurred_at: event.start?.dateTime ?? (event.start?.date ? `${event.start.date}T00:00:00Z` : null),
      raw: { event_id: event.id, summary: event.summary },
    });
  }

  let signalsInserted = 0;
  try {
    signalsInserted = await insertMeetingSignals(admin, userId, signalRows);
  } catch (e) {
    errors.push(`signals: ${e instanceof Error ? e.message : String(e)}`);
  }

  const rawTotal = contactResult.raw + attendeeResult.raw;
  await admin
    .from('sources')
    .update({
      status: 'active',
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

  return {
    ok: true,
    circle_new: contactResult.inserted + attendeeResult.inserted,
    circle_merged: contactResult.merged + attendeeResult.merged,
    raw_inserted: rawTotal,
    signals_inserted: signalsInserted,
    calendar_events: calendarEvents.length,
    errors,
  };
}

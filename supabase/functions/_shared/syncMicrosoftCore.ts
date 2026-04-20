// Phase 5b: shared Microsoft Graph sync logic. Mirrors syncGoogleCore.ts.

// deno-lint-ignore-file no-explicit-any

import { getValidMsAccessToken } from './microsoftOauth.ts';
import {
  fingerprint,
  writeCandidates,
  insertMeetingSignals,
  type Candidate,
} from './circleSync.ts';

const GRAPH_API = 'https://graph.microsoft.com/v1.0';

const CALENDAR_LOOKBACK_DAYS = 90;
const CONTACT_PAGE_LIMIT = 4;        // 4 pages of 250 = 1000 contacts
const CALENDAR_EVENT_LIMIT = 500;
const CONTACT_PAGE_SIZE = 250;

interface MsContact {
  id?: string;
  displayName?: string;
  givenName?: string;
  surname?: string;
  emailAddresses?: Array<{ address?: string; name?: string }>;
  homePhones?: string[];
  businessPhones?: string[];
  mobilePhone?: string;
  companyName?: string;
  jobTitle?: string;
  // The 'profession' field sometimes carries a LinkedIn URL when synced from
  // a CRM connector — opportunistic only.
  profession?: string;
}

interface MsCalendarEvent {
  id?: string;
  subject?: string;
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string; timeZone?: string };
  attendees?: Array<{
    emailAddress?: { address?: string; name?: string };
    type?: string;
    status?: { response?: string };
  }>;
  webLink?: string;
  organizer?: { emailAddress?: { address?: string } };
}

async function gFetch(url: string, accessToken: string): Promise<any> {
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Graph ${url.split('?')[0]} -> ${resp.status}: ${txt.slice(0, 200)}`);
  }
  return resp.json();
}

async function pullContacts(accessToken: string): Promise<MsContact[]> {
  const all: MsContact[] = [];
  let next: string | null = `${GRAPH_API}/me/contacts?$top=${CONTACT_PAGE_SIZE}&$select=id,displayName,givenName,surname,emailAddresses,businessPhones,mobilePhone,companyName,jobTitle`;
  let pages = 0;
  while (next && pages < CONTACT_PAGE_LIMIT) {
    const data = await gFetch(next, accessToken);
    if (Array.isArray(data.value)) all.push(...data.value);
    next = data['@odata.nextLink'] ?? null;
    pages++;
  }
  return all;
}

async function pullCalendarEvents(accessToken: string): Promise<MsCalendarEvent[]> {
  const start = new Date(Date.now() - CALENDAR_LOOKBACK_DAYS * 86_400_000).toISOString();
  const end = new Date().toISOString();
  const url = `${GRAPH_API}/me/calendarview?startDateTime=${start}&endDateTime=${end}&$top=${CALENDAR_EVENT_LIMIT}&$select=id,subject,start,end,attendees,webLink,organizer`;
  const data = await gFetch(url, accessToken);
  return Array.isArray(data.value) ? data.value : [];
}

function contactToCandidate(c: MsContact): Candidate | null {
  const display = c.displayName?.trim()
    ?? [c.givenName, c.surname].filter(Boolean).join(' ').trim();
  if (!display) return null;
  const email = c.emailAddresses?.[0]?.address ?? null;
  const phone = c.mobilePhone ?? c.businessPhones?.[0] ?? c.homePhones?.[0] ?? null;
  const company = c.companyName ?? null;
  const title = c.jobTitle ?? null;
  const linkedin = (c.profession && c.profession.includes('linkedin.com')) ? c.profession : null;
  const fp = fingerprint({ name: display, email, linkedin, phone, company });
  if (!fp) return null;
  return {
    fingerprint: fp,
    display_name: display,
    primary_email: email,
    primary_phone: phone,
    linkedin_url: linkedin,
    company,
    title,
    external_id: c.id ? `msc:${c.id}` : null,
    payload: { id: c.id, raw: c },
  };
}

export interface MsSyncResult {
  ok: boolean;
  circle_new: number;
  circle_merged: number;
  raw_inserted: number;
  signals_inserted: number;
  calendar_events: number;
  errors: string[];
}

export async function runMicrosoftSync(admin: any, userId: string): Promise<MsSyncResult> {
  const accessToken = await getValidMsAccessToken(admin, userId);

  const { data: src, error: srcErr } = await admin
    .from('sources')
    .select('id')
    .eq('user_id', userId)
    .eq('kind', 'microsoft')
    .maybeSingle();
  if (srcErr) throw srcErr;
  if (!src) throw new Error('no_microsoft_source');
  const sourceId = src.id as string;

  await admin.from('sources').update({ status: 'ingesting', last_error: null }).eq('id', sourceId);

  const errors: string[] = [];
  let contactsCandidates: Candidate[] = [];
  let calendarEvents: MsCalendarEvent[] = [];

  try {
    const contacts = await pullContacts(accessToken);
    contactsCandidates = contacts.map(contactToCandidate).filter((x): x is Candidate => !!x);
  } catch (e) {
    errors.push(`contacts: ${e instanceof Error ? e.message : String(e)}`);
  }
  try {
    calendarEvents = await pullCalendarEvents(accessToken);
  } catch (e) {
    errors.push(`calendar: ${e instanceof Error ? e.message : String(e)}`);
  }

  const contactResult = await writeCandidates(admin, userId, sourceId, contactsCandidates);

  const attendeeCandidates: Candidate[] = [];
  const eventsForSignals: Array<{ event: MsCalendarEvent; attendeeFp: string }> = [];
  for (const event of calendarEvents) {
    if (!Array.isArray(event.attendees)) continue;
    for (const a of event.attendees) {
      const email = a.emailAddress?.address;
      const display = a.emailAddress?.name?.trim() || email?.split('@')[0];
      if (!email || !display) continue;
      const fp = fingerprint({ name: display, email });
      if (!fp) continue;
      attendeeCandidates.push({
        fingerprint: fp,
        display_name: display,
        primary_email: email,
        primary_phone: null,
        linkedin_url: null,
        company: null,
        title: null,
        external_id: `mscal:${email}`,
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
      headline: event.subject?.slice(0, 200) ?? 'Calendar meeting',
      source_url: event.webLink ?? `mscal:${event.id}`,
      occurred_at: event.start?.dateTime ?? null,
      raw: { event_id: event.id, subject: event.subject },
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

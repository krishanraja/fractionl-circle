// Track B (flagged off): write the weekly "warm reach" hold straight onto the
// user's Google Calendar via the Calendar API, instead of attaching an .ics for
// them to import. Requires the calendar.events (write) scope, which is gated
// behind GOOGLE_CALENDAR_WRITE_ENABLED and only takes effect once the sensitive
// scope clears Google verification. Idempotent: a deterministic event id per
// user means each weekly run upserts the same hold rather than stacking copies.
//
// Fully defensive: every failure path returns false so the caller falls back to
// the .ics attachment. Nothing here runs in production until the flag is on.

// deno-lint-ignore-file no-explicit-any
import { getValidAccessToken } from './googleOauth.ts';

const CAL_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary';

interface HoldPerson {
  name: string;
  company: string | null;
  why_now: string;
}

const two = (n: number): string => String(n).padStart(2, '0');

// Next Monday's date (UTC basis); time is applied as wall-clock in the
// calendar's own timezone via the API's timeZone field.
const nextMondayDate = (now: Date): string => {
  const d = new Date(now);
  const delta = ((8 - d.getUTCDay()) % 7) || 7;
  d.setUTCDate(d.getUTCDate() + delta);
  return `${d.getUTCFullYear()}-${two(d.getUTCMonth() + 1)}-${two(d.getUTCDate())}`;
};

// Calendar event ids must be base32hex (0-9, a-v). A dash-stripped UUID is hex
// (0-9a-f) and the "frac" prefix stays within a-v, so this is always valid.
const holdEventId = (userId: string): string => `frac${userId.replace(/-/g, '')}`;

async function calendarTimeZone(accessToken: string): Promise<string> {
  try {
    const r = await fetch(CAL_BASE, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!r.ok) return 'UTC';
    const j = await r.json();
    return j?.timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export async function writeWarmReachHold(
  admin: any,
  userId: string,
  people: HoldPerson[],
  now: Date,
  appUrl: string,
): Promise<boolean> {
  let accessToken: string;
  try {
    accessToken = await getValidAccessToken(admin, userId);
  } catch {
    return false; // no Google connection / no valid token
  }

  const tz = await calendarTimeZone(accessToken);
  const date = nextMondayDate(now);
  const names = people.map((p) => `• ${p.name}${p.company ? ` (${p.company})` : ''} - ${p.why_now}`).join('\n');
  const body = {
    summary: 'Warm reach - keep your circle warm',
    description: `Reach out to the people going quiet in your circle:\n\n${names}\n\nOpen your circle: ${appUrl}`,
    start: { dateTime: `${date}T09:00:00`, timeZone: tz },
    end: { dateTime: `${date}T09:20:00`, timeZone: tz },
    recurrence: ['RRULE:FREQ=WEEKLY'],
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 10 }] },
  };
  const id = holdEventId(userId);

  // Upsert: try insert with our fixed id; on 409 (already there) patch instead.
  try {
    const ins = await fetch(`${CAL_BASE}/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...body }),
    });
    if (ins.ok) return true;
    if (ins.status === 409) {
      const patch = await fetch(`${CAL_BASE}/events/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return patch.ok;
    }
    return false;
  } catch {
    return false;
  }
}

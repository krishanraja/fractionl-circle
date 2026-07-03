import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { buildWarmDigestForUser, type DigestPerson } from '../_shared/warmDigestCore.ts';
import { writeWarmReachHold } from '../_shared/googleCalendar.ts';
import { buildBriefForUser, type ChiefOfStaffBrief } from '../_shared/brief.ts';

// Weekly "keep your circle warm" digest. Service-role auth via CRON_SECRET.
// For each eligible user it builds the cohort (warmDigestCore) and delivers the
// reminder INTO the tools they already use:
//   - an email (Resend) with each person, why-now, a ready-to-send draft, and a
//     one-tap prefilled mailto so the action happens in their own inbox;
//   - an .ics attachment that drops a recurring "warm reach" hold on their
//     calendar with NO calendar-write scope required;
//   - a Web Push ping for users who keep the app installed.
// Inert by design: if Resend is unconfigured email is skipped (push still fires);
// if VAPID is unconfigured push is a no-op. Nothing here throws on a missing key.
//
// Chief of Staff tier: executive subscribers get the full Monday brief on top of
// the people - where they stand (the same 0-100 as Home), their market this week
// (honest Pulse numbers), and the one decision question of the week - composed by
// _shared/brief.ts from brains that already exist. Their email sends even when
// nobody is going quiet, because the brief carries value on its own.
// Every send lands a delivery_log row so "did Monday's email go out?" is
// answerable from inside the system.

const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('WARM_DIGEST_FROM_EMAIL') ?? Deno.env.get('CONCIERGE_FROM_EMAIL') ?? 'circle@fractionl.ai';
const APP_URL = Deno.env.get('APP_URL') ?? 'https://circle.fractionl.ai';
// Track B (flagged off): when on, write the warm-reach hold straight onto the
// user's Google Calendar (needs the calendar.events write scope + verification)
// instead of attaching an .ics. Off => current .ics behavior, no change.
const NATIVE_CALENDAR = (Deno.env.get('WARM_DIGEST_NATIVE_CALENDAR') ?? '').toLowerCase() === 'true';

const MAX_USERS_PER_RUN = 500;

// ── helpers ────────────────────────────────────────────────────────────────

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const mailtoFor = (p: DigestPerson): string | null => {
  if (!p.email) return null;
  // Hand-encode so spaces become %20 and newlines %0A - mail clients render a
  // URLSearchParams "+" as a literal plus in the body.
  return `mailto:${encodeURIComponent(p.email)}?subject=${encodeURIComponent(p.subject)}&body=${encodeURIComponent(p.message)}`;
};

// RFC 5545 text escaping for ICS values.
const icsText = (s: string): string =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

const two = (n: number): string => String(n).padStart(2, '0');

// Next Monday 09:00, floating local time (no Z / TZID) so each user's calendar
// places the hold in their own morning.
const nextMondayNine = (now: Date): { start: string; end: string } => {
  const d = new Date(now);
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const delta = ((8 - day) % 7) || 7; // always the upcoming Monday
  d.setDate(d.getDate() + delta);
  const stamp = (h: number, m: number) =>
    `${d.getFullYear()}${two(d.getMonth() + 1)}${two(d.getDate())}T${two(h)}${two(m)}00`;
  return { start: stamp(9, 0), end: stamp(9, 20) };
};

const buildIcs = (people: DigestPerson[], now: Date, uidSeed: string): string => {
  const { start, end } = nextMondayNine(now);
  const dtstamp = `${now.getUTCFullYear()}${two(now.getUTCMonth() + 1)}${two(now.getUTCDate())}T${two(now.getUTCHours())}${two(now.getUTCMinutes())}${two(now.getUTCSeconds())}Z`;
  const names = people.map((p) => `• ${p.name}${p.company ? ` (${p.company})` : ''} - ${p.why_now}`).join('\n');
  const desc = icsText(`Reach out to the people going quiet in your circle:\n\n${names}\n\nOpen your circle: ${APP_URL}`);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fractionl//Warm Reach//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:warm-reach-${uidSeed}@fractionl.ai`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    'RRULE:FREQ=WEEKLY',
    'SUMMARY:Warm reach - keep your circle warm',
    `DESCRIPTION:${desc}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT10M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Warm reach',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
};

const toBase64 = (s: string): string => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
};

const personCard = (p: DigestPerson): string => {
  const sub = [p.title, p.company].filter(Boolean).join(' · ');
  const mailto = mailtoFor(p);
  const action = mailto
    ? `<a href="${esc(mailto)}" style="display:inline-block;background:#E0982A;color:#fff;text-decoration:none;padding:8px 14px;border-radius:8px;font-weight:600">Open in email →</a>`
    : (p.linkedin_url
        ? `<a href="${esc(p.linkedin_url)}" style="display:inline-block;background:#E0982A;color:#fff;text-decoration:none;padding:8px 14px;border-radius:8px;font-weight:600">Message on LinkedIn →</a>`
        : '');
  return `
<div style="border:1px solid #eee;border-radius:12px;padding:16px;margin:0 0 14px">
  <div style="font-size:16px;font-weight:700;color:#1a1a1a">${esc(p.name)}</div>
  ${sub ? `<div style="font-size:13px;color:#666;margin-top:2px">${esc(sub)}</div>` : ''}
  <div style="font-size:13px;color:#9a6a16;margin:8px 0">${esc(p.why_now)}</div>
  <div style="font-size:14px;color:#333;white-space:pre-wrap;background:#faf8f4;border-radius:8px;padding:12px;margin:8px 0">${esc(p.message)}</div>
  ${action}
</div>`;
};

// The Chief of Staff sections, rendered above the people cards for executive
// subscribers. Every number comes from the product's own state or Pulse - the
// brief never invents a figure.
const briefSections = (b: ChiefOfStaffBrief): string => {
  const pending = b.provisional > 0 ? ` <span style="color:#9a6a16">(+${b.provisional} pending)</span>` : '';
  const holding = b.weakestLabel
    ? `Weakest right now: ${esc(b.weakestLabel)}.`
    : 'Strong across the board. Lock it in with a re-read.';
  const decisions = [
    b.bankedCount ? `${b.bankedCount} decision${b.bankedCount === 1 ? '' : 's'} banked, folds into your next read` : null,
    b.decidedCount ? `${b.decidedCount} locked in` : null,
  ].filter(Boolean).join(' · ');
  return `
<div style="border:1px solid #eee;border-radius:12px;padding:16px;margin:0 0 14px">
  <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#9a6a16;font-weight:700">Where you stand</div>
  <div style="font-size:26px;font-weight:700;color:#1a1a1a;margin-top:6px">${b.score}<span style="font-size:14px;color:#666;font-weight:400">/100 strength</span>${pending}</div>
  <div style="font-size:13px;color:#333;margin-top:4px">${holding}</div>
  ${decisions ? `<div style="font-size:13px;color:#666;margin-top:4px">${esc(decisions)}</div>` : ''}
  ${b.nextMove ? `<div style="font-size:13px;color:#333;margin-top:8px"><strong>Next move:</strong> ${esc(b.nextMove)}</div>` : ''}
</div>
${b.marketLines.length ? `
<div style="border:1px solid #eee;border-radius:12px;padding:16px;margin:0 0 14px">
  <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#9a6a16;font-weight:700">Your market this week</div>
  ${b.marketLines.map((l) => `<div style="font-size:14px;color:#333;margin-top:8px">${esc(l)}</div>`).join('')}
</div>` : ''}
<div style="border:1px solid #eee;border-radius:12px;padding:16px;margin:0 0 14px">
  <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#9a6a16;font-weight:700">${b.redteam ? 'This week: the case against' : "This week's decision"}</div>
  <div style="font-size:15px;font-weight:600;color:#1a1a1a;margin-top:8px">${esc(b.question.question)}</div>
  ${b.question.options.map((o) => `<div style="font-size:13px;color:#666;margin-top:6px">· ${esc(o)}</div>`).join('')}
  <a href="${esc(APP_URL)}" style="display:inline-block;background:#E0982A;color:#fff;text-decoration:none;padding:8px 14px;border-radius:8px;font-weight:600;margin-top:10px">Decide in Circle →</a>
</div>`;
};

const buildEmailHtml = (people: DigestPerson[], brief: ChiefOfStaffBrief | null): string => `
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h1 style="font-size:22px;margin:0 0 4px">${brief ? 'Your Monday brief' : 'Keep your circle warm'}</h1>
  ${brief ? `<p style="font-size:14px;color:#666;margin:0 0 20px">Where you stand, your market, this week's decision - and the people to keep warm.</p>${briefSections(brief)}` : ''}
  ${people.length ? `
  ${brief ? `<h2 style="font-size:16px;margin:18px 0 4px">Keep your circle warm</h2>` : ''}
  <p style="font-size:14px;color:#666;margin:0 0 20px">${people.length} ${people.length === 1 ? 'person is' : 'people are'} going quiet. A short touch now keeps the relationship alive. Each draft is ready to send - tap to open it in your inbox.</p>
  ${people.map(personCard).join('')}` : (brief ? `<p style="font-size:14px;color:#666;margin:0 0 20px">Nobody in your circle is going quiet this week.</p>` : '')}
  <p style="font-size:12px;color:#999;margin-top:20px">${people.length ? 'The attached calendar hold puts a recurring 20-minute warm-reach block on your calendar. ' : ''}<a href="${esc(APP_URL)}" style="color:#9a6a16">Open your circle</a> · manage this email in settings.</p>
</div>`;

async function sendDigestEmail(to: string, people: DigestPerson[], ics: string | null, brief: ChiefOfStaffBrief | null): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  const subject = brief
    ? `Your Monday brief: ${brief.score}/100${people.length ? `, ${people.length} going quiet` : ''}`
    : people.length === 1
      ? `1 person in your circle is going cold`
      : `${people.length} people in your circle are going cold`;
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html: buildEmailHtml(people, brief),
      // Skip the .ics when the hold was written natively to the calendar.
      ...(ics ? { attachments: [{ filename: 'warm-reach.ics', content: toBase64(ics) }] } : {}),
    }),
  });
  if (!resp.ok) {
    console.warn('warm-digest email failed', resp.status, await resp.text().catch(() => ''));
    return false;
  }
  return true;
}

async function firePush(userId: string, count: number, brief: ChiefOfStaffBrief | null): Promise<void> {
  await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      title: brief ? 'Your Monday brief is ready' : 'Keep your circle warm',
      body: brief
        ? `You're at ${brief.score}/100${count ? ` and ${count} ${count === 1 ? 'person is' : 'people are'} going quiet` : ''}.`
        : count === 1 ? 'Someone worth reaching is going quiet.' : `${count} people worth reaching are going quiet.`,
      url: `${APP_URL}/`,
    }),
  });
}

// Best-effort observability: one row per outbound send attempt. Never blocks
// delivery - a failed log write is a warning, not an error.
async function logDelivery(admin: any, userId: string, kind: 'warm_digest' | 'brief', channel: 'email' | 'push', status: 'sent' | 'failed', detail?: string): Promise<void> {
  try {
    await admin.from('delivery_log').insert({ user_id: userId, kind, channel, status, detail: detail ?? null });
  } catch (e) {
    console.warn('delivery_log write failed', e instanceof Error ? e.message : e);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const secret = req.headers.get('x-cron-secret') ?? '';
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Eligible = has at least one circle person (otherwise there is nothing to
  // keep warm). De-dupe in code.
  const { data: circleUsers, error: circleErr } = await admin
    .from('circle_person')
    .select('user_id')
    .limit(50_000);
  if (circleErr) {
    return new Response(JSON.stringify({ error: circleErr.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  const targetUsers = Array.from(
    new Set((circleUsers ?? []).map((r: { user_id: string }) => r.user_id)),
  ).slice(0, MAX_USERS_PER_RUN);

  // Chief of Staff (executive) subscribers get the full Monday brief.
  const executiveIds = new Set<string>();
  try {
    const { data: subs } = await admin
      .from('subscriptions')
      .select('user_id, tier, status')
      .eq('tier', 'executive')
      .in('status', ['active', 'trialing']);
    for (const s of (subs ?? []) as Array<{ user_id: string }>) executiveIds.add(s.user_id);
  } catch (e) {
    console.warn('subscriptions lookup failed; briefs skipped this run', e instanceof Error ? e.message : e);
  }

  const now = new Date();
  let emailed = 0;
  let pushed = 0;
  let briefs = 0;
  let skippedEmpty = 0;
  let optedOut = 0;
  let emailSuppressed = 0;
  let calendarWritten = 0;
  const errors: Array<{ user_id: string; message: string }> = [];

  for (const userId of targetUsers) {
    try {
      // warm_digest is the feature's master switch. The per-channel switches
      // (email_notifications, browser_notifications) gate delivery surfaces
      // independently, so turning off email never silences push and vice versa.
      const { data: prefs } = await admin
        .from('user_preferences')
        .select('warm_digest, email_notifications, browser_notifications')
        .eq('user_id', userId)
        .maybeSingle();
      if (prefs && prefs.warm_digest === false) { optedOut++; continue; }

      const digest = await buildWarmDigestForUser(userId, admin, now.getTime());

      // Executive subscribers get the chief-of-staff brief (null when they have
      // no read yet, which falls back to the people-only digest).
      let brief: ChiefOfStaffBrief | null = null;
      if (executiveIds.has(userId)) {
        try { brief = await buildBriefForUser(userId, admin); } catch { /* people-only */ }
      }
      if (brief) briefs++;

      // Nothing to say at all: no brief and nobody going quiet. Never send empty.
      if (!digest.people.length && !brief) { skippedEmpty++; continue; }

      const kind: 'warm_digest' | 'brief' = brief ? 'brief' : 'warm_digest';

      // Native calendar hold (flagged). On success the email drops the .ics so
      // the user does not get a duplicate. Any failure falls back to the .ics.
      let nativeCal = false;
      if (NATIVE_CALENDAR && digest.people.length) {
        try {
          nativeCal = await writeWarmReachHold(admin, userId, digest.people, now, APP_URL);
          if (nativeCal) calendarWritten++;
        } catch { /* fall back to the .ics attachment */ }
      }

      // Push reaches app users who have no inbox set; naturally gated by having a
      // subscription, plus the browser_notifications preference.
      if (!prefs || prefs.browser_notifications !== false) {
        try {
          await firePush(userId, digest.people.length, brief);
          pushed++;
          await logDelivery(admin, userId, kind, 'push', 'sent');
        } catch (e) {
          console.warn('warm-digest push failed', e instanceof Error ? e.message : e);
          await logDelivery(admin, userId, kind, 'push', 'failed', e instanceof Error ? e.message : String(e));
        }
      }

      // Email goes out unless the user has turned off email globally.
      if (!prefs || prefs.email_notifications !== false) {
        const { data: userLookup } = await admin.auth.admin.getUserById(userId);
        const email = userLookup?.user?.email ?? null;
        if (email) {
          const ics = !nativeCal && digest.people.length ? buildIcs(digest.people, now, `${userId}`) : null;
          if (await sendDigestEmail(email, digest.people, ics, brief)) {
            emailed++;
            await logDelivery(admin, userId, kind, 'email', 'sent');
          } else {
            await logDelivery(admin, userId, kind, 'email', 'failed');
          }
        }
      } else {
        emailSuppressed++;
      }
    } catch (e) {
      errors.push({ user_id: userId, message: e instanceof Error ? e.message : String(e) });
    }
  }

  return new Response(JSON.stringify({
    target_users: targetUsers.length,
    emailed,
    pushed,
    briefs,
    skipped_empty: skippedEmpty,
    opted_out: optedOut,
    email_suppressed: emailSuppressed,
    calendar_written: calendarWritten,
    native_calendar: NATIVE_CALENDAR,
    email_configured: !!RESEND_API_KEY,
    errors,
    at: now.toISOString(),
  }), { headers: { 'Content-Type': 'application/json' } });
});

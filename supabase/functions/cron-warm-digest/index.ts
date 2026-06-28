import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { buildWarmDigestForUser, type DigestPerson } from '../_shared/warmDigestCore.ts';

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

const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('WARM_DIGEST_FROM_EMAIL') ?? Deno.env.get('CONCIERGE_FROM_EMAIL') ?? 'circle@fractionl.ai';
const APP_URL = Deno.env.get('APP_URL') ?? 'https://circle.fractionl.ai';

const MAX_USERS_PER_RUN = 500;

// ── helpers ────────────────────────────────────────────────────────────────

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const mailtoFor = (p: DigestPerson): string | null => {
  if (!p.email) return null;
  // Hand-encode so spaces become %20 and newlines %0A — mail clients render a
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
  const names = people.map((p) => `• ${p.name}${p.company ? ` (${p.company})` : ''} — ${p.why_now}`).join('\n');
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
    'SUMMARY:Warm reach — keep your circle warm',
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

const buildEmailHtml = (people: DigestPerson[]): string => `
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h1 style="font-size:22px;margin:0 0 4px">Keep your circle warm</h1>
  <p style="font-size:14px;color:#666;margin:0 0 20px">${people.length} ${people.length === 1 ? 'person is' : 'people are'} going quiet. A short touch now keeps the relationship alive. Each draft is ready to send — tap to open it in your inbox.</p>
  ${people.map(personCard).join('')}
  <p style="font-size:12px;color:#999;margin-top:20px">The attached calendar hold puts a recurring 20-minute warm-reach block on your calendar. <a href="${esc(APP_URL)}" style="color:#9a6a16">Open your circle</a> · manage this email in settings.</p>
</div>`;

async function sendDigestEmail(to: string, people: DigestPerson[], ics: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  const subject = people.length === 1
    ? `1 person in your circle is going cold`
    : `${people.length} people in your circle are going cold`;
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html: buildEmailHtml(people),
      attachments: [{ filename: 'warm-reach.ics', content: toBase64(ics) }],
    }),
  });
  if (!resp.ok) {
    console.warn('warm-digest email failed', resp.status, await resp.text().catch(() => ''));
    return false;
  }
  return true;
}

async function firePush(userId: string, count: number): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        title: 'Keep your circle warm',
        body: count === 1 ? 'Someone worth reaching is going quiet.' : `${count} people worth reaching are going quiet.`,
        url: `${APP_URL}/`,
      }),
    });
  } catch (e) {
    console.warn('warm-digest push failed', e instanceof Error ? e.message : e);
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

  const now = new Date();
  let emailed = 0;
  let pushed = 0;
  let skippedEmpty = 0;
  let optedOut = 0;
  let emailSuppressed = 0;
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
      if (!digest.people.length) { skippedEmpty++; continue; }

      // Push reaches app users who have no inbox set; naturally gated by having a
      // subscription, plus the browser_notifications preference.
      if (!prefs || prefs.browser_notifications !== false) {
        await firePush(userId, digest.people.length);
        pushed++;
      }

      // Email goes out unless the user has turned off email globally.
      if (!prefs || prefs.email_notifications !== false) {
        const { data: userLookup } = await admin.auth.admin.getUserById(userId);
        const email = userLookup?.user?.email ?? null;
        if (email) {
          const ics = buildIcs(digest.people, now, `${userId}`);
          if (await sendDigestEmail(email, digest.people, ics)) emailed++;
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
    skipped_empty: skippedEmpty,
    opted_out: optedOut,
    email_suppressed: emailSuppressed,
    email_configured: !!RESEND_API_KEY,
    errors,
    at: now.toISOString(),
  }), { headers: { 'Content-Type': 'application/json' } });
});

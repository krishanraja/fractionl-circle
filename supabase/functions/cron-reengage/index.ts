import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

// Weekly "come back - here's what's waiting" re-engagement sweep. Service-role
// auth via CRON_SECRET. It finds people who onboarded but have drifted (active
// 5–21 days ago - inactive but not abandoned) and, only when there is something
// genuinely waiting for them, nudges them back into the app:
//   - an email (Resend) in plain, warm language naming what's waiting;
//   - a Web Push ping for users who keep the app installed.
//
// Inert by design: if Resend is unconfigured email is skipped and counted (push
// still fires); if VAPID is unconfigured push is a no-op (send-push handles
// that). Nothing here throws on a missing key. We NEVER send an empty nudge:
// a user with nothing genuinely waiting is skipped entirely.

const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('WARM_DIGEST_FROM_EMAIL') ?? Deno.env.get('CONCIERGE_FROM_EMAIL') ?? 'circle@fractionl.ai';
const APP_URL = Deno.env.get('APP_URL') ?? 'https://circle.fractionl.ai';

const MAX_USERS_PER_RUN = 500;

// Drifted = onboarded, last active between 5 and 21 days ago. Below 5 days they
// are still around; beyond 21 they have abandoned and a nudge reads as nagging.
const MIN_INACTIVE_DAYS = 5;
const MAX_INACTIVE_DAYS = 21;
const DAY_MS = 24 * 60 * 60 * 1000;

// ── helpers ────────────────────────────────────────────────────────────────

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

interface Hooks {
  quiet: number;   // circle people going quiet (no touch in 30+ days)
  banked: number;  // decisions made but not yet folded into a fresh read
}

// Plain-language lines for what's genuinely waiting. No jargon by design.
const hookLines = (h: Hooks): string[] => {
  const lines: string[] = [];
  if (h.quiet > 0) {
    lines.push(h.quiet === 1
      ? `1 person in your circle is going quiet.`
      : `${h.quiet} people in your circle are going quiet.`);
  }
  if (h.banked > 0) {
    lines.push(h.banked === 1
      ? `1 decision is waiting - see how your plan lands again.`
      : `${h.banked} decisions are waiting - see how your plan lands again.`);
  }
  return lines;
};

const subjectFor = (h: Hooks): string =>
  h.quiet > 0 ? `Your circle's getting cold` : `A few decisions are waiting for you`;

const pushBodyFor = (h: Hooks): string => {
  const lines = hookLines(h);
  return lines.length ? lines.join(' ') : `A few things are waiting for you.`;
};

const buildEmailHtml = (lines: string[]): string => `
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h1 style="font-size:22px;margin:0 0 4px">Here's what's waiting</h1>
  <p style="font-size:14px;color:#666;margin:0 0 20px">It has been a little while. A few small things are worth a look - they will not take long.</p>
  <div style="border:1px solid #eee;border-radius:12px;padding:16px;margin:0 0 14px">
    ${lines.map((l) => `<div style="font-size:15px;color:#333;margin:0 0 10px">${esc(l)}</div>`).join('')}
    <a href="${esc(APP_URL)}/" style="display:inline-block;background:#E0982A;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;margin-top:4px">Open your circle →</a>
  </div>
  <p style="font-size:12px;color:#999;margin-top:20px">You are getting this because a few things were worth a hello. <a href="${esc(APP_URL)}" style="color:#9a6a16">Open your circle</a> · manage this email in settings.</p>
</div>`;

async function sendReengageEmail(to: string, subject: string, lines: string[]): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html: buildEmailHtml(lines),
    }),
  });
  if (!resp.ok) {
    console.warn('reengage email failed', resp.status, await resp.text().catch(() => ''));
    return false;
  }
  return true;
}

async function firePush(userId: string, h: Hooks): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        title: `A few people worth a hello`,
        body: pushBodyFor(h),
        url: `${APP_URL}/`,
      }),
    });
  } catch (e) {
    console.warn('reengage push failed', e instanceof Error ? e.message : e);
  }
}

// Best-effort observability, mirroring cron-warm-digest: one delivery_log row
// per outbound send attempt so the sweep's behavior is auditable in-system.
// deno-lint-ignore no-explicit-any
async function logDelivery(admin: any, userId: string, channel: 'email' | 'push', status: 'sent' | 'failed'): Promise<void> {
  try {
    await admin.from('delivery_log').insert({ user_id: userId, kind: 'reengage', channel, status });
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

  const now = new Date();
  // Drifted window: last active in [21 days ago, 5 days ago].
  const windowStart = new Date(now.getTime() - MAX_INACTIVE_DAYS * DAY_MS).toISOString();
  const windowEnd = new Date(now.getTime() - MIN_INACTIVE_DAYS * DAY_MS).toISOString();
  const quietBefore = new Date(now.getTime() - 30 * DAY_MS).toISOString();

  const { data: profiles, error: profErr } = await admin
    .from('user_profiles')
    .select('id, last_active_at')
    .eq('onboarding_completed', true)
    .gte('last_active_at', windowStart)
    .lte('last_active_at', windowEnd)
    .order('last_active_at', { ascending: true })
    .limit(MAX_USERS_PER_RUN);
  if (profErr) {
    return new Response(JSON.stringify({ error: profErr.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  const targetUsers = (profiles ?? []).map((r: { id: string }) => r.id);

  let processed = 0;
  let emailed = 0;
  let pushed = 0;
  let skippedNoHooks = 0;
  let skippedEmailUnconfigured = 0;
  let emailSuppressed = 0;
  const errors: Array<{ user_id: string; message: string }> = [];

  for (const userId of targetUsers) {
    processed++;
    try {
      // Opt-out gating mirrors cron-warm-digest: per-channel switches are read
      // off user_preferences and treated as opt-out (null/missing => send),
      // except the push gate which simply respects browser_notifications.
      const { data: prefs } = await admin
        .from('user_preferences')
        .select('email_notifications, browser_notifications, goal_reminders')
        .eq('user_id', userId)
        .maybeSingle();

      // Compute the "what's waiting" hooks with cheap counts.
      const { count: quietCount } = await admin
        .from('circle_person')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .not('last_interaction_at', 'is', null)
        .lt('last_interaction_at', quietBefore);

      const { count: bankedCount } = await admin
        .from('thesis_answers')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'answered')
        .is('applied_at', null);

      const hooks: Hooks = { quiet: quietCount ?? 0, banked: bankedCount ?? 0 };

      // Never send an empty nudge.
      if (hooks.quiet === 0 && hooks.banked === 0) { skippedNoHooks++; continue; }

      // Push reaches app users with a subscription, gated by browser_notifications.
      if (!prefs || prefs.browser_notifications !== false) {
        await firePush(userId, hooks);
        pushed++;
        await logDelivery(admin, userId, 'push', 'sent');
      }

      // Email goes out unless email is off globally OR goal_reminders is off
      // (this nudge is a goal reminder at heart).
      const emailOptedIn = !prefs ||
        (prefs.email_notifications !== false && prefs.goal_reminders !== false);
      if (emailOptedIn) {
        if (!RESEND_API_KEY) {
          skippedEmailUnconfigured++;
        } else {
          const { data: userLookup } = await admin.auth.admin.getUserById(userId);
          const email = userLookup?.user?.email ?? null;
          if (email) {
            const lines = hookLines(hooks);
            if (await sendReengageEmail(email, subjectFor(hooks), lines)) {
              emailed++;
              await logDelivery(admin, userId, 'email', 'sent');
            } else {
              await logDelivery(admin, userId, 'email', 'failed');
            }
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
    processed,
    emailed,
    pushed,
    skipped_no_hooks: skippedNoHooks,
    skipped_email_unconfigured: skippedEmailUnconfigured,
    email_suppressed: emailSuppressed,
    email_configured: !!RESEND_API_KEY,
    errors,
    at: now.toISOString(),
  }), { headers: { 'Content-Type': 'application/json' } });
});

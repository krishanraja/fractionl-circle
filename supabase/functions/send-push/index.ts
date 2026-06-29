import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import webpush from 'npm:web-push@3.6.7';

// Service-role Web Push fan-out. NOT user-facing: called by server jobs
// (e.g. cron-warm-digest, cron-reengage) to notify a single user that fresh
// work is ready.
//
// INERT by design: if the VAPID env vars are not configured this returns
// { sent: 0, skipped: 'vapid_unconfigured' } with a 200 and never throws, so
// it is safe to ship and wire before keys exist.
//
// Not openly callable: the caller must present the project SERVICE_ROLE key as
// `Authorization: Bearer <key>`. verify_jwt is false for this function (see
// config.toml) precisely so we can do this constant-time check ourselves.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? '';

interface PushSubRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  // Caller auth: must hold the service-role key. Equality check, not a parse.
  const authorization = req.headers.get('Authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!SUPABASE_SERVICE_ROLE_KEY || token !== SUPABASE_SERVICE_ROLE_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Inert when unconfigured. Return 200 so callers can fire-and-forget.
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
    return json({ sent: 0, skipped: 'vapid_unconfigured' });
  }

  let payload: { user_id?: string; title?: string; body?: string; url?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const userId = payload.user_id;
  if (!userId || typeof userId !== 'string') {
    return json({ error: 'user_id required' }, 400);
  }

  const notification = JSON.stringify({
    title: payload.title || 'Circle',
    body: payload.body || 'Your moves are ready.',
    url: payload.url || 'https://circle.fractionl.ai/',
  });

  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  } catch (e) {
    console.error('vapid_setup_failed', e instanceof Error ? e.message : String(e));
    return json({ sent: 0, skipped: 'vapid_invalid' });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: subs, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);
  if (error) {
    return json({ error: error.message }, 500);
  }

  let sent = 0;
  let removed = 0;
  const deadIds: string[] = [];

  for (const sub of (subs ?? []) as PushSubRow[]) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        notification,
      );
      sent++;
    } catch (e) {
      // 404/410 => the subscription is gone; prune it. Other errors: log + skip.
      const statusCode = (e as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        deadIds.push(sub.id);
      } else {
        console.error('push_send_failed', statusCode ?? '', e instanceof Error ? e.message : String(e));
      }
    }
  }

  if (deadIds.length) {
    const { error: delErr } = await admin
      .from('push_subscriptions')
      .delete()
      .in('id', deadIds);
    if (!delErr) removed = deadIds.length;
  }

  return json({ sent, removed });
});

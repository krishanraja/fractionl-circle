import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { runGoogleSync } from '../_shared/syncGoogleCore.ts';

// Phase 5c: nightly Google re-sync. Iterates every user with a valid Google
// refresh token. Service-role auth via CRON_SECRET (matches the Phase 6
// pattern).

const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const MAX_USERS_PER_RUN = 100;

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

  // Pull users with a Google token (must have a refresh_token to be re-syncable).
  const { data: tokens, error: tokenErr } = await admin
    .from('oauth_tokens')
    .select('user_id, refresh_token')
    .eq('provider', 'google')
    .not('refresh_token', 'is', null)
    .limit(MAX_USERS_PER_RUN);
  if (tokenErr) {
    return new Response(JSON.stringify({ error: tokenErr.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const users: string[] = (tokens ?? []).map((t: { user_id: string }) => t.user_id);
  let processed = 0;
  let totalNew = 0;
  let totalMerged = 0;
  let totalSignals = 0;
  const errors: Array<{ user_id: string; message: string }> = [];

  for (const userId of users) {
    try {
      const result = await runGoogleSync(admin, userId);
      processed++;
      totalNew += result.circle_new;
      totalMerged += result.circle_merged;
      totalSignals += result.signals_inserted;
      if (result.errors.length) {
        errors.push({ user_id: userId, message: result.errors.join('; ') });
      }
    } catch (e) {
      errors.push({ user_id: userId, message: e instanceof Error ? e.message : String(e) });
    }
  }

  return new Response(JSON.stringify({
    target_users: users.length,
    processed,
    circle_new: totalNew,
    circle_merged: totalMerged,
    signals_inserted: totalSignals,
    errors,
    at: new Date().toISOString(),
  }), { headers: { 'Content-Type': 'application/json' } });
});

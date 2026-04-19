import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { runMatchEngineForUser } from '../_shared/matchEngineCore.ts';

// Overnight Match Engine entrypoint. Called by pg_cron (see
// supabase/cron_setup.sql). Service-role-authed: uses CRON_SECRET for
// shared-secret auth between pg_net and this function.

const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';

const MAX_USERS_PER_RUN = 200;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const secret = req.headers.get('x-cron-secret') ?? '';
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (!OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Find users who (a) have at least one active Idea and (b) at least one
  // person in their Circle. These are the only users the Engine can do
  // anything for.
  const { data: ideaUsers, error: ideaErr } = await admin
    .from('ideas')
    .select('user_id')
    .in('status', ['voiced', 'proposed', 'active'])
    .limit(5_000);
  if (ideaErr) {
    return new Response(JSON.stringify({ error: ideaErr.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  const ideaUserIds = new Set((ideaUsers ?? []).map((r: { user_id: string }) => r.user_id));

  const { data: circleUsers, error: circleErr } = await admin
    .from('circle_person')
    .select('user_id')
    .limit(20_000);
  if (circleErr) {
    return new Response(JSON.stringify({ error: circleErr.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  const circleUserIds = new Set((circleUsers ?? []).map((r: { user_id: string }) => r.user_id));

  const targetUsers = Array.from(ideaUserIds).filter((id) => circleUserIds.has(id)).slice(0, MAX_USERS_PER_RUN);

  let processed = 0;
  let totalMatches = 0;
  let totalDuplicates = 0;
  const errors: Array<{ user_id: string; message: string }> = [];

  for (const userId of targetUsers) {
    try {
      const result = await runMatchEngineForUser(userId, admin, OPENAI_API_KEY);
      processed++;
      totalMatches += result.matchesCreated;
      totalDuplicates += result.duplicatesSkipped;
      if (result.errors.length) {
        errors.push({ user_id: userId, message: result.errors.join('; ') });
      }
    } catch (e) {
      errors.push({ user_id: userId, message: e instanceof Error ? e.message : String(e) });
    }
  }

  return new Response(JSON.stringify({
    target_users: targetUsers.length,
    processed,
    matches_created: totalMatches,
    duplicates_skipped: totalDuplicates,
    errors,
    at: new Date().toISOString(),
  }), { headers: { 'Content-Type': 'application/json' } });
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { generateSundayLetterForUser } from '../_shared/sundayLetterCore.ts';

// Weekly Sunday Letter entrypoint. Called by pg_cron on Sundays at 7pm local
// (user-local time is out of scope for v1; we generate at one wall-clock time
// for all users). Service-role auth via CRON_SECRET.

const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';

const MAX_USERS_PER_RUN = 500;

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

  // Same gate as the UI: user needs at least one active Idea and one Circle
  // person for a letter to have anything to say.
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

  let generated = 0;
  let reused = 0;
  const errors: Array<{ user_id: string; message: string }> = [];

  for (const userId of targetUsers) {
    try {
      const { data: prefs } = await admin
        .from('user_preferences')
        .select('weekly_summary')
        .eq('user_id', userId)
        .maybeSingle();
      if (prefs && prefs.weekly_summary === false) continue;

      const result = await generateSundayLetterForUser(userId, admin, OPENAI_API_KEY);
      if (result.reused) reused++;
      else generated++;
    } catch (e) {
      errors.push({ user_id: userId, message: e instanceof Error ? e.message : String(e) });
    }
  }

  return new Response(JSON.stringify({
    target_users: targetUsers.length,
    generated,
    reused,
    errors,
    at: new Date().toISOString(),
  }), { headers: { 'Content-Type': 'application/json' } });
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

// Nightly warmth recompute. Service-role auth via CRON_SECRET. Thin wrapper over
// the set-based SQL function recompute_circle_warmth() (see the warm_network
// migration): the math lives in Postgres so it is one atomic, fast pass over the
// whole table rather than thousands of edge round-trips. Scheduled to run right
// after the Google/Microsoft contact+calendar sync so last_interaction_at - and
// therefore warmth - is current before the weekly digest reads it.
//
// This also closes the loop "lightly": when the nightly sync records a fresh
// interaction with someone the digest flagged, their recency resets here and
// their warmth climbs, with no "did you reach out?" prompt to the user.

const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

  const { data, error } = await admin.rpc('recompute_circle_warmth');
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    updated: typeof data === 'number' ? data : 0,
    at: new Date().toISOString(),
  }), { headers: { 'Content-Type': 'application/json' } });
});

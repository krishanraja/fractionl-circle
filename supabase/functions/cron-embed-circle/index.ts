import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { backfillEmbeddings } from '../_shared/circleEmbed.ts';

// Nightly embedding backfill for the semantic people-search. Service-role auth via
// CRON_SECRET. Sweeps circle people across ALL users whose profile blob is new or
// has drifted since it was last embedded, in bounded batches so one run can't blow
// the function timeout or the embeddings bill. Prioritises never-embedded then
// oldest, so a fresh circle becomes searchable within a run or two.
//
// Scheduled after compute-warmth (07:30 UTC) so warmth - which orders the sweep -
// is current. Inert (embeds nothing) until OPENAI_API_KEY is set; the search still
// works via keyword matching in the meantime.

const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const BATCH = 100;   // rows embedded per pass (one embeddings API call each)
const PASSES = 8;    // up to BATCH * PASSES people per nightly run

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const secret = req.headers.get('x-cron-secret') ?? '';
  if (!CRON_SECRET || secret !== CRON_SECRET) return new Response('Unauthorized', { status: 401 });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let total = 0;
  for (let i = 0; i < PASSES; i++) {
    // No userId → cross-user sweep (service role bypasses RLS). window == limit so
    // each pass advances through the never-embedded/oldest rows.
    const n = await backfillEmbeddings(admin, { limit: BATCH, window: BATCH });
    total += n;
    if (n < BATCH) break; // nothing left that's stale
  }

  return new Response(JSON.stringify({ embedded: total, at: new Date().toISOString() }),
    { headers: { 'Content-Type': 'application/json' } });
});

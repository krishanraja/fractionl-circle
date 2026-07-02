import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit } from '../_shared/compliance.ts';
import { backfillEmbeddings } from '../_shared/circleEmbed.ts';

// embed-circle: on-demand embedding for the signed-in user's circle. Backfills the
// people whose profile blob is new or has drifted (e.g. just after enrichment) so
// semantic search can reach them. Bounded per call; the nightly cron sweeps the rest.
// Returns { embedded } - 0 is normal (nothing stale, or no embeddings provider set).

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { userId, supabase } = await requireAuth(req);
    checkRateLimit(`embed-circle:${userId}`, 6, 60_000);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const limit = typeof body?.limit === 'number' ? Math.max(1, Math.min(body.limit, 100)) : 60;

    const embedded = await backfillEmbeddings(supabase, { userId, limit, window: Math.max(limit * 4, 200) });
    return new Response(JSON.stringify({ embedded }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

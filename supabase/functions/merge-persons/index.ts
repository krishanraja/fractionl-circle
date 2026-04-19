import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit } from '../_shared/compliance.ts';

// Phase 3: commits a single user-approved merge. Thin wrapper around the
// merge_circle_persons RPC so the UI can call a simple endpoint instead of
// juggling multi-table updates.

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { userId, supabase } = await requireAuth(req);
    checkRateLimit(`merge-persons:${userId}`, 120, 60_000);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const keep_id = typeof body?.keep_id === 'string' ? body.keep_id : '';
    const drop_id = typeof body?.drop_id === 'string' ? body.drop_id : '';
    if (!keep_id || !drop_id) {
      return new Response(JSON.stringify({ error: 'keep_id and drop_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (keep_id === drop_id) {
      return new Response(JSON.stringify({ ok: true, noop: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error } = await supabase.rpc('merge_circle_persons', { keep_id, drop_id });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, kept: keep_id, dropped: drop_id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

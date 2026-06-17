import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit } from '../_shared/compliance.ts';
import { runMatchEngineForUser } from '../_shared/matchEngineCore.ts';

// User-triggered Match Engine entrypoint. Auth'd via the user's JWT; RLS
// enforces per-user scoping on every read/write the core helper does.

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { userId, supabase } = await requireAuth(req);
    checkRateLimit(`run-match-engine:${userId}`, 6, 60_000);

    const hasLlm = !!(Deno.env.get('OPENAI_API_KEY') || Deno.env.get('LOVABLE_API_KEY') || Deno.env.get('ANTHROPIC_API_KEY'));
    if (!hasLlm) {
      return new Response(JSON.stringify({ error: 'Service unavailable' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const ideaIds: string[] | undefined = Array.isArray(body?.idea_ids) ? body.idea_ids : undefined;

    const result = await runMatchEngineForUser(userId, supabase, { ideaIds });

    return new Response(JSON.stringify({
      matches_created: result.matchesCreated,
      ideas_considered: result.ideasConsidered,
      duplicates_skipped: result.duplicatesSkipped,
      errors: result.errors,
      note: result.note,
      quota_blocked: result.quota_blocked ?? false,
      quota_limit: result.quota_limit,
      tier: result.tier,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit } from '../_shared/compliance.ts';
import { buildWarmDigestForUser } from '../_shared/warmDigestCore.ts';

// On-demand warm-digest preview. Auth'd via the user's JWT; RLS scopes every
// read to them. Returns the same cohort + drafts the weekly email would send, so
// the app can show "who's going cold this week" and let the user fire a touch
// (a prefilled mailto / copy) without waiting for Monday. Sends nothing itself.

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { userId, supabase } = await requireAuth(req);
    checkRateLimit(`warm-digest:${userId}`, 10, 60_000);

    const digest = await buildWarmDigestForUser(userId, supabase);
    return new Response(JSON.stringify(digest), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

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

    // Optional path-focus: when the app is on a specific plan + move, it passes
    // { context: { thesis, move } } so we surface people who FIT that idea and
    // draft the touch around it. Absent → the classic warmth/going-quiet digest.
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const ctx = body?.context;
    const context = ctx && typeof ctx.thesis === 'string' && ctx.thesis.trim()
      ? { thesis: ctx.thesis as string, move: typeof ctx.move === 'string' ? ctx.move : null }
      : undefined;

    const digest = await buildWarmDigestForUser(userId, supabase, Date.now(), context);
    return new Response(JSON.stringify(digest), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

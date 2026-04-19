import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit } from '../_shared/compliance.ts';
import { buildAuthorizeUrl } from '../_shared/googleOauth.ts';

// Phase 5: start the Google OAuth flow. Returns an authorize URL the client
// opens in a new tab / same-tab redirect. State is stored server-side and
// validated in the callback; never trust state coming back without this.

const STATE_TTL_MS = 10 * 60 * 1000;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { userId } = await requireAuth(req);
    checkRateLimit(`oauth-google-start:${userId}`, 6, 60_000);

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    if (!clientId) {
      return new Response(JSON.stringify({ error: 'Google OAuth not configured' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const redirectTo = typeof body?.redirect_to === 'string' ? body.redirect_to : null;

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const state = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + STATE_TTL_MS).toISOString();

    const { error } = await admin.from('oauth_states').insert({
      state,
      user_id: userId,
      provider: 'google',
      redirect_to: redirectTo,
      expires_at: expiresAt,
    });
    if (error) throw error;

    const url = buildAuthorizeUrl(state, clientId);
    return new Response(JSON.stringify({ url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

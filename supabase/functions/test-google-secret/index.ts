// DISABLED: This test endpoint has been secured.
// It previously exposed Google OAuth credential structure without authentication.
// Kept as a stub to prevent 404s if referenced elsewhere.
import { getCorsHeaders, requireAuth, safeErrorResponse } from '../_shared/compliance.ts';

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require admin authentication
    const { userId, supabase } = await requireAuth(req);

    // Verify admin role
    const { data: isAdmin } = await supabase.rpc('is_admin', { _user_id: userId });
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rawCredentials = Deno.env.get('GOOGLE_OAUTH_CREDENTIALS');
    const hasSecret = !!rawCredentials;

    // Only return whether the secret exists — never expose structure or length
    return new Response(
      JSON.stringify({
        configured: hasSecret,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return safeErrorResponse(error, corsHeaders);
  }
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit } from '../_shared/compliance.ts';

// Right-to-erasure, server side (GDPR Art.17). The user's identity comes from
// the verified JWT (requireAuth) - never the request body - so a caller can
// only ever delete THEMSELVES. We then:
//   1. erase_user_data(uuid)  - wipes every user-owned row across the full
//      surface + anonymises the profile (self-only guard inside the RPC too).
//   2. auth.admin.deleteUser  - removes the auth identity, which the client RPC
//      alone could never do.
// Both run under the service role so the wipe is complete regardless of RLS.

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    // Identity is taken from the verified token only.
    const { userId } = await requireAuth(req);
    checkRateLimit(`delete-account:${userId}`, 3, 60_000);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Erase all owned data + anonymise profile. The RPC is self-guarded, but
    //    we call it as service role for the user's own id, which it permits.
    const { data: eraseSummary, error: eraseErr } = await admin.rpc('erase_user_data', {
      target_user_id: userId,
    });
    if (eraseErr) {
      return new Response(JSON.stringify({ error: 'Erasure failed', detail: eraseErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Remove the auth identity. If this fails the data is already gone, so we
    //    report it but do not pretend the account still exists.
    const { error: authErr } = await admin.auth.admin.deleteUser(userId);
    if (authErr) {
      return new Response(JSON.stringify({
        ok: true,
        warning: 'Data erased but auth identity removal failed; retry sign-out.',
        detail: authErr.message,
        erase_summary: eraseSummary,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ ok: true, erase_summary: eraseSummary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

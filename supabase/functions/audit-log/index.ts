import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit } from '../_shared/compliance.ts';

// security_audit_log is service-role-only (tamper-proof: a client must not be
// able to forge or read audit entries). The browser therefore cannot insert
// directly - it 403s. This function is the write path: it verifies the JWT,
// STAMPS user_id from the verified token (never trusts the client), and inserts
// with the service role. Fixes the recurring client-side 403.

const ALLOWED = new Set([
  'login', 'logout', 'data_access', 'data_export', 'data_modification',
  'consent_update', 'settings_change', 'api_call', 'voice_recording',
  'ai_query', 'contact_access', 'payment_action',
]);
const CLASSIFICATIONS = new Set(['public', 'internal', 'confidential', 'restricted']);

const json = (body: unknown, status: number, cors: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { userId } = await requireAuth(req);
    checkRateLimit(`audit-log:${userId}`, 60, 60_000);

    const body = await req.json().catch(() => ({}));
    const events = Array.isArray(body?.events) ? body.events.slice(0, 50) : [];

    const rows = events
      .filter((e: { action?: string }) => e && typeof e.action === 'string' && ALLOWED.has(e.action))
      .map((e: Record<string, unknown>) => ({
        user_id: userId, // server-stamped from the verified JWT
        action: e.action,
        resource: typeof e.resource === 'string' ? (e.resource as string).slice(0, 200) : 'unknown',
        details: e.details && typeof e.details === 'object' ? e.details : {},
        compliance_framework: typeof e.framework === 'string' ? e.framework : null,
        data_classification: typeof e.classification === 'string' && CLASSIFICATIONS.has(e.classification as string)
          ? e.classification : 'internal',
        outcome: typeof e.outcome === 'string' ? e.outcome : 'success',
      }));

    if (!rows.length) return json({ ok: true, inserted: 0 }, 200, corsHeaders);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { error } = await admin.from('security_audit_log').insert(rows);
    if (error) throw error;

    return json({ ok: true, inserted: rows.length }, 200, corsHeaders);
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

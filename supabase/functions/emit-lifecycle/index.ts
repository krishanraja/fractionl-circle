import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, ValidationError } from '../_shared/compliance.ts';

// Lifecycle event emit (completes 5d's app side). Emits the canonical `signed_up`
// and `activated` attribution events to the central Mindmaker OS warehouse,
// SERVER-SIDE, so the browser never holds the ingest secret. Auth'd via the
// caller's JWT (requireAuth): the user_id + email are read from the verified
// token, not from the client body. The client only supplies the attribution
// context it already holds (utm fields, anonymous_id, etc.).
//
// INERT: if ATTRIBUTION_INGEST_SECRET is not set this returns { skipped:
// 'unconfigured' } without erroring, so it is safe to ship before the OS
// provisions the receiver. Reuses the exact ingest contract from stripe-webhook.

const ATTRIBUTION_INGEST_URL = Deno.env.get('ATTRIBUTION_INGEST_URL')
  || 'https://gojpffsrxybbpbdzzrvs.supabase.co/functions/v1/ingest-attribution';
const ATTRIBUTION_INGEST_SECRET = Deno.env.get('ATTRIBUTION_INGEST_SECRET');

const VALID_EVENTS = new Set(['signed_up', 'activated']);

const str = (v: unknown): string | null =>
  typeof v === 'string' && v.length ? v : null;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { userId, supabase } = await requireAuth(req);

    const body = await req.json().catch(() => ({}));
    const event = str(body?.event);
    if (!event || !VALID_EVENTS.has(event)) {
      throw new ValidationError("event must be 'signed_up' or 'activated'");
    }

    // Inert when the warehouse secret is absent. Still return 200 so the
    // fire-and-forget client call resolves cleanly.
    if (!ATTRIBUTION_INGEST_SECRET) {
      return new Response(JSON.stringify({ skipped: 'unconfigured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Identity comes from the verified JWT, not the client body.
    const { data: userData } = await supabase.auth.getUser();
    const email = userData?.user?.email ?? null;

    const payload = {
      app: 'circle',
      event,
      stripe_account: 'fractionl_ai',
      user_id: userId,
      email,
      anonymous_id: str(body?.anonymous_id),
      utm_source: str(body?.utm_source),
      utm_medium: str(body?.utm_medium),
      utm_campaign: str(body?.utm_campaign),
      utm_content: str(body?.utm_content),
      utm_term: str(body?.utm_term),
      campaign_id: str(body?.campaign_id),
      agent: str(body?.agent),
      referrer: str(body?.referrer),
      landing_path: str(body?.landing_path),
      dedupe_key: `circle:${event}:${userId}`,
      occurred_at: new Date().toISOString(),
    };

    // Best-effort: an ingest hiccup must never surface as a client error.
    try {
      await fetch(ATTRIBUTION_INGEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-attribution-secret': ATTRIBUTION_INGEST_SECRET },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5_000),
      });
    } catch (_e) {
      // swallow
    }

    return new Response(JSON.stringify({ emitted: event }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

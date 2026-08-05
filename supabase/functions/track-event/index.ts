import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from '../_shared/compliance.ts';

// track-event: the PUBLIC, unauthenticated half of acquisition attribution.
//
// Why this exists: emit-lifecycle is JWT-gated (requireAuth) and only accepts
// signed_up / activated, so an anonymous visitor could never be recorded. The
// warehouse therefore had signups with no top of funnel above them, which made
// every acquisition channel unmeasurable. This function is the missing front
// door: the browser posts an anonymous 'landed' event, and this forwards it to
// the central Mindmaker OS warehouse SERVER-SIDE using the server-held
// ATTRIBUTION_INGEST_SECRET. The browser never holds that secret.
//
// Deployed with verify_jwt = false (see supabase/config.toml). It is public by
// design and deliberately narrow: it accepts ONLY anonymous top-of-funnel
// events, carries no user identity, and writes nothing to Circle's own
// database. Identity-bearing events stay on the authenticated emit-lifecycle.
//
// INERT: if ATTRIBUTION_INGEST_SECRET is absent this returns 200 with
// { skipped: 'unconfigured' } rather than erroring, matching emit-lifecycle, so
// a misconfigured environment can never surface as a client-side failure.
//
// Deploy: supabase functions deploy track-event --project-ref ksyuwacuigshvcyptlhe --no-verify-jwt

const ATTRIBUTION_INGEST_URL = Deno.env.get('ATTRIBUTION_INGEST_URL')
  || 'https://gojpffsrxybbpbdzzrvs.supabase.co/functions/v1/ingest-attribution';
const ATTRIBUTION_INGEST_SECRET = Deno.env.get('ATTRIBUTION_INGEST_SECRET');

// Anonymous-safe events only. Anything carrying a user identity belongs on the
// authenticated emit-lifecycle function, not on this public endpoint.
const ANONYMOUS_EVENTS = new Set(['landed']);

const str = (v: unknown): string | null =>
  typeof v === 'string' && v.length ? v.slice(0, 512) : null;

function json(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, corsHeaders);

  try {
    const body = await req.json().catch(() => ({}));
    const event = str(body?.event);
    if (!event || !ANONYMOUS_EVENTS.has(event)) {
      return json({ error: "event must be 'landed'" }, 400, corsHeaders);
    }

    if (!ATTRIBUTION_INGEST_SECRET) {
      return json({ skipped: 'unconfigured' }, 200, corsHeaders);
    }

    const anonymousId = str(body?.anonymous_id) ?? 'anon';
    const occurredAt = new Date().toISOString();
    // One landing per anonymous visitor per browser session. The session id is
    // client-supplied and opaque; if it is missing we fall back to the UTC day
    // so a repeat visitor cannot flood the warehouse with duplicate landings.
    const sessionKey = str(body?.session_id) ?? occurredAt.slice(0, 10);

    const payload = {
      app: 'circle',
      event,
      stripe_account: 'fractionl_ai',
      anonymous_id: anonymousId,
      utm_source: str(body?.utm_source),
      utm_medium: str(body?.utm_medium),
      utm_campaign: str(body?.utm_campaign),
      utm_content: str(body?.utm_content),
      utm_term: str(body?.utm_term),
      campaign_id: str(body?.campaign_id),
      agent: str(body?.agent),
      referrer: str(body?.referrer),
      landing_path: str(body?.landing_path),
      occurred_at: occurredAt,
      dedupe_key: `circle:${event}:${anonymousId}:${sessionKey}`,
    };

    // Best-effort: a warehouse hiccup must never surface as a client error, and
    // must never slow the page down.
    let forwarded = false;
    try {
      const res = await fetch(ATTRIBUTION_INGEST_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-attribution-secret': ATTRIBUTION_INGEST_SECRET,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5_000),
      });
      forwarded = res.ok;
      if (!res.ok) console.error(`[track-event] ingest returned ${res.status}`);
    } catch (e) {
      console.error(`[track-event] ingest failed: ${(e as Error).message}`);
    }

    return json({ ok: true, forwarded }, 200, corsHeaders);
  } catch (e) {
    console.error(`[track-event] unexpected: ${(e as Error).message}`);
    // Never leak internals and never fail the caller: this is fire and forget.
    return json({ ok: false }, 200, corsHeaders);
  }
});

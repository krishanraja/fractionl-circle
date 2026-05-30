import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Central attribution warehouse (5d). Circle only EMITS revenue lifecycle events
// to the Mindmaker OS ingest function. No-op until the OS provisions the secret,
// so this is safe to ship before the receiver exists. Never throws.
const ATTRIBUTION_INGEST_URL = Deno.env.get('ATTRIBUTION_INGEST_URL')
  || 'https://gojpffsrxybbpbdzzrvs.supabase.co/functions/v1/ingest-attribution';
const ATTRIBUTION_INGEST_SECRET = Deno.env.get('ATTRIBUTION_INGEST_SECRET');

async function emitAttribution(event: string, fields: Record<string, unknown>, dedupeKey: string) {
  if (!ATTRIBUTION_INGEST_SECRET) return;
  try {
    await fetch(ATTRIBUTION_INGEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-attribution-secret': ATTRIBUTION_INGEST_SECRET },
      body: JSON.stringify({
        app: 'circle',
        event,
        stripe_account: 'fractionl_ai',
        occurred_at: new Date().toISOString(),
        dedupe_key: dedupeKey,
        ...fields,
      }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch (_e) {
    // Fail-open: an ingest hiccup must never fail the Stripe webhook.
  }
}

// Pull attribution fields stamped onto the Stripe subscription metadata at checkout.
function attrFromMetadata(meta: Record<string, string> | undefined) {
  const m = meta ?? {};
  return {
    user_id: m.supabase_user_id ?? null,
    anonymous_id: m.anonymous_id ?? null,
    utm_source: m.utm_source ?? null,
    utm_medium: m.utm_medium ?? null,
    utm_campaign: m.utm_campaign ?? null,
    utm_content: m.utm_content ?? null,
    utm_term: m.utm_term ?? null,
    campaign_id: m.campaign_id ?? null,
    agent: m.agent ?? null,
  };
}

async function stripeGet(endpoint: string) {
  const response = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` },
  });
  return response.json();
}

function tierFromPriceId(priceId: string): 'free' | 'pro' | 'executive' {
  const proPriceIds = (Deno.env.get('STRIPE_PRO_PRICE_IDS') || '').split(',');
  const execPriceIds = (Deno.env.get('STRIPE_EXEC_PRICE_IDS') || '').split(',');
  if (execPriceIds.includes(priceId)) return 'executive';
  if (proPriceIds.includes(priceId)) return 'pro';
  return 'free';
}

// Simple signature verification using Web Crypto API
async function verifyStripeSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const parts = signature.split(',');
    const timestampPart = parts.find(p => p.startsWith('t='));
    const sigPart = parts.find(p => p.startsWith('v1='));
    if (!timestampPart || !sigPart) return false;

    const timestamp = timestampPart.split('=')[1];
    const expectedSig = sigPart.split('=')[1];

    // Replay protection: reject signatures older than 5 minutes
    const timestampAge = Math.abs(Date.now() / 1000 - parseInt(timestamp));
    if (timestampAge > 300) return false;

    const signedPayload = `${timestamp}.${payload}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sigBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
    const computedSig = Array.from(new Uint8Array(sigBytes)).map(b => b.toString(16).padStart(2, '0')).join('');

    return computedSig === expectedSig;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature || !STRIPE_WEBHOOK_SECRET) {
      return new Response('Missing signature', { status: 400 });
    }

    const isValid = await verifyStripeSignature(body, signature, STRIPE_WEBHOOK_SECRET);
    if (!isValid) {
      console.error('Invalid Stripe signature');
      return new Response('Invalid signature', { status: 400 });
    }

    const event = JSON.parse(body);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Idempotency: Stripe delivers at-least-once. Record each verified event.id
    // and short-circuit on a redelivery so we never reprocess (Phase 2 hardening,
    // 5d foundation). Fail-open on unexpected DB errors so real events are never
    // silently dropped.
    const { error: dedupeError } = await supabase
      .from('processed_stripe_events')
      .insert({ event_id: event.id, event_type: event.type });
    if (dedupeError) {
      if (dedupeError.code === '23505') {
        return new Response(JSON.stringify({ received: true, deduped: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      console.error('processed_stripe_events insert error:', dedupeError.code);
    }

    console.log('Stripe webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.subscription
          ? (await stripeGet(`/subscriptions/${session.subscription}`)).metadata?.supabase_user_id
          : session.metadata?.supabase_user_id;

        if (!userId || !session.subscription) break;

        const sub = await stripeGet(`/subscriptions/${session.subscription}`);
        const priceId = sub.items?.data?.[0]?.price?.id;
        const tier = tierFromPriceId(priceId);

        await supabase.from('subscriptions').upsert({
          user_id: userId,
          tier,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          stripe_price_id: priceId,
          status: 'active',
          trial_ends_at: null,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: false,
        }, { onConflict: 'user_id' });

        console.log(`User ${userId} upgraded to ${tier}`);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const userId = sub.metadata?.supabase_user_id;
        if (!userId) break;

        const priceId = sub.items?.data?.[0]?.price?.id;
        const tier = tierFromPriceId(priceId);
        const status = sub.status === 'active' ? 'active'
          : sub.status === 'past_due' ? 'past_due'
          : sub.status === 'trialing' ? 'trialing'
          : sub.status;

        await supabase.from('subscriptions').upsert({
          user_id: userId,
          tier,
          stripe_subscription_id: sub.id,
          stripe_price_id: priceId,
          status,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end || false,
        }, { onConflict: 'user_id' });

        console.log(`Subscription updated for ${userId}: ${tier} (${status})`);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const userId = sub.metadata?.supabase_user_id;
        if (!userId) break;

        await supabase.from('subscriptions').upsert({
          user_id: userId,
          tier: 'free',
          stripe_subscription_id: null,
          stripe_price_id: null,
          status: 'active',
          current_period_start: null,
          current_period_end: null,
          cancel_at_period_end: false,
        }, { onConflict: 'user_id' });

        await emitAttribution('churned', {
          ...attrFromMetadata(sub.metadata),
          stripe_subscription_id: sub.id,
          metadata: { source_event: 'customer.subscription.deleted' },
        }, `circle:churned:${sub.id}`);

        console.log(`Subscription canceled for ${userId}, reverted to free`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subId = invoice.subscription;
        if (!subId) break;

        const sub = await stripeGet(`/subscriptions/${subId}`);
        const userId = sub.metadata?.supabase_user_id;
        if (!userId) break;

        await supabase.from('subscriptions').update({
          status: 'past_due',
        }).eq('user_id', userId);

        console.log(`Payment failed for ${userId}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        // Canonical 'purchased' event (first sale + every renewal). Keyed on the
        // invoice id so each paid invoice counts once and renewals are distinct.
        const invoice = event.data.object;
        const subId = invoice.subscription;
        if (!subId) break;

        const sub = await stripeGet(`/subscriptions/${subId}`);
        const priceId = sub.items?.data?.[0]?.price?.id;
        await emitAttribution('purchased', {
          ...attrFromMetadata(sub.metadata),
          stripe_customer_id: invoice.customer,
          stripe_subscription_id: subId,
          amount_cents: invoice.amount_paid ?? null,
          currency: invoice.currency ?? null,
          metadata: { price_id: priceId, billing_reason: invoice.billing_reason, source_event: 'invoice.payment_succeeded' },
        }, `circle:purchased:${subId}:${invoice.id}`);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        await emitAttribution('refunded', {
          stripe_customer_id: charge.customer ?? null,
          amount_cents: charge.amount_refunded ?? null,
          currency: charge.currency ?? null,
          metadata: { charge_id: charge.id, source_event: 'charge.refunded' },
        }, `circle:refunded:${charge.id}:${charge.amount_refunded}`);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

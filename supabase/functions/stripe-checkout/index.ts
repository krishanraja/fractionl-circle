import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { getCorsHeaders } from '../_shared/compliance.ts';

// corsHeaders is now computed per-request via getCorsHeaders(req)

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_URL = Deno.env.get('APP_URL') || 'https://circle.fractionl.ai';

async function stripeRequest(endpoint: string, body: Record<string, string>) {
  const response = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  });
  const json = await response.json();
  // A Stripe 4xx/5xx must NOT be swallowed. Without this check a bad price id or
  // customer error returns an object with no `url`, and the function used to reply
  // HTTP 200 with `{}` - a dead Upgrade button with no diagnostics. Throw so the
  // caller's catch returns a real 500 with the Stripe message, and log the cause.
  if (!response.ok) {
    const message = json?.error?.message || `Stripe API error (${response.status})`;
    console.error('Stripe API error:', endpoint, response.status, json?.error?.type ?? '', message);
    throw new Error(message);
  }
  return json;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: 'Stripe not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { price_id, mode } = await req.json();
    if (!price_id) {
      return new Response(
        JSON.stringify({ error: 'price_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Credit packs are one-time purchases, not subscriptions. The server owns the
    // price -> credits mapping (STRIPE_CREDIT_PACKS = "price_x:120,price_y:650")
    // so the client can NEVER inflate how many credits a purchase grants.
    const isCredits = mode === 'credits';
    let creditAmount = 0;
    if (isCredits) {
      const map = new Map<string, number>();
      for (const pair of (Deno.env.get('STRIPE_CREDIT_PACKS') || '').split(',')) {
        const [pid, n] = pair.split(':');
        if (pid && n) map.set(pid.trim(), parseInt(n.trim(), 10));
      }
      creditAmount = map.get(price_id) ?? 0;
      if (!creditAmount) {
        return new Response(
          JSON.stringify({ error: 'Unknown credit pack' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Acquisition attribution (5c): read the user's first-touch row and build
    // Stripe metadata so the purchase event is attributable to a campaign/agent.
    const { data: attr } = await supabase
      .from('user_attribution')
      .select('utm_source, utm_medium, utm_campaign, utm_content, utm_term, campaign_id, agent, anonymous_id')
      .eq('user_id', user.id)
      .maybeSingle();
    const customerMeta: Record<string, string> = {};
    const subMeta: Record<string, string> = {};
    if (attr) {
      for (const [k, v] of Object.entries(attr)) {
        if (v != null && v !== '') {
          customerMeta[`metadata[${k}]`] = String(v);
          subMeta[`subscription_data[metadata][${k}]`] = String(v);
        }
      }
    }

    // Check for existing Stripe customer. maybeSingle (not single): a user with no
    // subscriptions row must not error here.
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    let customerId = subscription?.stripe_customer_id;

    // Create Stripe customer if needed, then PERSIST the id. Previously this did a
    // bare UPDATE, which is a no-op when the row is missing, so every checkout by a
    // user with no subscriptions row minted a fresh duplicate Stripe customer.
    if (!customerId) {
      const customer = await stripeRequest('/customers', {
        email: user.email || '',
        'metadata[supabase_user_id]': user.id,
        ...customerMeta,
      });
      customerId = customer.id;

      if (subscription) {
        await supabase
          .from('subscriptions')
          .update({ stripe_customer_id: customerId })
          .eq('user_id', user.id);
      } else {
        // tier + status carry their column defaults ('free' / 'active').
        await supabase
          .from('subscriptions')
          .insert({ user_id: user.id, stripe_customer_id: customerId });
      }
    }

    // Create Checkout Session - a one-time payment for a credit pack, or the
    // recurring subscription. The webhook reads metadata.credit_pack to grant credits.
    const session = isCredits
      ? await stripeRequest('/checkout/sessions', {
          'customer': customerId,
          'mode': 'payment',
          'line_items[0][price]': price_id,
          'line_items[0][quantity]': '1',
          'success_url': `${APP_URL}?checkout=credits`,
          'cancel_url': `${APP_URL}?checkout=canceled`,
          'payment_intent_data[metadata][supabase_user_id]': user.id,
          'payment_intent_data[metadata][credit_pack]': String(creditAmount),
          'metadata[supabase_user_id]': user.id,
          'metadata[credit_pack]': String(creditAmount),
        })
      : await stripeRequest('/checkout/sessions', {
          'customer': customerId,
          'mode': 'subscription',
          'line_items[0][price]': price_id,
          'line_items[0][quantity]': '1',
          'success_url': `${APP_URL}?checkout=success`,
          'cancel_url': `${APP_URL}?checkout=canceled`,
          'subscription_data[metadata][supabase_user_id]': user.id,
          'allow_promotion_codes': 'true',
          ...subMeta,
        });

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Checkout error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Checkout failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

#!/usr/bin/env node
// Idempotent Stripe product + price setup for the Circle redesign tiers.
// Run locally with:
//
//   STRIPE_SECRET_KEY=sk_test_... node scripts/setup-stripe-products.mjs
//
// Uses lookup_key on each Price so re-running is safe; existing products are
// found by a stable metadata key rather than by name, so tweaking copy won't
// produce duplicates. Emits the env-var lines you need to paste into:
//   - Supabase edge function secrets (STRIPE_PRO_PRICE_IDS, STRIPE_EXEC_PRICE_IDS)
//   - Vercel / Lovable / local .env    (VITE_STRIPE_PRICE_OPERATOR, VITE_STRIPE_PRICE_CHIEF_OF_STAFF)
//
// Zero dependencies: plain fetch against api.stripe.com.

const STRIPE_API = 'https://api.stripe.com/v1';

const SECRET = process.env.STRIPE_SECRET_KEY;
if (!SECRET) {
  console.error('STRIPE_SECRET_KEY is required.');
  process.exit(1);
}
if (!SECRET.startsWith('sk_test_') && !SECRET.startsWith('sk_live_')) {
  console.error('Unexpected Stripe key prefix. Expected sk_test_* or sk_live_*.');
  process.exit(1);
}

const MODE = SECRET.startsWith('sk_live_') ? 'LIVE' : 'TEST';

// ---------------------------------------------------------------------------
// Catalogue. Match src/lib/tiers.ts.
// Each product has a stable metadata.key we search by on re-runs.
// Each price has a lookup_key for idempotent reuse.
// ---------------------------------------------------------------------------

const PRODUCTS = [
  {
    slug: 'operator',
    name: 'Circle — Operator',
    description: 'Help me run. Up to 3 Streams, 3 Matches a day, inbox + calendar, Sunday Letter text.',
    tierEnum: 'pro',
    prices: [
      { lookup_key: 'operator_monthly', amount: 3000, currency: 'usd', interval: 'month' },
    ],
    edgeEnv: 'STRIPE_PRO_PRICE_IDS',
    clientEnv: 'VITE_STRIPE_PRICE_OPERATOR',
  },
  {
    slug: 'chief_of_staff',
    name: 'Circle — Chief of Staff',
    description: 'Help me scale. Unlimited Streams, Sunday Letter audio, external signal feeds, priority compute.',
    tierEnum: 'executive',
    prices: [
      { lookup_key: 'chief_of_staff_monthly', amount: 7900, currency: 'usd', interval: 'month' },
    ],
    edgeEnv: 'STRIPE_EXEC_PRICE_IDS',
    clientEnv: 'VITE_STRIPE_PRICE_CHIEF_OF_STAFF',
  },
];

// ---------------------------------------------------------------------------
// Stripe API helpers.
// ---------------------------------------------------------------------------

const encode = (obj) => {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'object') {
      for (const [kk, vv] of Object.entries(v)) {
        params.append(`${k}[${kk}]`, String(vv));
      }
    } else {
      params.append(k, String(v));
    }
  }
  return params.toString();
};

async function stripe(path, opts = {}) {
  const method = opts.method ?? 'GET';
  const url = `${STRIPE_API}${path}${opts.query ? '?' + new URLSearchParams(opts.query) : ''}`;
  const headers = { Authorization: `Bearer ${SECRET}` };
  let body;
  if (opts.body) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = encode(opts.body);
  }
  const res = await fetch(url, { method, headers, body });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const msg = json?.error?.message ?? res.statusText;
    throw new Error(`Stripe ${method} ${path} -> ${res.status}: ${msg}`);
  }
  return json;
}

async function findProductByMetadataKey(key) {
  const { data } = await stripe('/products/search', {
    query: { query: `metadata['key']:'${key}'`, limit: '1' },
  });
  return data?.[0] ?? null;
}

async function ensureProduct(product) {
  const existing = await findProductByMetadataKey(product.slug);
  if (existing) {
    // Keep the product in sync with the catalogue description.
    if (existing.name !== product.name || existing.description !== product.description) {
      await stripe(`/products/${existing.id}`, {
        method: 'POST',
        body: { name: product.name, description: product.description },
      });
    }
    return existing.id;
  }
  const created = await stripe('/products', {
    method: 'POST',
    body: {
      name: product.name,
      description: product.description,
      metadata: { key: product.slug, tier: product.tierEnum },
    },
  });
  return created.id;
}

async function ensurePrice(productId, price) {
  const { data } = await stripe('/prices', {
    query: { lookup_keys: [price.lookup_key], limit: '1' },
  });
  if (data?.[0]) return data[0].id;

  const created = await stripe('/prices', {
    method: 'POST',
    body: {
      product: productId,
      unit_amount: price.amount,
      currency: price.currency,
      recurring: { interval: price.interval },
      lookup_key: price.lookup_key,
    },
  });
  return created.id;
}

// ---------------------------------------------------------------------------
// Run.
// ---------------------------------------------------------------------------

const results = [];
for (const product of PRODUCTS) {
  console.error(`[${MODE}] ensuring ${product.name}…`);
  const productId = await ensureProduct(product);
  const priceIds = [];
  for (const price of product.prices) {
    const priceId = await ensurePrice(productId, price);
    priceIds.push(priceId);
  }
  results.push({ product, productId, priceIds });
}

console.error('');
console.error(`done. mode=${MODE}`);
console.error('');
console.error('Paste these into Supabase edge function secrets:');
console.error('  supabase secrets set \\');
for (const r of results) {
  console.error(`    ${r.product.edgeEnv}=${r.priceIds.join(',')} \\`);
}
console.error('');
console.error('Paste these into your client env (.env / Vercel / Lovable):');
for (const r of results) {
  console.error(`  ${r.product.clientEnv}=${r.priceIds[0]}`);
}
console.error('');

// Machine-readable JSON on stdout for pipelines.
console.log(
  JSON.stringify(
    {
      mode: MODE,
      products: results.map((r) => ({
        slug: r.product.slug,
        productId: r.productId,
        priceIds: r.priceIds,
        edgeEnv: r.product.edgeEnv,
        clientEnv: r.product.clientEnv,
      })),
    },
    null,
    2
  )
);

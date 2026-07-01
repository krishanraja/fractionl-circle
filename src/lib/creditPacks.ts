// Credit-pack catalogue — the one-time top-ups that fund max-effort enrichment, on
// top of the subscription. Mirrors src/lib/tiers.ts: price labels + Stripe price-ID
// env vars live here as the single client source of truth.
//
// Pricing is deliberately margin-positive at every tier: $/credit ($0.09–$0.125)
// sits ~30–40x above our marginal cost per credit (~$0.003 = $0.06 / 20 credits),
// with a gentle volume discount as the pack grows. The SERVER independently maps
// price_id -> credits (STRIPE_CREDIT_PACKS env), so the granted amount can never be
// set by the client.
import { DEEP_ENRICH_CREDITS } from './creditCosts';

export interface CreditPack {
  slug: string;
  name: string;
  credits: number;
  priceLabel: string;
  priceIdEnv: string;    // import.meta.env override key for the Stripe price ID
  priceId: string;       // live Stripe price ID (public; env can override)
  highlighted: boolean;
}

// Live one-time price IDs on the Fractionl AI Stripe account. Stripe price IDs are
// public (they ride along in client-side checkout), so we ship them as defaults —
// the buy flow works out of the box, and the VITE_* envs still override if set.
export const CREDIT_PACKS: CreditPack[] = [
  { slug: 'starter', name: 'Starter', credits: 120,  priceLabel: '$15',  priceIdEnv: 'VITE_STRIPE_CREDITS_STARTER_PRICE_ID', priceId: 'price_1ToNxiHdk8IR8OrUg0569WYD', highlighted: false },
  { slug: 'pro',     name: 'Pro',     credits: 650,  priceLabel: '$70',  priceIdEnv: 'VITE_STRIPE_CREDITS_PRO_PRICE_ID',     priceId: 'price_1ToNxiHdk8IR8OrUb0JCN4vx', highlighted: true },
  { slug: 'scale',   name: 'Scale',   credits: 3000, priceLabel: '$280', priceIdEnv: 'VITE_STRIPE_CREDITS_SCALE_PRICE_ID',   priceId: 'price_1ToNxjHdk8IR8OrUrpriE960', highlighted: false },
];

// How many deep enrichments a pack buys, for a plain "≈ N deep dives" line.
export const packEnrichments = (p: CreditPack): number => Math.floor(p.credits / DEEP_ENRICH_CREDITS);

// The Stripe price ID for a pack: env override first, then the shipped live default.
export const getCreditPackPriceId = (p: CreditPack): string | null =>
  (import.meta.env as Record<string, string | undefined>)[p.priceIdEnv] ?? p.priceId ?? null;

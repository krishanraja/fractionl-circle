// Tier catalogue for Fractionl.
// One price, one story: Free and Pro at $39/mo. The legacy $79 'executive'
// tier was retired on 2026-08-04 (nothing read it; only getPriceId('pro') is
// called). The DB enum still carries the historical 'executive' value, so
// SubscriptionTier keeps it and getTier() falls back to Free for any slug that
// is no longer sold. This file is the single source of truth for price labels,
// feature bullets, and Stripe price ID env vars.

import type { SubscriptionTier } from '@/hooks/useSubscription';

export interface TierDisplay {
  slug: SubscriptionTier;
  name: string;                   // User-facing tier name.
  tagline: string;
  priceMonthly: number;           // 0 for free.
  priceMonthlyLabel: string;      // "$39" etc.
  priceIdEnv: string | null;      // import.meta.env key for Stripe price ID.
  highlighted: boolean;           // Primary CTA tier.
  features: string[];
  ctaLabel: string;
}

export const TIERS: TierDisplay[] = [
  {
    slug: 'free',
    name: 'Freemium',
    tagline: 'Try the magic.',
    priceMonthly: 0,
    priceMonthlyLabel: 'Free',
    priceIdEnv: null,
    highlighted: false,
    features: [
      'One full read of your value prop',
      'Your plan and next actions',
      'Build your circle by screenshot or CSV',
    ],
    ctaLabel: 'Current plan',
  },
  {
    slug: 'pro',
    name: 'Pro',
    tagline: 'Build the whole portfolio.',
    priceMonthly: 39,
    priceMonthlyLabel: '$39',
    priceIdEnv: 'VITE_STRIPE_PRO_MONTHLY_PRICE_ID',
    highlighted: true,
    features: [
      'Unlimited reads as your plan evolves',
      'Real warm reach from your full network',
      'Specific, named next moves',
      'Ongoing market monitoring',
    ],
    ctaLabel: 'Upgrade to Pro',
  },
];

export const getTier = (slug: SubscriptionTier): TierDisplay =>
  TIERS.find((t) => t.slug === slug) ?? TIERS[0];

// Read the Stripe price ID for a tier from Vite env. Returns null for free tier.
export const getPriceId = (slug: SubscriptionTier): string | null => {
  const tier = getTier(slug);
  if (!tier.priceIdEnv) return null;
  const value = (import.meta.env as Record<string, string | undefined>)[tier.priceIdEnv];
  return value ?? null;
};

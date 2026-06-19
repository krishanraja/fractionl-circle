// Tier catalogue for the Circle / Fractionl redesign.
// DB-level tier enum is `free | pro | executive`; display-level naming is
// Freemium / Operator / Chief of Staff. This file is the single source of
// truth for price labels, feature bullets, and Stripe price ID env vars.

import type { SubscriptionTier } from '@/hooks/useSubscription';

export interface TierDisplay {
  slug: SubscriptionTier;
  name: string;                   // User-facing tier name.
  tagline: string;
  priceMonthly: number;           // 0 for free.
  priceMonthlyLabel: string;      // "$30" etc.
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
      'One full thesis validation',
      'The complete read and next steps',
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
      'Unlimited thesis validations as you evolve',
      'Real warm reach from your full network',
      'Specific, named next moves',
      'Ongoing market monitoring',
    ],
    ctaLabel: 'Upgrade to Pro',
  },
  {
    slug: 'executive',
    name: 'Chief of Staff',
    tagline: 'Help me scale.',
    priceMonthly: 79,
    priceMonthlyLabel: '$79',
    priceIdEnv: 'VITE_STRIPE_EXEC_MONTHLY_PRICE_ID',
    highlighted: false,
    features: [
      'Unlimited Streams, unlimited Matches',
      'Sunday Letter as 90-second audio',
      'External signal feeds (RFPs, job changes, trends)',
      'Cross-user market intelligence',
      'Per-category auto-send consent',
      'Priority compute, white-glove concierge onboarding',
    ],
    ctaLabel: 'Upgrade to Chief of Staff',
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

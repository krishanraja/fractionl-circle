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
      'Voice onboarding + 3 proposed Ideas',
      'Drop LinkedIn CSV into your Circle',
      '1 Match surfaced per week',
      'Read-only People view, one enrichment pass',
      'Ask: 5 messages / week',
    ],
    ctaLabel: 'Current plan',
  },
  {
    slug: 'pro',
    name: 'Operator',
    tagline: 'Help me run.',
    priceMonthly: 30,
    priceMonthlyLabel: '$30',
    priceIdEnv: 'VITE_STRIPE_PRICE_OPERATOR',
    highlighted: true,
    features: [
      'Up to 3 active Streams with overnight Matches',
      '3 Matches surfaced per day',
      'Inbox + calendar connect (inferred Ledger)',
      'Ask with memory across sessions',
      'Sunday Letter as text',
      'LLM-powered Circle dedupe',
    ],
    ctaLabel: 'Upgrade to Operator',
  },
  {
    slug: 'executive',
    name: 'Chief of Staff',
    tagline: 'Help me scale.',
    priceMonthly: 79,
    priceMonthlyLabel: '$79',
    priceIdEnv: 'VITE_STRIPE_PRICE_CHIEF_OF_STAFF',
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

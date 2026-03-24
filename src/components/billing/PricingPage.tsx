import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles, Crown, Zap, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/constants/animation';
import { useSubscription, type SubscriptionTier } from '@/hooks/useSubscription';
import { haptics } from '@/utils/haptics';

// These should come from env/config - placeholder price IDs
const PRICE_IDS = {
  pro_monthly: import.meta.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly',
  pro_annual: import.meta.env.VITE_STRIPE_PRO_ANNUAL_PRICE_ID || 'price_pro_annual',
  executive_monthly: import.meta.env.VITE_STRIPE_EXEC_MONTHLY_PRICE_ID || 'price_exec_monthly',
  executive_annual: import.meta.env.VITE_STRIPE_EXEC_ANNUAL_PRICE_ID || 'price_exec_annual',
};

interface PricingPageProps {
  onClose?: () => void;
}

const features = [
  { name: 'Active clients', free: 'Up to 3', pro: 'Unlimited', exec: 'Unlimited' },
  { name: 'Voice logs / month', free: '20', pro: 'Unlimited', exec: 'Unlimited' },
  { name: 'AI insights / month', free: '10', pro: '100', exec: 'Unlimited' },
  { name: 'Activity history', free: '30 days', pro: 'Unlimited', exec: 'Unlimited' },
  { name: 'Morning briefing', free: 'Basic', pro: 'Full + actions', exec: 'Full + voice' },
  { name: 'Smart nudges', free: '3 / day', pro: 'Unlimited', exec: 'Custom rules' },
  { name: 'Network contacts', free: '25', pro: 'Unlimited', exec: 'Unlimited' },
  { name: 'Relationship health', free: '—', pro: true, exec: 'Predictions' },
  { name: 'Voice commands', free: 'Log only', pro: 'All commands', exec: 'Custom' },
  { name: 'Desktop dashboard', free: 'Basic', pro: 'Full', exec: 'Full + reports' },
  { name: 'Data export', free: '—', pro: 'CSV', exec: 'CSV + PDF' },
  { name: 'Integrations', free: '—', pro: 'Google Sheets', exec: 'Sheets + Calendar' },
  { name: 'Support', free: 'Community', pro: 'Email', exec: 'Priority' },
];

export const PricingPage = ({ onClose }: PricingPageProps) => {
  const { effectiveTier, isTrialing, openCheckout } = useSubscription();
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const handleUpgrade = async (tier: 'pro' | 'executive') => {
    haptics.medium();
    setLoadingTier(tier);
    try {
      const priceId = tier === 'pro'
        ? (billing === 'annual' ? PRICE_IDS.pro_annual : PRICE_IDS.pro_monthly)
        : (billing === 'annual' ? PRICE_IDS.executive_annual : PRICE_IDS.executive_monthly);
      await openCheckout(priceId);
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setLoadingTier(null);
    }
  };

  const tiers = [
    {
      id: 'free' as const,
      name: 'Free',
      icon: Zap,
      price: { monthly: 0, annual: 0 },
      description: 'Get started with the essentials',
      highlight: false,
    },
    {
      id: 'pro' as const,
      name: 'Pro',
      icon: Sparkles,
      price: { monthly: 29, annual: 290 },
      description: 'For active fractional executives',
      highlight: true,
      badge: 'Most Popular',
    },
    {
      id: 'executive' as const,
      name: 'Executive',
      icon: Crown,
      price: { monthly: 79, annual: 790 },
      description: 'Full power for portfolio leaders',
      highlight: false,
    },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="max-w-4xl mx-auto px-4 py-8"
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="text-center mb-8">
        <h1 className="text-title-1 text-foreground mb-2">Choose Your Plan</h1>
        <p className="text-body text-foreground-secondary max-w-md mx-auto">
          Upgrade to unlock AI intelligence, unlimited voice logging, and the full desktop experience.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setBilling('monthly')}
            className={cn(
              "px-4 py-2 rounded-xl text-caption font-medium transition-colors",
              billing === 'monthly' ? "bg-primary text-primary-foreground" : "text-foreground-secondary hover:text-foreground"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling('annual')}
            className={cn(
              "px-4 py-2 rounded-xl text-caption font-medium transition-colors relative",
              billing === 'annual' ? "bg-primary text-primary-foreground" : "text-foreground-secondary hover:text-foreground"
            )}
          >
            Annual
            <span className="absolute -top-2 -right-2 text-[9px] font-bold bg-success text-white px-1.5 py-0.5 rounded-full">
              -17%
            </span>
          </button>
        </div>
      </motion.div>

      {/* Tier Cards */}
      <motion.div variants={staggerItem} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {tiers.map((tier) => {
          const isCurrent = tier.id === effectiveTier;
          const price = billing === 'annual' ? tier.price.annual : tier.price.monthly;
          const monthlyEquiv = billing === 'annual' && tier.price.annual > 0
            ? Math.round(tier.price.annual / 12)
            : tier.price.monthly;

          return (
            <Card
              key={tier.id}
              className={cn(
                "relative overflow-hidden transition-all",
                tier.highlight && "border-primary shadow-lg shadow-primary/10 scale-[1.02]",
                isCurrent && "ring-2 ring-primary"
              )}
            >
              {tier.badge && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                  {tier.badge}
                </div>
              )}
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <tier.icon className="w-5 h-5 text-primary" />
                  <h3 className="text-title-3 text-foreground">{tier.name}</h3>
                </div>

                <div className="mb-1">
                  <span className="text-display text-foreground">
                    ${monthlyEquiv}
                  </span>
                  {tier.price.monthly > 0 && (
                    <span className="text-caption text-foreground-secondary"> /mo</span>
                  )}
                </div>
                {billing === 'annual' && tier.price.annual > 0 && (
                  <p className="text-caption text-foreground-muted mb-3">
                    ${price} billed annually
                  </p>
                )}

                <p className="text-caption text-foreground-secondary mb-5">
                  {tier.description}
                </p>

                {tier.id === 'free' ? (
                  <Button
                    variant="outline"
                    className="w-full rounded-xl"
                    disabled={isCurrent}
                  >
                    {isCurrent ? 'Current Plan' : 'Downgrade'}
                  </Button>
                ) : (
                  <Button
                    className={cn(
                      "w-full rounded-xl",
                      tier.highlight && "shadow-purple"
                    )}
                    disabled={isCurrent || loadingTier === tier.id}
                    onClick={() => handleUpgrade(tier.id)}
                  >
                    {loadingTier === tier.id ? (
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : isCurrent ? (
                      'Current Plan'
                    ) : (
                      <>
                        Upgrade to {tier.name}
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      {/* Feature Comparison */}
      <motion.div variants={staggerItem}>
        <h2 className="text-title-2 text-foreground text-center mb-6">Compare Features</h2>
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-foreground-secondary font-medium">Feature</th>
                    <th className="text-center p-4 text-foreground-secondary font-medium">Free</th>
                    <th className="text-center p-4 text-primary font-medium">Pro</th>
                    <th className="text-center p-4 text-foreground-secondary font-medium">Executive</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((feature, i) => (
                    <tr key={i} className={cn("border-b border-border/50", i % 2 === 0 && "bg-secondary/20")}>
                      <td className="p-4 text-foreground">{feature.name}</td>
                      <td className="p-4 text-center text-foreground-secondary">
                        {renderFeatureValue(feature.free)}
                      </td>
                      <td className="p-4 text-center text-foreground">
                        {renderFeatureValue(feature.pro)}
                      </td>
                      <td className="p-4 text-center text-foreground">
                        {renderFeatureValue(feature.exec)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

function renderFeatureValue(value: string | boolean) {
  if (value === true) return <Check className="w-4 h-4 text-success mx-auto" />;
  if (value === '—') return <span className="text-foreground-muted">—</span>;
  return value;
}

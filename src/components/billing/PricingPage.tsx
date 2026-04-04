import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles, Crown, Zap, ArrowRight, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/constants/animation';
import { useSubscription, type SubscriptionTier } from '@/hooks/useSubscription';
import { haptics } from '@/utils/haptics';
import { toast } from 'sonner';

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
  { name: 'Circle contacts', free: '25', pro: 'Unlimited', exec: 'Unlimited' },
  { name: 'Relationship health', free: '-', pro: true, exec: 'Predictions' },
  { name: 'Voice commands', free: 'Log only', pro: 'All commands', exec: 'Custom' },
  { name: 'Desktop dashboard', free: 'Basic', pro: 'Full', exec: 'Full + reports' },
  { name: 'Data export', free: '-', pro: 'CSV', exec: 'CSV + PDF' },
  { name: 'Integrations', free: '-', pro: 'Google Sheets', exec: 'Sheets + Calendar' },
  { name: 'Support', free: 'Community', pro: 'Email', exec: 'Priority' },
];

export const PricingPage = ({ onClose }: PricingPageProps) => {
  const { effectiveTier, isTrialing, trialDaysRemaining, openCheckout, openPortal, tier } = useSubscription();
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
      {/* Trial Notice */}
      {isTrialing && trialDaysRemaining > 0 && (
        <motion.div
          variants={staggerItem}
          className={cn(
            "flex items-center justify-center gap-2 px-4 py-3 rounded-xl mb-6 text-caption font-medium",
            trialDaysRemaining <= 3
              ? "bg-warning/10 text-warning border border-warning/20"
              : "bg-primary/10 text-primary border border-primary/20"
          )}
        >
          <Clock className="w-4 h-4" />
          <span>
            Your Pro trial ends in {trialDaysRemaining} day{trialDaysRemaining === 1 ? '' : 's'}. Subscribe now to keep full access.
          </span>
        </motion.div>
      )}

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
        {tiers.map((planTier) => {
          const isCurrent = planTier.id === effectiveTier && !isTrialing;
          const isTrialTier = isTrialing && planTier.id === effectiveTier;
          const price = billing === 'annual' ? planTier.price.annual : planTier.price.monthly;
          const monthlyEquiv = billing === 'annual' && planTier.price.annual > 0
            ? Math.round(planTier.price.annual / 12)
            : planTier.price.monthly;

          const renderButton = () => {
            if (planTier.id === 'free') {
              if (tier === 'free') {
                return (
                  <Button variant="outline" className="w-full rounded-xl" disabled>
                    {isTrialing ? 'After trial ends' : 'Current Plan'}
                  </Button>
                );
              }
              return (
                <Button
                  variant="outline"
                  className="w-full rounded-xl"
                  onClick={() => {
                    haptics.light();
                    openPortal().catch(() => toast.error('Unable to open billing portal.'));
                  }}
                >
                  Manage Billing
                </Button>
              );
            }

            if (isCurrent) {
              return (
                <Button className={cn("w-full rounded-xl", planTier.highlight && "shadow-purple")} disabled>
                  Current Plan
                </Button>
              );
            }

            return (
              <Button
                className={cn("w-full rounded-xl", planTier.highlight && "shadow-purple")}
                disabled={loadingTier === planTier.id}
                onClick={() => handleUpgrade(planTier.id)}
              >
                {loadingTier === planTier.id ? (
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : isTrialTier ? (
                  <>
                    Subscribe to keep {planTier.name}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                ) : (
                  <>
                    Upgrade to {planTier.name}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            );
          };

          return (
            <Card
              key={planTier.id}
              className={cn(
                "relative overflow-hidden transition-all",
                planTier.highlight && "border-primary shadow-lg shadow-primary/10 scale-[1.02]",
                (isCurrent || isTrialTier) && "ring-2 ring-primary"
              )}
            >
              {planTier.badge && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                  {planTier.badge}
                </div>
              )}
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <planTier.icon className="w-5 h-5 text-primary" />
                  <h3 className="text-title-3 text-foreground">{planTier.name}</h3>
                  {isTrialTier && (
                    <span className="text-[10px] font-semibold bg-warning/15 text-warning px-2 py-0.5 rounded-full">
                      Trial
                    </span>
                  )}
                </div>

                <div className="mb-1">
                  <span className="text-display text-foreground">
                    ${monthlyEquiv}
                  </span>
                  {planTier.price.monthly > 0 && (
                    <span className="text-caption text-foreground-secondary"> /mo</span>
                  )}
                </div>
                {billing === 'annual' && planTier.price.annual > 0 && (
                  <p className="text-caption text-foreground-muted mb-3">
                    ${price} billed annually
                  </p>
                )}

                <p className="text-caption text-foreground-secondary mb-5">
                  {planTier.description}
                </p>

                {renderButton()}
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
  if (value === '-') return <span className="text-foreground-muted">-</span>;
  return value;
}

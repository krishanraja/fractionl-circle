import { motion } from 'framer-motion';
import { Sparkles, Crown, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubscription, type SubscriptionTier } from '@/hooks/useSubscription';

interface SubscriptionBadgeProps {
  className?: string;
  showTrialDays?: boolean;
}

const tierConfig = {
  free: {
    icon: Zap,
    label: 'Free',
    colors: 'bg-secondary text-foreground-secondary',
  },
  pro: {
    icon: Sparkles,
    label: 'Pro',
    colors: 'bg-primary/15 text-primary',
  },
  executive: {
    icon: Crown,
    label: 'Executive',
    colors: 'bg-gradient-to-r from-amber-500/15 to-primary/15 text-amber-400',
  },
};

export const SubscriptionBadge = ({ className, showTrialDays = true }: SubscriptionBadgeProps) => {
  const { effectiveTier, isTrialing, trialDaysRemaining } = useSubscription();
  const config = tierConfig[effectiveTier];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold",
        config.colors,
        className
      )}
    >
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
      {isTrialing && showTrialDays && (
        <span className="text-[10px] opacity-70">
          · {trialDaysRemaining}d trial
        </span>
      )}
    </motion.div>
  );
};

/**
 * Trial banner shown at top of app during trial period
 */
export const TrialBanner = ({ onUpgrade }: { onUpgrade?: () => void }) => {
  const { isTrialing, trialDaysRemaining, effectiveTier } = useSubscription();

  if (!isTrialing || trialDaysRemaining <= 0) return null;

  const urgent = trialDaysRemaining <= 3;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      className={cn(
        "w-full px-4 py-2 flex items-center justify-center gap-2 text-caption font-medium",
        urgent
          ? "bg-warning/10 text-warning border-b border-warning/20"
          : "bg-primary/10 text-primary border-b border-primary/20"
      )}
    >
      <Sparkles className="w-3.5 h-3.5" />
      <span>
        {urgent
          ? `Your Pro trial ends in ${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'}!`
          : `${trialDaysRemaining} days left in your Pro trial`}
      </span>
      <button
        onClick={onUpgrade}
        className="ml-1 underline underline-offset-2 font-semibold hover:opacity-80 transition-opacity"
      >
        Upgrade now
      </button>
    </motion.div>
  );
};

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, ArrowRight, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';
import { haptics } from '@/utils/haptics';
import { toast } from 'sonner';

interface UpgradePromptProps {
  feature: string;
  message: string;
  compact?: boolean;
  className?: string;
  onUpgradeClick?: () => void;
}

const PRICE_IDS = {
  pro_monthly: import.meta.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly',
};

export const UpgradePrompt = ({ feature, message, compact = false, className, onUpgradeClick }: UpgradePromptProps) => {
  const { openCheckout, effectiveTier } = useSubscription();
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  if (dismissed) return null;

  const handleUpgrade = async () => {
    haptics.medium();
    if (onUpgradeClick) {
      onUpgradeClick();
      return;
    }
    if (!PRICE_IDS.pro_monthly || PRICE_IDS.pro_monthly === 'price_pro_monthly') {
      toast.info('Upgrade coming soon — contact us for early access');
      return;
    }
    setLoading(true);
    try {
      await openCheckout(PRICE_IDS.pro_monthly);
    } catch {
      toast.error('Unable to open checkout. Please try again.');
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20",
          className
        )}
      >
        <Lock className="w-3.5 h-3.5 text-primary flex-shrink-0" />
        <span className="text-caption text-foreground-secondary flex-1">{message}</span>
        <button
          onClick={handleUpgrade}
          className="text-[11px] font-semibold text-primary hover:text-primary/80 whitespace-nowrap"
        >
          Upgrade
        </button>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className={cn(
          "relative rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5",
          className
        )}
      >
        <button
          onClick={() => { setDismissed(true); haptics.tap(); }}
          className="absolute top-3 right-3 p-1 rounded-lg hover:bg-secondary/50 transition-colors"
        >
          <X className="w-3.5 h-3.5 text-foreground-muted" />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-body-bold text-foreground mb-1">Unlock {feature}</p>
            <p className="text-caption text-foreground-secondary mb-3">{message}</p>
            <Button
              size="sm"
              className="rounded-xl gap-1.5"
              onClick={handleUpgrade}
              disabled={loading}
            >
              {loading ? (
                <span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  Upgrade to Pro
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Usage limit warning that appears when approaching limits
 */
interface UsageLimitProps {
  feature: string;
  used: number;
  limit: number;
  className?: string;
  onUpgradeClick?: () => void;
}

export const UsageLimitWarning = ({ feature, used, limit, className, onUpgradeClick }: UsageLimitProps) => {
  const percent = Math.min((used / limit) * 100, 100);
  if (percent < 75) return null;

  const isAtLimit = used >= limit;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className={cn(
        "rounded-xl border px-3 py-2.5",
        isAtLimit ? "border-destructive/30 bg-destructive/5" : "border-warning/30 bg-warning/5",
        className
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-caption font-medium text-foreground">
          {isAtLimit ? `${feature} limit reached` : `${used}/${limit} ${feature} used`}
        </span>
        <button
          onClick={() => { onUpgradeClick?.(); haptics.light(); }}
          className="text-[11px] font-semibold text-primary"
        >
          Upgrade
        </button>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          className={cn(
            "h-full rounded-full",
            isAtLimit ? "bg-destructive" : "bg-warning"
          )}
        />
      </div>
    </motion.div>
  );
};

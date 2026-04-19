import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, Sparkles, ExternalLink } from 'lucide-react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TIERS, getPriceId } from '@/lib/tiers';
import { useSubscription, type SubscriptionTier } from '@/hooks/useSubscription';

interface PricingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: string;               // Optional nudge copy (e.g. "Matches over the free-tier limit.")
}

const PricingBody = ({ reason, onClose }: { reason?: string; onClose: () => void }) => {
  const { tier, openCheckout, openPortal, isProOrAbove } = useSubscription();
  const [busy, setBusy] = useState<SubscriptionTier | null>(null);

  const handleUpgrade = async (slug: SubscriptionTier) => {
    const priceId = getPriceId(slug);
    if (!priceId) {
      toast.error('Pricing is not configured yet. Run scripts/setup-stripe-products.mjs.');
      return;
    }
    setBusy(slug);
    try {
      await openCheckout(priceId);
    } catch (e) {
      setBusy(null);
      toast.error(e instanceof Error ? e.message : 'Checkout failed');
    }
  };

  const handlePortal = async () => {
    setBusy('free');
    try {
      await openPortal();
    } catch (e) {
      setBusy(null);
      toast.error(e instanceof Error ? e.message : 'Could not open billing portal');
    }
  };

  return (
    <div className="p-6 pt-3 pb-safe-bottom">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">Pick your tier</h2>
        {reason && (
          <p className="mt-1 text-sm text-foreground-secondary leading-relaxed">{reason}</p>
        )}
      </div>

      <div className="space-y-3">
        {TIERS.map((t) => {
          const isCurrent = tier === t.slug;
          const isUpgrade = !isCurrent && t.slug !== 'free';
          const isDowngrade = !isCurrent && t.slug === 'free' && isProOrAbove;
          return (
            <motion.section
              key={t.slug}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'rounded-2xl border p-4',
                t.highlighted ? 'border-primary/50 bg-primary/5' : 'border-border/60 bg-card/50',
                'backdrop-blur'
              )}
            >
              <header className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-foreground">{t.name}</h3>
                    {t.highlighted && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        <Sparkles className="w-2.5 h-2.5" /> Most picked
                      </span>
                    )}
                    {isCurrent && (
                      <span className="inline-flex items-center rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] font-medium text-foreground-secondary">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-foreground-secondary">{t.tagline}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-foreground leading-none">{t.priceMonthlyLabel}</p>
                  {t.priceMonthly > 0 && <p className="text-[11px] text-foreground-muted mt-0.5">/ month</p>}
                </div>
              </header>
              <ul className="mt-2 space-y-1.5">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-foreground leading-relaxed">
                    <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {isUpgrade && (
                <button
                  onClick={() => handleUpgrade(t.slug)}
                  disabled={!!busy}
                  className={cn(
                    'mt-3 w-full h-10 rounded-full bg-primary text-primary-foreground text-sm font-medium',
                    'inline-flex items-center justify-center gap-1.5 shadow-sm shadow-primary/20',
                    'disabled:opacity-60'
                  )}
                >
                  {busy === t.slug ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  {t.ctaLabel}
                </button>
              )}

              {isDowngrade && (
                <button
                  onClick={handlePortal}
                  disabled={!!busy}
                  className="mt-3 w-full h-10 rounded-full border border-border/60 bg-card/60 backdrop-blur text-sm font-medium text-foreground-secondary inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  Cancel or manage plan
                </button>
              )}

              {isCurrent && t.slug !== 'free' && (
                <button
                  onClick={handlePortal}
                  disabled={!!busy}
                  className="mt-3 w-full h-10 rounded-full border border-border/60 bg-card/60 backdrop-blur text-sm font-medium text-foreground-secondary inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  Manage in Stripe portal
                </button>
              )}
            </motion.section>
          );
        })}
      </div>

      <button
        onClick={onClose}
        className="mt-4 w-full text-xs text-foreground-muted hover:text-foreground-secondary"
      >
        Not now
      </button>
    </div>
  );
};

export const PricingSheet = ({ open, onOpenChange, reason }: PricingSheetProps) => {
  const isMobile = useIsMobile();
  const body = <PricingBody reason={reason} onClose={() => onOpenChange(false)} />;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh]">
          <div className="overflow-y-auto">{body}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <div className="max-h-[80vh] overflow-y-auto">{body}</div>
      </DialogContent>
    </Dialog>
  );
};

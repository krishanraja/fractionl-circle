import { useState } from 'react';
import { motion } from 'framer-motion';
import { HeartHandshake, Check, Calendar, Sparkles, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';
import { useConcierge, type ConciergeRequest } from '@/hooks/useConcierge';
import { ConciergeBookingSheet } from '@/components/billing/ConciergeBookingSheet';

// Phase 11: Chief-of-Staff-tier concierge banner on Today. Gated on the
// executive tier; shows different copy per request state.

const STATE_LABELS: Record<ConciergeRequest['status'], string> = {
  requested: 'Request in',
  scheduled: 'Call scheduled',
  in_progress: 'We\'re on it',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

function formatStats(stats: Record<string, unknown> | null | undefined): string {
  if (!stats) return '';
  const bits: string[] = [];
  if (typeof stats.circle_new === 'number') bits.push(`${stats.circle_new} new`);
  if (typeof stats.circle_merged === 'number') bits.push(`${stats.circle_merged} merged`);
  if (typeof stats.sources_ingested === 'number') bits.push(`${stats.sources_ingested} sources`);
  return bits.join(' · ');
}

export const ConciergeCard = () => {
  const { isExecutive, loading: subLoading } = useSubscription();
  const concierge = useConcierge();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (subLoading || concierge.loading) return null;
  if (!isExecutive) return null;
  if (!concierge.showCard) return null;

  const r = concierge.request;
  const noRequest = !r || r.status === 'cancelled';

  const handleCancel = async () => {
    try {
      await concierge.cancel();
      toast.success('Request cancelled.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not cancel');
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'mb-6 rounded-2xl p-5',
        'border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent',
        'backdrop-blur'
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-primary/15 p-1.5">
            <HeartHandshake className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Chief of Staff · Concierge
            </p>
            {r && r.status !== 'cancelled' && (
              <p className="text-[11px] text-foreground-muted">
                {STATE_LABELS[r.status]}
                {r.scheduled_at && ` · ${new Date(r.scheduled_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`}
              </p>
            )}
          </div>
        </div>
        {concierge.isActive && r && r.status !== 'in_progress' && (
          <button
            onClick={handleCancel}
            className="text-[11px] text-foreground-muted hover:text-foreground inline-flex items-center gap-1"
            aria-label="Cancel request"
          >
            <X className="w-3 h-3" /> Cancel
          </button>
        )}
      </div>

      {noRequest && (
        <>
          <p className="text-sm text-foreground leading-relaxed">
            Book a 15-minute call and drop us your existing data (LinkedIn export, legacy CRM, Sheets).
            We normalize your Circle end-to-end within 24 hours.
          </p>
          <button
            onClick={() => setSheetOpen(true)}
            className={cn(
              'mt-4 w-full h-11 rounded-full bg-primary text-primary-foreground text-sm font-medium',
              'inline-flex items-center justify-center gap-2 shadow-lg shadow-primary/25'
            )}
          >
            <Calendar className="w-4 h-4" />
            Book your concierge onboarding
          </button>
        </>
      )}

      {r?.status === 'requested' && (
        <>
          <p className="text-sm text-foreground leading-relaxed">
            Your request landed. We'll reach out within <span className="font-medium">24 hours</span> to
            confirm a time. No need to do anything else.
          </p>
          <div className="mt-3 rounded-xl border border-border/50 bg-background/60 p-3 text-xs text-foreground-secondary">
            {r.preferred_times ? (
              <p><span className="font-medium text-foreground">When:</span> {r.preferred_times}</p>
            ) : (
              <p className="italic">No preferred times specified — we'll propose a few slots.</p>
            )}
          </div>
        </>
      )}

      {r?.status === 'scheduled' && (
        <p className="text-sm text-foreground leading-relaxed">
          Your call is locked in{r.scheduled_at ? ` for ${new Date(r.scheduled_at).toLocaleString()}` : ''}
          {r.assigned_to ? ` with ${r.assigned_to}` : ''}. We'll start normalizing right after.
        </p>
      )}

      {r?.status === 'in_progress' && (
        <div className="flex items-start gap-3">
          <Loader2 className="w-4 h-4 text-primary mt-0.5 animate-spin shrink-0" />
          <p className="text-sm text-foreground leading-relaxed">
            Your ops agent is normalizing and deduping your Circle right now. We'll deliver within
            the next few hours.
          </p>
        </div>
      )}

      {r?.status === 'delivered' && (
        <>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-success/15 p-1.5">
              <Check className="w-4 h-4 text-success" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Your Circle is ready.</p>
              {r.result_stats && formatStats(r.result_stats) && (
                <p className="mt-0.5 text-xs text-foreground-secondary">
                  {formatStats(r.result_stats)}
                </p>
              )}
              {r.ops_notes && (
                <p className="mt-2 text-xs text-foreground-secondary leading-relaxed whitespace-pre-wrap">
                  {r.ops_notes}
                </p>
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-foreground-muted">
            <Sparkles className="w-3 h-3" />
            <span>Matches should start landing overnight.</span>
          </div>
        </>
      )}

      <ConciergeBookingSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSubmitted={() => void concierge.refresh()}
      />
    </motion.section>
  );
};

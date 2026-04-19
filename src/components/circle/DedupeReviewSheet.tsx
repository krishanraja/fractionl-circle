import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Loader2, Sparkles, Users2 } from 'lucide-react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { DedupeSuggestion, DedupePerson } from '@/hooks/useCircleDedupe';
import { suggestionKey } from '@/hooks/useCircleDedupe';

interface DedupeReviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: DedupeSuggestion[];
  scanning: boolean;
  merging: string | null;
  lastScan: { scanned: number; chunks: number } | null;
  onScan: () => Promise<unknown>;
  onAccept: (s: DedupeSuggestion) => Promise<unknown>;
  onReject: (s: DedupeSuggestion) => void;
}

const line = (p: DedupePerson): string => {
  const bits = [p.title, p.company].filter(Boolean).join(' · ');
  return bits || (p.primary_email ?? p.linkedin_url ?? 'no detail');
};

const Confidence = ({ value }: { value: number }) => {
  const pct = Math.round(value * 100);
  const tone = value >= 0.92
    ? 'bg-success/15 text-success'
    : value >= 0.85
      ? 'bg-primary/15 text-primary'
      : 'bg-warning/15 text-warning';
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium', tone)}>
      {pct}% match
    </span>
  );
};

const Row = ({ p }: { p: DedupePerson }) => (
  <div className="flex-1 rounded-xl border border-border/60 bg-card/60 backdrop-blur p-3">
    <p className="text-sm font-semibold text-foreground truncate">{p.display_name}</p>
    <p className="text-xs text-foreground-secondary truncate">{line(p)}</p>
  </div>
);

const SheetBody = ({
  suggestions,
  scanning,
  merging,
  lastScan,
  onScan,
  onAccept,
  onReject,
}: Omit<DedupeReviewSheetProps, 'open' | 'onOpenChange'>) => {
  const sorted = useMemo(
    () => [...suggestions].sort((a, b) => b.confidence - a.confidence),
    [suggestions]
  );

  return (
    <div className="p-6 pt-3 pb-safe-bottom">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Review duplicates</h2>
          <p className="mt-1 text-sm text-foreground-secondary">
            {scanning
              ? 'Scanning your Circle…'
              : lastScan
                ? `Scanned ${lastScan.scanned} · ${suggestions.length} likely pair${suggestions.length === 1 ? '' : 's'}`
                : 'Run a scan to find likely duplicates.'}
          </p>
        </div>
        {!scanning && (
          <button
            onClick={onScan}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 backdrop-blur',
              'px-3 h-8 text-xs font-medium text-foreground-secondary hover:text-foreground'
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {lastScan ? 'Re-scan' : 'Scan now'}
          </button>
        )}
      </div>

      <AnimatePresence initial={false} mode="popLayout">
        {scanning && !sorted.length && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-12 gap-3"
          >
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="text-xs text-foreground-secondary">Reading your Circle…</p>
          </motion.div>
        )}

        {!scanning && !sorted.length && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-12 gap-3 text-center"
          >
            <div className="rounded-full bg-primary/10 p-3">
              <Users2 className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm text-foreground">
              {lastScan ? 'No duplicates found.' : 'Tap Scan now to start.'}
            </p>
            {lastScan && (
              <p className="text-xs text-foreground-muted">
                Your Circle is clean. I'll check again after the next ingestion.
              </p>
            )}
          </motion.div>
        )}

        <div className="space-y-4">
          {sorted.map((s) => {
            const key = suggestionKey(s);
            const busy = merging === key;
            return (
              <motion.article
                key={key}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <Confidence value={s.confidence} />
                  {s.rationale && (
                    <p className="text-[11px] text-foreground-muted truncate max-w-[220px]">
                      {s.rationale}
                    </p>
                  )}
                </div>
                <div className="flex items-stretch gap-2">
                  <Row p={s.a} />
                  <div className="flex items-center text-[11px] text-foreground-muted">=</div>
                  <Row p={s.b} />
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={async () => {
                      try {
                        await onAccept(s);
                        toast.success('Merged.');
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : 'Merge failed');
                      }
                    }}
                    disabled={busy}
                    className={cn(
                      'flex-1 h-10 rounded-full bg-primary text-primary-foreground text-sm font-medium',
                      'inline-flex items-center justify-center gap-1.5 shadow-sm shadow-primary/20',
                      'disabled:opacity-60'
                    )}
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Same person
                  </button>
                  <button
                    onClick={() => onReject(s)}
                    disabled={busy}
                    className="h-10 px-4 rounded-full border border-border/60 bg-card/60 backdrop-blur text-sm font-medium text-foreground-secondary inline-flex items-center gap-1.5 disabled:opacity-60"
                  >
                    <X className="w-4 h-4" />
                    Different
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
      </AnimatePresence>
    </div>
  );
};

export const DedupeReviewSheet = (props: DedupeReviewSheetProps) => {
  const isMobile = useIsMobile();
  const body = <SheetBody {...props} />;

  if (isMobile) {
    return (
      <Drawer open={props.open} onOpenChange={props.onOpenChange}>
        <DrawerContent className="max-h-[92vh]">
          <div className="overflow-y-auto">{body}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <div className="max-h-[80vh] overflow-y-auto">{body}</div>
      </DialogContent>
    </Dialog>
  );
};

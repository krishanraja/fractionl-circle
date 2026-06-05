import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Upload, Mic, Sparkles, AlertCircle, Users2, ChevronDown, Camera, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCircle } from '@/hooks/useCircle';
import { useCircleDedupe } from '@/hooks/useCircleDedupe';
import { AddSourceSheet } from '@/components/circle/AddSourceSheet';
import { AddToCircleSheet } from '@/components/circle/AddToCircleSheet';
import { DedupeReviewSheet } from '@/components/circle/DedupeReviewSheet';
import { CirclePeopleList } from '@/components/circle/CirclePeopleList';
import type { Source } from '@/hooks/useCircle';
import { haptics } from '@/utils/haptics';
import { CIRCLE_DATA_CHANGED, type CircleIntent } from '@/pages/Index';

const SOURCE_ICON = (kind: Source['kind']) => {
  switch (kind) {
    case 'linkedin_csv':
    case 'linkedin_extension':
      return Upload;
    case 'voice_seed':
      return Mic;
    case 'business_card_photo':
      return Camera;
    case 'manual_add':
      return UserPlus;
    default:
      return Sparkles;
  }
};

const SOURCE_LABEL = (kind: Source['kind']) => {
  switch (kind) {
    case 'linkedin_csv': return 'LinkedIn export';
    case 'linkedin_extension': return 'LinkedIn extension';
    case 'voice_seed': return 'Voice seed';
    case 'google': return 'Google';
    case 'microsoft': return 'Microsoft';
    case 'ios_contacts': return 'iPhone contacts';
    case 'business_card_photo': return 'Quick adds (photo)';
    case 'manual_add': return 'Quick adds';
    default: return kind.replace(/_/g, ' ');
  }
};

interface CircleScreenProps {
  /** When the user arrives via a deep-link CTA, open the matching add flow:
   *  'import' → the source/LinkedIn sheet, 'add' → quick-add. */
  initialAction?: CircleIntent | null;
  onActionConsumed?: () => void;
}

export const CircleScreen = ({ initialAction, onActionConsumed }: CircleScreenProps = {}) => {
  const { totalPeople, sources, loading, refresh } = useCircle();
  const dedupe = useCircleDedupe();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [dedupeOpen, setDedupeOpen] = useState(false);

  // Honor a deep-link intent once, then tell the parent to clear it so the
  // sheet doesn't re-open on the next render.
  useEffect(() => {
    if (!initialAction) return;
    if (initialAction === 'import') setSheetOpen(true);
    else if (initialAction === 'add') setAddOpen(true);
    onActionConsumed?.();
  }, [initialAction, onActionConsumed]);

  const openDedupe = async () => {
    setDedupeOpen(true);
    if (!dedupe.lastScan && !dedupe.scanning) {
      try {
        await dedupe.scan();
      } catch {
        // toast surfaced inside the sheet on action failure; scan errors rare
      }
    }
  };

  // Refresh when an external action (OAuth sync, share-sheet add) signals
  // that Circle data has changed.
  useEffect(() => {
    const handler = () => { void refresh(); };
    window.addEventListener(CIRCLE_DATA_CHANGED, handler);
    return () => window.removeEventListener(CIRCLE_DATA_CHANGED, handler);
  }, [refresh]);

  // Keyboard shortcuts: Cmd/Ctrl+N opens Add. We bail when the user is
  // already typing somewhere so we don't steal "n" from a text field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'n') return;
      const t = e.target as HTMLElement | null;
      if (t?.tagName === 'INPUT' || t?.tagName === 'TEXTAREA' || t?.isContentEditable) return;
      e.preventDefault();
      haptics.tap();
      setAddOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const activeSources = useMemo(
    () => sources.filter((s) => s.status === 'active' || s.status === 'ingesting'),
    [sources]
  );
  const failedSources = useMemo(
    () => sources.filter((s) => s.status === 'failed'),
    [sources]
  );

  // Default the disclosure open when there's nothing else to do (empty Circle),
  // collapsed once the user has people to scroll.
  const sourcesOpenByDefault = !loading && totalPeople === 0;

  return (
    <div className="min-h-full bg-background px-4 pt-6 pb-24 lg:px-8 lg:mx-auto lg:max-w-4xl">
      <motion.header
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-display text-foreground">
            Your Circle
          </h1>
          <div className="flex items-center gap-3">
            {!loading && (
              <span className="text-sm font-medium text-foreground-secondary tabular-nums">
                {totalPeople.toLocaleString()}
              </span>
            )}
            <button
              onClick={() => {
                haptics.tap();
                setAddOpen(true);
              }}
              aria-label="Add to Circle"
              title="Add to Circle (⌘N)"
              className={cn(
                'shrink-0 w-11 h-11 rounded-full flex items-center justify-center',
                'bg-primary text-primary-foreground shadow-md shadow-primary/25',
                'hover:shadow-lg hover:shadow-primary/35 transition-all',
                'active:scale-95 transition-transform duration-100'
              )}
            >
              <Plus className="w-5 h-5" strokeWidth={2.5} />
            </button>
          </div>
        </div>
        <p className="mt-1.5 text-sm text-foreground-secondary">
          Every person you know, across every source — unified.
        </p>
      </motion.header>

      <CirclePeopleList
        totalPeople={totalPeople}
        circleLoading={loading}
        onQuickAdd={() => setAddOpen(true)}
      />

      <details
        key={sourcesOpenByDefault ? 'open' : 'closed'}
        open={sourcesOpenByDefault}
        className="group rounded-2xl border border-border/60 bg-card/30 backdrop-blur"
      >
        <summary
          className={cn(
            'flex items-center justify-between gap-2 cursor-pointer list-none',
            'px-4 py-3 select-none'
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Users2 className="w-4 h-4 text-foreground-secondary shrink-0" />
            <span className="text-sm font-medium text-foreground">Sources & tools</span>
            {!loading && activeSources.length > 0 && (
              <span className="text-[11px] text-foreground-muted truncate">
                · {activeSources.length} connected
              </span>
            )}
          </div>
          <ChevronDown className="w-4 h-4 text-foreground-muted shrink-0 transition-transform group-open:rotate-180" />
        </summary>

        <div className="px-4 pb-4 space-y-4">
          {!loading && activeSources.length > 0 && (
            <section>
              <h2 className="text-xs font-medium uppercase tracking-wide text-foreground-secondary mb-2">
                Sources
              </h2>
              <div className="space-y-2">
                {activeSources.map((src) => {
                  const Icon = SOURCE_ICON(src.kind);
                  return (
                    <div
                      key={src.id}
                      className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 backdrop-blur p-3"
                    >
                      <div className="rounded-full bg-primary/10 p-2">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {SOURCE_LABEL(src.kind)}
                        </p>
                        <p className="text-[11px] text-foreground-muted">
                          {src.last_ingested_at
                            ? `Last ingested ${new Date(src.last_ingested_at).toLocaleDateString()}`
                            : 'In progress…'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {!loading && failedSources.length > 0 && (
            <section className="space-y-2">
              {failedSources.map((src) => (
                <div
                  key={src.id}
                  className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3"
                >
                  <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {SOURCE_LABEL(src.kind)} failed
                    </p>
                    {src.last_error && (
                      <p className="text-[11px] text-foreground-muted truncate">
                        {src.last_error}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </section>
          )}

          <div className="space-y-2">
            <button
              onClick={() => setSheetOpen(true)}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl',
                'border border-border/60 bg-card/50 backdrop-blur hover:bg-card',
                'text-sm font-medium text-foreground transition-colors'
              )}
            >
              <Plus className="w-4 h-4" />
              Add a source
            </button>

            {!loading && totalPeople >= 2 && (
              <button
                onClick={openDedupe}
                className={cn(
                  'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl',
                  'text-xs font-medium text-foreground-secondary hover:text-foreground transition-colors'
                )}
              >
                <Users2 className="w-3.5 h-3.5" />
                {dedupe.suggestions.length > 0
                  ? `Review ${dedupe.suggestions.length} likely duplicate${dedupe.suggestions.length === 1 ? '' : 's'}`
                  : 'Find duplicates'}
              </button>
            )}
          </div>
        </div>
      </details>

      {/* Sticky FAB — visible on the Circle tab only, above the bottom nav.
          Same handler as the header "+" so adding is always one tap away. */}
      {!loading && totalPeople > 0 && (
        <motion.button
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 26, delay: 0.15 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            haptics.tap();
            setAddOpen(true);
          }}
          aria-label="Add to Circle"
          className={cn(
            'fixed right-5 z-40 w-14 h-14 rounded-full',
            'bg-primary text-primary-foreground',
            'shadow-[0_8px_24px_-4px_hsl(263_70%_50%/0.45),_0_2px_6px_-1px_hsl(263_70%_50%/0.25)]',
            'flex items-center justify-center hover:shadow-[0_12px_32px_-4px_hsl(263_70%_50%/0.5)] transition-shadow'
          )}
          style={{ bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' }}
        >
          <Plus className="w-6 h-6" strokeWidth={2.5} />
        </motion.button>
      )}

      <AddToCircleSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={() => {
          void refresh();
        }}
        onConnectSourceClick={() => {
          setAddOpen(false);
          // Wait for the close animation to settle before opening the next
          // sheet so they don't fight for the focus trap.
          window.setTimeout(() => setSheetOpen(true), 200);
        }}
      />

      <AddSourceSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onIngested={() => {
          void refresh();
        }}
      />

      <DedupeReviewSheet
        open={dedupeOpen}
        onOpenChange={setDedupeOpen}
        suggestions={dedupe.suggestions}
        scanning={dedupe.scanning}
        merging={dedupe.merging}
        lastScan={dedupe.lastScan}
        onScan={dedupe.scan}
        onAccept={async (s) => {
          await dedupe.accept(s);
          void refresh();
        }}
        onReject={dedupe.reject}
      />
    </div>
  );
};

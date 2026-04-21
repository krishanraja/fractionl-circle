import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Upload, Mic, Sparkles, AlertCircle, Users2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCircle } from '@/hooks/useCircle';
import { useCircleDedupe } from '@/hooks/useCircleDedupe';
import { AddSourceSheet } from '@/components/circle/AddSourceSheet';
import { DedupeReviewSheet } from '@/components/circle/DedupeReviewSheet';
import type { Source } from '@/hooks/useCircle';

const SOURCE_ICON = (kind: Source['kind']) => {
  switch (kind) {
    case 'linkedin_csv':
    case 'linkedin_extension':
      return Upload;
    case 'voice_seed':
      return Mic;
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
    default: return kind.replace(/_/g, ' ');
  }
};

export const CircleScreen = () => {
  const { totalPeople, sources, loading, refresh } = useCircle();
  const dedupe = useCircleDedupe();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dedupeOpen, setDedupeOpen] = useState(false);

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

  const activeSources = useMemo(
    () => sources.filter((s) => s.status === 'active' || s.status === 'ingesting'),
    [sources]
  );
  const failedSources = useMemo(
    () => sources.filter((s) => s.status === 'failed'),
    [sources]
  );

  return (
    <div className="min-h-full bg-background px-4 pt-6 pb-24">
      <motion.header
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-display font-semibold tracking-tight text-foreground">
            Your Circle
          </h1>
          {!loading && (
            <span className="text-sm font-medium text-foreground-secondary tabular-nums">
              {totalPeople.toLocaleString()}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-foreground-secondary">
          Every person you know, across every source — unified.
        </p>
      </motion.header>

      {!loading && totalPeople === 0 && (
        <section className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-6 mb-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-primary/10 p-2">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-foreground">
                Your Circle is empty.
              </p>
              <p className="text-sm text-foreground-secondary leading-relaxed">
                Connect a source and I'll start matching while you sleep. LinkedIn
                is usually the richest single source.
              </p>
            </div>
          </div>
        </section>
      )}

      {!loading && activeSources.length > 0 && (
        <section className="mb-4">
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
        <section className="mb-4 space-y-2">
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

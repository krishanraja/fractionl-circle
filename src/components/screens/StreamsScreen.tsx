import { motion } from 'framer-motion';
import { Activity, Loader2, AlertCircle } from 'lucide-react';
import { useStreams, type EnrichedStream } from '@/hooks/useStreams';

const formatUsd = (cents: number): string => {
  if (!cents) return '$0';
  return `$${Math.round(cents / 100).toLocaleString()}`;
};

const titleCase = (s: string): string =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const StreamRow = ({ stream, index }: { stream: EnrichedStream; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-4"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-foreground truncate">{stream.name}</h3>
        {stream.ideaTitle && (
          <p className="mt-0.5 text-xs text-foreground-muted truncate">from {stream.ideaTitle}</p>
        )}
      </div>
      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
        {titleCase(stream.state)}
      </span>
    </div>
    <div className="mt-3 flex items-end justify-between">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-foreground-muted">Earned</p>
        <p className="text-lg font-semibold text-foreground tabular-nums">{formatUsd(stream.earnedCents)}</p>
      </div>
      {stream.monthlyTargetCents ? (
        <p className="text-xs text-foreground-secondary tabular-nums">
          target {formatUsd(stream.monthlyTargetCents)}/mo
        </p>
      ) : null}
    </div>
  </motion.div>
);

export const StreamsScreen = () => {
  const { streams, loading, error, refresh } = useStreams();

  return (
    <div className="min-h-full bg-background px-4 pt-6 pb-24">
      <motion.header
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <h1 className="text-display text-foreground">Streams</h1>
        <p className="mt-1 text-sm text-foreground-secondary">Ideas that earned their way in.</p>
      </motion.header>

      {loading && (
        <div className="flex items-center justify-center py-12 text-foreground-muted">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      )}

      {!loading && error && (
        <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-destructive/10 p-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
            </div>
            <div className="space-y-1.5 flex-1">
              <p className="text-sm font-medium text-foreground">{error}</p>
              <button onClick={() => void refresh()} className="mt-1 text-sm text-primary font-medium">
                Retry
              </button>
            </div>
          </div>
        </section>
      )}

      {!loading && !error && streams.length === 0 && (
        <section className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-primary/10 p-2">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-foreground">No live Streams yet.</p>
              <p className="text-sm text-foreground-secondary leading-relaxed">
                A Stream is an Idea that's earned revenue. Approve Matches on Today to start one.
              </p>
            </div>
          </div>
        </section>
      )}

      {!loading && !error && streams.length > 0 && (
        <section className="space-y-3">
          {streams.map((s, i) => (
            <StreamRow key={s.id} stream={s} index={i} />
          ))}
        </section>
      )}
    </div>
  );
};

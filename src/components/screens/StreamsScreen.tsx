import { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Loader2, AlertCircle, TrendingUp, Plus, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { CardDeck } from '@/components/ui/CardDeck';
import { useStreams, type EnrichedStream } from '@/hooks/useStreams';

const formatUsd = (cents: number): string => {
  if (!cents) return '$0';
  return `$${Math.round(cents / 100).toLocaleString()}`;
};

const titleCase = (s: string): string =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const StreamRow = ({
  stream,
  index,
  onLog,
}: {
  stream: EnrichedStream;
  index: number;
  onLog: (stream: EnrichedStream, cents: number) => Promise<void>;
}) => {
  const [logging, setLogging] = useState(false);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const target = stream.monthlyTargetCents ?? 0;
  const pct = target > 0 ? Math.min(100, Math.round((stream.earnedCents / target) * 100)) : 0;

  const submit = async () => {
    const dollars = parseFloat(amount.replace(/[^0-9.]/g, ''));
    const cents = Number.isFinite(dollars) && dollars > 0 ? Math.round(dollars * 100) : 0;
    if (!cents) return;
    setBusy(true);
    try {
      await onLog(stream, cents);
      setAmount('');
      setLogging(false);
    } finally {
      setBusy(false);
    }
  };

  return (
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
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
            stream.state === 'live' ? 'bg-success/15 text-success' : 'bg-primary/10 text-primary'
          )}
        >
          {titleCase(stream.state)}
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-foreground-muted">Earned</p>
          <p className="text-lg font-semibold text-foreground tabular-nums">{formatUsd(stream.earnedCents)}</p>
        </div>
        {target ? (
          <p className="text-xs text-foreground-secondary tabular-nums">target {formatUsd(target)}/mo</p>
        ) : null}
      </div>

      {target > 0 && (
        <div className="mt-2 h-1.5 rounded-full bg-border/60 overflow-hidden">
          <motion.div
            className={cn('h-full', pct >= 100 ? 'bg-success' : 'bg-primary')}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      )}

      {/* The one verb: keep the Stream alive by logging what it earns. */}
      {!logging ? (
        <button
          onClick={() => setLogging(true)}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-foreground-secondary hover:text-primary transition-colors"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Log revenue
        </button>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-foreground-muted">$</span>
            <input
              autoFocus
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="5,000"
              className="w-full h-9 rounded-full border border-border/60 bg-background pl-6 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <button
            onClick={submit}
            disabled={busy || !amount.trim()}
            className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-xs font-medium inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add
          </button>
          <button
            onClick={() => { setLogging(false); setAmount(''); }}
            disabled={busy}
            className="h-9 px-3 rounded-full border border-border/60 bg-card/60 text-xs text-foreground-secondary"
          >
            Cancel
          </button>
        </div>
      )}
    </motion.div>
  );
};

export const StreamsScreen = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { streams, loading, error, refresh } = useStreams();

  const totalEarned = streams.reduce((s, x) => s + x.earnedCents, 0);
  const totalTarget = streams.reduce((s, x) => s + (x.monthlyTargetCents ?? 0), 0);

  // Log a revenue event against a Stream. RLS scopes ledger_entries to the owner,
  // so this is a safe client write. First dollar promotes a prototype to live.
  const handleLog = async (stream: EnrichedStream, cents: number) => {
    if (!user) return;
    try {
      const now = new Date().toISOString();
      const { error: ledgerErr } = await supabase.from('ledger_entries').insert({
        user_id: user.id,
        stream_id: stream.id,
        occurred_at: now,
        amount_cents: cents,
        kind: 'revenue',
        source: 'manual',
      });
      if (ledgerErr) throw ledgerErr;
      const wasFirst = stream.state !== 'live';
      if (wasFirst) {
        await supabase.from('streams').update({ state: 'live', activated_at: now }).eq('id', stream.id);
      }
      toast.success(wasFirst ? `${formatUsd(cents)} logged — ${stream.name} is Live now. 🎉` : `${formatUsd(cents)} logged to ${stream.name}.`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not log revenue');
    }
  };

  // ── Mobile: zero-scroll frame. Header pinned, streams become a swipe deck so
  // the page never scrolls regardless of how many Streams exist. ──
  if (isMobile) {
    const totalsLine = !loading && !error && streams.length > 0 && (
      <p className="mt-2 text-sm text-foreground tabular-nums">
        <span className="font-semibold text-success">{formatUsd(totalEarned)}</span>
        <span className="text-foreground-muted"> earned</span>
        {totalTarget > 0 && (
          <span className="text-foreground-secondary"> · {formatUsd(totalTarget)}/mo target</span>
        )}
      </p>
    );

    return (
      <div className="flex h-full flex-col overflow-hidden bg-background px-4 pt-4 pb-3">
        <header className="shrink-0 mb-3">
          <h1 className="text-title-1 text-foreground">Streams</h1>
          <p className="mt-0.5 text-sm text-foreground-secondary">Ideas that earned their way in.</p>
          {totalsLine}
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          {loading ? (
            <div className="flex flex-1 items-center justify-center text-foreground-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="mb-3 rounded-full bg-destructive/10 p-2.5">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <p className="text-sm font-medium text-foreground">{error}</p>
              <button onClick={() => void refresh()} className="mt-2 text-sm font-medium text-primary">
                Retry
              </button>
            </div>
          ) : streams.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
              <div className="mb-4 rounded-2xl bg-primary/10 p-3">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <p className="text-base font-semibold text-foreground">Your first Stream starts with a yes.</p>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-foreground-secondary">
                When someone says yes to a Move on Today, tap{' '}
                <span className="font-medium text-foreground">"They said yes — log the win"</span> and that
                Idea graduates into a Stream you can track here.
              </p>
            </div>
          ) : (
            <CardDeck
              items={streams}
              getKey={(s) => s.id}
              resetKey={streams.length}
              ariaLabel="Your Streams"
              renderItem={(s, i) => (
                <div className="flex h-full flex-col justify-center">
                  <StreamRow stream={s} index={i} onLog={handleLog} />
                </div>
              )}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background px-4 pt-6 pb-24 lg:px-8">
      <motion.header
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <h1 className="text-display text-foreground">Streams</h1>
        <p className="mt-1 text-sm text-foreground-secondary">Ideas that earned their way in.</p>
        {!loading && !error && streams.length > 0 && (
          <p className="mt-3 text-sm text-foreground tabular-nums">
            <span className="font-semibold text-success">{formatUsd(totalEarned)}</span>
            <span className="text-foreground-muted"> earned</span>
            {totalTarget > 0 && (
              <span className="text-foreground-secondary"> · {formatUsd(totalTarget)}/mo target</span>
            )}
          </p>
        )}
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
              <Trophy className="w-4 h-4 text-primary" />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-foreground">Your first Stream starts with a yes.</p>
              <p className="text-sm text-foreground-secondary leading-relaxed">
                When someone says yes to a Move on Today, tap <span className="font-medium text-foreground">"They said yes — log the win"</span> and
                that Idea graduates into a Stream you can track here.
              </p>
            </div>
          </div>
        </section>
      )}

      {!loading && !error && streams.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {streams.map((s, i) => (
            <StreamRow key={s.id} stream={s} index={i} onLog={handleLog} />
          ))}
        </section>
      )}
    </div>
  );
};

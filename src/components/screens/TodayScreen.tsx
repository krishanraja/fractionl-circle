import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Loader2, Zap, AlertCircle } from 'lucide-react';
import type { TabId } from '@/components/layout/BottomNav';
import type { CircleIntent } from '@/pages/Index';
import { GettingStarted } from '@/components/today/GettingStarted';
import { NextMove } from '@/components/today/NextMove';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useIdeas } from '@/hooks/useIdeas';
import { useCircle } from '@/hooks/useCircle';
import { useMatches, runMatchEngine } from '@/hooks/useMatches';
import { MatchCard } from '@/components/today/MatchCard';
import { FocusMove } from '@/components/today/FocusMove';
import { SundayLetterCard } from '@/components/today/SundayLetterCard';
import { ConciergeCard } from '@/components/today/ConciergeCard';
import { PricingSheet } from '@/components/billing/PricingSheet';

// "Today: one thing now" inversion. When on, and there are matches, the home
// leads with the single highest-priority Move; everything else recedes below.
// Flag off = the original flat card stack, byte-for-byte unchanged.
const TODAY_FOCUS_ENABLED = import.meta.env.VITE_TODAY_FOCUS_ENABLED === 'true';

// Diagnosis hero. Default ON: when there are no Matches yet, Today reads the
// user's state (ideas vs. people) and names their single biggest gap with one
// action, instead of the generic Talk→Match→Move checklist. Set
// VITE_NEXT_MOVE_ENABLED=false to fall back to GettingStarted.
const NEXT_MOVE_ENABLED = import.meta.env.VITE_NEXT_MOVE_ENABLED !== 'false';

interface TodayScreenProps {
  onNavigate?: (tab: TabId, intent?: CircleIntent) => void;
}

export const TodayScreen = ({ onNavigate }: TodayScreenProps) => {
  const { ideas, loading: ideasLoading } = useIdeas();
  const { totalPeople, loading: circleLoading } = useCircle();
  const { matches, loading: matchesLoading, error: matchesError, refresh, updateMatchState } = useMatches();
  const [running, setRunning] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [pricingReason, setPricingReason] = useState<string | undefined>(undefined);

  const canRun = !ideasLoading && !circleLoading && ideas.length > 0 && totalPeople > 0;
  const hasMatches = matches.length > 0;
  // The Sunday Letter is a weekend ritual: Sat–Mon it claims the top of Today,
  // expanded; the rest of the week it sits quietly lower in the stack.
  const weekend = [0, 1, 6].includes(new Date().getDay());
  const headline = useMemo(() => {
    if (matchesLoading) return 'Loading Matches…';
    if (matchesError) return 'Could not load Matches.';
    if (hasMatches) return `${matches.length} Match${matches.length === 1 ? '' : 'es'} waiting for you.`;
    return "Let's line up your next move.";
  }, [hasMatches, matches.length, matchesLoading, matchesError]);

  const handleRun = async () => {
    setRunning(true);
    try {
      const res = await runMatchEngine();
      await refresh();
      if (res.quota_blocked) {
        setPricingReason(res.note ?? 'You hit your Match cap. Upgrade for more.');
        setPricingOpen(true);
        return;
      }
      if (res.matches_created && res.matches_created > 0) {
        toast.success(`${res.matches_created} new Match${res.matches_created === 1 ? '' : 'es'} surfaced.`);
      } else if (res.note) {
        toast.info(res.note);
      } else {
        toast.info('No new Matches this time. Add more sources or Ideas and try again.');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Match Engine failed');
    } finally {
      setRunning(false);
    }
  };

  // FOCUS layout: flag on AND there is at least one match. The headline and the
  // hero Move come first; ConciergeCard / SundayLetterCard recede below. The
  // no-match, empty, and error states deliberately fall through to the existing
  // layout below so that gating logic (canRun, Surface Matches, matchesError)
  // is never regressed.
  if (TODAY_FOCUS_ENABLED && hasMatches) {
    return (
      <div className="min-h-full bg-background px-4 pt-6 pb-24">
        <motion.p
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-5 text-sm text-foreground-secondary leading-relaxed"
        >
          Overnight I looked for Matches across your Ideas and Circle.
        </motion.p>

        {weekend && <SundayLetterCard canGenerate={canRun} prominent />}

        <FocusMove
          matches={matches}
          onStateChange={updateMatchState}
          canRun={canRun}
          running={running}
          onRun={handleRun}
        />

        <ConciergeCard />

        {!weekend && <SundayLetterCard canGenerate={canRun} />}

        <PricingSheet open={pricingOpen} onOpenChange={setPricingOpen} reason={pricingReason} />
      </div>
    );
  }

  // When there are no Matches yet, the diagnosis hero (NextMove) carries the
  // message, so we drop the redundant display headline and the "overnight"
  // line — the latter would also be untrue for a user with nothing seeded yet.
  const showDiagnosis = !hasMatches && !matchesLoading && !matchesError;

  return (
    <div className="min-h-full bg-background px-4 pt-6 pb-24">
      {!showDiagnosis && (
        <motion.header
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <p className="text-sm text-foreground-secondary leading-relaxed">
            Overnight I looked for Matches across your Ideas and Circle.
          </p>
          <h1 className="mt-2 text-display text-foreground">
            {headline}
          </h1>
        </motion.header>
      )}

      {weekend && <SundayLetterCard canGenerate={canRun} prominent />}

      {showDiagnosis &&
        (NEXT_MOVE_ENABLED ? (
          <NextMove
            ideasCount={ideas.length}
            peopleCount={totalPeople}
            canRun={canRun}
            running={running}
            onRun={handleRun}
            onNavigate={onNavigate}
            topIdeaTitle={ideas[0]?.title}
          />
        ) : (
          <GettingStarted
            ideasCount={ideas.length}
            peopleCount={totalPeople}
            canRun={canRun}
            running={running}
            onRun={handleRun}
            onNavigate={onNavigate}
          />
        ))}

      <ConciergeCard />

      {!weekend && <SundayLetterCard canGenerate={canRun} />}

      {matchesError && !matchesLoading && (
        <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 mb-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-destructive/10 p-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
            </div>
            <div className="space-y-1.5 flex-1">
              <p className="text-sm font-medium text-foreground">{matchesError}</p>
              <button onClick={() => void refresh()} className="mt-1 text-sm text-primary font-medium">
                Retry
              </button>
            </div>
          </div>
        </section>
      )}

      {hasMatches && (
        <section className="space-y-3 mb-8">
          {matches.map((m) => (
            <MatchCard key={m.match.id} match={m} onStateChange={updateMatchState} />
          ))}
          {canRun && (
            <button
              onClick={handleRun}
              disabled={running}
              className={cn(
                'w-full h-10 rounded-full border border-border/60 bg-card/50 backdrop-blur',
                'text-xs font-medium text-foreground-secondary',
                'flex items-center justify-center gap-1.5',
                'disabled:opacity-70'
              )}
            >
              {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              {running ? 'Finding more…' : 'Find more Matches'}
            </button>
          )}
        </section>
      )}

      {!ideasLoading && ideas.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-foreground-secondary" />
            <h2 className="text-xs font-medium uppercase tracking-wide text-foreground-secondary">
              Your Ideas
            </h2>
          </div>
          <div className="space-y-2">
            {ideas.map((idea, idx) => (
              <motion.div
                key={idea.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-xl border border-border/60 bg-card/50 backdrop-blur p-4"
              >
                <h3 className="text-sm font-semibold text-foreground">{idea.title}</h3>
                {idea.one_liner && (
                  <p className="mt-1 text-xs text-foreground-secondary leading-relaxed">
                    {idea.one_liner}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-foreground-muted">
                  {idea.price_band && <span>{idea.price_band}</span>}
                  {idea.icp && <span>· {idea.icp}</span>}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      <PricingSheet open={pricingOpen} onOpenChange={setPricingOpen} reason={pricingReason} />
    </div>
  );
};

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EnrichedMatch, MatchState } from '@/hooks/useMatches';
import { MatchCard } from '@/components/today/MatchCard';

interface FocusMoveProps {
  matches: EnrichedMatch[];
  onStateChange: (matchId: string, state: MatchState, extras?: { closed_reason?: string }) => Promise<void>;
  canRun: boolean;
  running: boolean;
  onRun: () => void;
}

// Derive the single plain-language headline for the top Move. We lead with the
// person, give a one-line reason (the match rationale if the engine wrote one,
// otherwise the idea's one_liner), and close by telling them the note is ready.
function buildHeadline(top: EnrichedMatch | undefined): string {
  if (!top) return 'One move is ready for you today.';
  const name = top.person?.display_name?.trim() || 'someone in your Circle';
  const rawReason = (top.match.rationale ?? top.idea?.one_liner ?? '').trim();
  // Keep the reason to a single sentence-sized clause and ensure it ends cleanly.
  const reason = rawReason ? rawReason.replace(/\s+/g, ' ') : '';
  const reasonClause = reason ? (/[.!?]$/.test(reason) ? `${reason} ` : `${reason}. `) : '';
  return `Reach out to ${name} today. ${reasonClause}I drafted the note.`;
}

export const FocusMove = ({ matches, onStateChange, canRun, running, onRun }: FocusMoveProps) => {
  const top = matches[0];
  const rest = matches.slice(1);
  const headline = useMemo(() => buildHeadline(top), [top]);

  if (!top) return null;

  return (
    <section className="mb-8">
      <motion.h1
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-title-1 leading-relaxed text-foreground"
      >
        {headline}
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="mt-5"
      >
        <p className="text-label text-primary mb-2">Today's move</p>
        <MatchCard match={top} onStateChange={onStateChange} />
      </motion.div>

      {rest.length > 0 && (
        <div className="mt-10">
          <p className="text-label text-foreground-muted mb-3">Also today</p>
          <div className="space-y-2 opacity-70">
            {rest.map((m) => (
              <MatchCard key={m.match.id} match={m} onStateChange={onStateChange} />
            ))}
          </div>
        </div>
      )}

      {canRun && (
        <button
          onClick={onRun}
          disabled={running}
          className={cn(
            'mt-4 w-full h-10 rounded-full border border-border/60 bg-card/50 backdrop-blur',
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
  );
};

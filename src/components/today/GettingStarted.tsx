import { motion } from 'framer-motion';
import { Check, Sparkles, Users, Zap, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TabId } from '@/components/layout/BottomNav';

// Guided first-run: a sequenced Talk -> Match -> Move checklist that retires
// itself the moment the user lands their first Match. Each step's "done" state
// is derived from real data (Ideas / Circle / Matches), so it survives reloads
// and completes on its own — no extra table, no manual dismissal. Only the
// current step is expanded with copy + a single action, so a brand-new user is
// never shown more than one thing to do next.

interface GettingStartedProps {
  ideasCount: number;
  peopleCount: number;
  canRun: boolean;
  running: boolean;
  onRun: () => void;
  onNavigate?: (tab: TabId) => void;
}

export const GettingStarted = ({
  ideasCount,
  peopleCount,
  canRun,
  running,
  onRun,
  onNavigate,
}: GettingStartedProps) => {
  const steps = [
    {
      done: ideasCount > 0,
      title: 'Capture an Idea',
      help: 'Tell me one thing you could sell. I turn it into an Idea with a price band and the buyer it suits.',
      cta: 'Capture an Idea',
      Icon: Sparkles,
      action: () => onNavigate?.('ask'),
      gated: false,
    },
    {
      done: peopleCount > 0,
      title: 'Build your Circle',
      help: 'Add a few people you know — paste a LinkedIn URL, snap a card, or just say a name.',
      cta: 'Add people',
      Icon: Users,
      action: () => onNavigate?.('circle'),
      gated: false,
    },
    {
      done: false,
      title: 'Surface your first Match',
      help: 'I cross-reference your Ideas against your Circle and hand you a drafted Move.',
      cta: running ? 'Finding Matches…' : 'Surface Matches',
      Icon: Zap,
      action: onRun,
      gated: !canRun,
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const currentIdx = steps.findIndex((s) => !s.done);

  return (
    <motion.section
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-5 mb-6"
    >
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-foreground">Getting started</h2>
        <span className="text-xs text-foreground-muted tabular-nums">
          {completed} of {steps.length}
        </span>
      </div>
      <p className="text-xs text-foreground-secondary leading-relaxed mb-3">
        Talk → Match → Move. Three steps to your first hand-drafted Move.
      </p>

      <div className="h-1 rounded-full bg-border/60 mb-4 overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${(completed / steps.length) * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      <ol className="space-y-3">
        {steps.map((s, i) => {
          const isCurrent = i === currentIdx;
          const { Icon } = s;
          return (
            <li key={s.title} className="flex items-start gap-3">
              <div
                className={cn(
                  'mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold',
                  s.done
                    ? 'bg-primary text-primary-foreground'
                    : isCurrent
                      ? 'border-2 border-primary text-primary'
                      : 'border border-border text-foreground-muted'
                )}
              >
                {s.done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm font-medium',
                    s.done ? 'text-foreground-muted line-through' : 'text-foreground'
                  )}
                >
                  {s.title}
                </p>
                {isCurrent && (
                  <>
                    <p className="mt-0.5 text-xs text-foreground-secondary leading-relaxed">
                      {s.help}
                    </p>
                    <button
                      onClick={s.action}
                      disabled={s.gated || running}
                      className={cn(
                        'mt-2 inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-xs font-medium transition-colors',
                        s.gated
                          ? 'border border-border/60 bg-card/50 text-foreground-muted cursor-not-allowed'
                          : 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 disabled:opacity-70'
                      )}
                    >
                      {running && i === currentIdx ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Icon className="w-3.5 h-3.5" />
                      )}
                      {s.cta}
                      {!s.gated && !running && <ArrowRight className="w-3.5 h-3.5" />}
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </motion.section>
  );
};

import { motion } from 'framer-motion';
import { Mic, Lightbulb, Upload, UserPlus, Zap, Loader2, ArrowRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TabId } from '@/components/layout/BottomNav';
import type { CircleIntent } from '@/pages/Index';

// The diagnosis hero. Replaces the generic Talk→Match→Move checklist on Today
// when the user has no Matches yet. Instead of a flat to-do list, it reads the
// user's actual state and names their single biggest gap with conviction, then
// offers exactly one primary action — the chief-of-staff voice the product
// promises ("we carry the cognitive load they came to offload"). Never shames,
// never dead-ends. Only the has-no-matches states live here; once Matches
// exist, TodayScreen surfaces the Move itself.

interface NextMoveProps {
  ideasCount: number;
  peopleCount: number;
  canRun: boolean;
  running: boolean;
  onRun: () => void;
  onNavigate?: (tab: TabId, intent?: CircleIntent) => void;
  topIdeaTitle?: string | null;
}

interface Action {
  label: string;
  Icon: LucideIcon;
  onClick: () => void;
  primary: boolean;
}

interface Diagnosis {
  overline: string;
  Icon: LucideIcon;
  headline: string;
  body: string;
  actions: Action[];
}

export const NextMove = ({
  ideasCount,
  peopleCount,
  canRun,
  running,
  onRun,
  onNavigate,
  topIdeaTitle,
}: NextMoveProps) => {
  const hasIdeas = ideasCount > 0;
  const hasPeople = peopleCount > 0;

  const diagnosis = ((): Diagnosis => {
    // Both sides present → the only thing left is to cross-reference them.
    if (hasIdeas && hasPeople) {
      return {
        overline: 'Ready to match',
        Icon: Zap,
        headline: `${ideasCount} ${ideasCount === 1 ? 'Idea' : 'Ideas'}, ${peopleCount} ${peopleCount === 1 ? 'person' : 'people'}. Let me connect them.`,
        body: "I'll cross-reference what you're selling against everyone you know and hand back the first warm door — with the note already drafted.",
        actions: [
          {
            label: running ? 'Finding your first Match…' : 'Surface your first Match',
            Icon: Zap,
            onClick: onRun,
            primary: true,
          },
        ],
      };
    }

    // Has the network, but nothing to sell yet → push to shape an offer.
    if (hasPeople && !hasIdeas) {
      return {
        overline: 'You have the network',
        Icon: Lightbulb,
        headline: `You know ${peopleCount} ${peopleCount === 1 ? 'person' : 'people'}. You just haven't told me what you'd sell them.`,
        body: "That's the missing half. Talk to me for 90 seconds about a problem you've fixed before, and I'll shape it into an offer with a price and the buyer it suits.",
        actions: [
          {
            label: 'Shape an offer',
            Icon: Mic,
            onClick: () => onNavigate?.('ask'),
            primary: true,
          },
        ],
      };
    }

    // Has an idea, but no one to sell it to → the contact almost always
    // already exists, dormant. Lead with LinkedIn import; quick-add is secondary.
    if (hasIdeas && !hasPeople) {
      return {
        overline: 'You have the idea',
        Icon: Upload,
        headline: topIdeaTitle
          ? `Strong idea — “${topIdeaTitle}”. Now: who'd buy it?`
          : "Strong idea. Now: who'd buy it?",
        body: "The right people are almost always already in your network — just out of sight, out of mind. Bring them in and I'll find the ones who fit. A LinkedIn export is the fastest way to surface everyone at once.",
        actions: [
          {
            label: 'Import from LinkedIn',
            Icon: Upload,
            onClick: () => onNavigate?.('circle', 'import'),
            primary: true,
          },
          {
            label: 'Add a few by hand',
            Icon: UserPlus,
            onClick: () => onNavigate?.('circle', 'add'),
            primary: false,
          },
        ],
      };
    }

    // Cold start — nothing either side. One open door: talk.
    return {
      overline: "Let's begin",
      Icon: Mic,
      headline: "Tell me what you could sell.",
      body: "Ninety seconds out loud — what you've run, what you've fixed. I'll turn it into an offer and start finding who in your world would pay for it.",
      actions: [
        {
          label: 'Talk to me',
          Icon: Mic,
          onClick: () => onNavigate?.('ask'),
          primary: true,
        },
      ],
    };
  })();

  const { overline, Icon, headline, body, actions } = diagnosis;

  return (
    <motion.section
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-6 mb-6"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="rounded-full bg-primary/10 p-2">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
          {overline}
        </span>
      </div>

      <h2 className="text-title-1 text-foreground leading-snug">{headline}</h2>
      <p className="mt-2.5 text-sm text-foreground-secondary leading-relaxed">{body}</p>

      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        {actions.map((a) => {
          const isRunAction = a.onClick === onRun;
          const gated = isRunAction && (!canRun || running);
          return (
            <button
              key={a.label}
              onClick={a.onClick}
              disabled={gated}
              className={cn(
                'inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition-colors',
                a.primary
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 disabled:opacity-70'
                  : 'border border-border/60 bg-card/50 text-foreground hover:bg-card'
              )}
            >
              {running && isRunAction ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <a.Icon className="w-4 h-4" />
              )}
              {a.label}
              {a.primary && !(running && isRunAction) && <ArrowRight className="w-4 h-4" />}
            </button>
          );
        })}
      </div>
    </motion.section>
  );
};

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, Check, X, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { EnrichedMatch, MatchState } from '@/hooks/useMatches';

interface MatchCardProps {
  match: EnrichedMatch;
  onStateChange: (matchId: string, state: MatchState, extras?: { closed_reason?: string }) => Promise<void>;
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

export const MatchCard = ({ match, onStateChange }: MatchCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState<'approve' | 'decline' | null>(null);

  const { person, idea, move } = match;
  if (!person) return null;

  const channel = move?.channel ?? 'linkedin_dm';
  const ChannelIcon = channel === 'email' ? Mail : MessageSquare;
  const channelLabel = channel === 'email' ? 'Email' : 'LinkedIn DM';

  const handleApprove = async () => {
    setBusy('approve');
    try {
      await onStateChange(match.match.id, 'approved');
    } finally {
      setBusy(null);
    }
  };
  const handleDecline = async () => {
    setBusy('decline');
    try {
      await onStateChange(match.match.id, 'declined', { closed_reason: 'user_declined' });
    } finally {
      setBusy(null);
    }
  };
  const handleCopy = async () => {
    if (!move?.draft_body) return;
    try {
      await navigator.clipboard.writeText(move.draft_body);
      toast.success('Draft copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-4"
    >
      <header className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/15 text-primary font-semibold text-sm flex items-center justify-center shrink-0">
          {initials(person.display_name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{person.display_name}</p>
          <p className="text-xs text-foreground-secondary truncate">
            {[person.title, person.company].filter(Boolean).join(' · ') || 'No title on file'}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          <ChannelIcon className="w-3 h-3" />
          {channelLabel}
        </div>
      </header>

      {idea && (
        <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
          For: {idea.title}
        </p>
      )}

      {match.match.rationale && (
        <p className="mt-1 text-sm text-foreground leading-relaxed">
          {match.match.rationale}
        </p>
      )}

      {match.match.warm_path?.via && (
        <p className="mt-2 text-xs text-foreground-secondary">
          <span className="font-medium">Warm path:</span> {match.match.warm_path.via}
          {match.match.warm_path.context && ` · ${match.match.warm_path.context}`}
        </p>
      )}

      {move?.draft_body && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-foreground-secondary hover:text-foreground"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Hide draft' : 'See draft'}
          </button>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 rounded-xl border border-border/50 bg-background/80 p-3 text-sm text-foreground whitespace-pre-wrap">
                {move.draft_subject && (
                  <p className="mb-2 text-xs font-semibold text-foreground-secondary">
                    Subject: {move.draft_subject}
                  </p>
                )}
                {move.draft_body}
              </div>
              <button
                onClick={handleCopy}
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-foreground-secondary hover:text-foreground"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
            </motion.div>
          )}
        </div>
      )}

      <footer className="mt-4 flex items-center gap-2">
        <button
          onClick={handleApprove}
          disabled={!!busy}
          className={cn(
            'flex-1 h-10 rounded-full bg-primary text-primary-foreground text-sm font-medium',
            'flex items-center justify-center gap-1.5 shadow-sm shadow-primary/20',
            'disabled:opacity-60'
          )}
        >
          <Check className="w-4 h-4" />
          {busy === 'approve' ? 'Approving…' : 'Approve'}
        </button>
        <button
          onClick={handleDecline}
          disabled={!!busy}
          className={cn(
            'h-10 px-4 rounded-full border border-border/60 bg-card/50 backdrop-blur',
            'text-sm font-medium text-foreground-secondary',
            'flex items-center justify-center gap-1.5',
            'disabled:opacity-60'
          )}
        >
          <X className="w-4 h-4" />
          Pass
        </button>
      </footer>
    </motion.article>
  );
};

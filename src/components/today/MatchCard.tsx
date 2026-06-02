import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, Check, X, ChevronDown, ChevronUp, Copy, Send, Loader2, Target, Megaphone, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { EnrichedMatch, MatchRole, MatchState } from '@/hooks/useMatches';
import { ContactButton } from '@/components/circle/ContactButton';
import { openLinkedIn } from '@/utils/contactActions';

// How the matched person relates to the offer drives the whole card's framing:
// a buyer gets pitched, an amplifier gets asked for a door, a sharpener gets
// asked to react. The badge makes that relationship legible at a glance.
const ROLE_META: Record<MatchRole, { label: string; Icon: typeof Target; cls: string; verb: string }> = {
  buyer: {
    label: 'Customer',
    Icon: Target,
    cls: 'bg-primary/10 text-primary',
    verb: 'Customer for',
  },
  amplifier: {
    label: 'Amplifier',
    Icon: Megaphone,
    cls: 'bg-primary/15 text-primary ring-1 ring-primary/30',
    verb: 'Could open doors for',
  },
  sharpener: {
    label: 'Sharpener',
    Icon: Lightbulb,
    cls: 'bg-foreground/[0.06] text-foreground-secondary',
    verb: 'Could sharpen',
  },
};

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
  const [busy, setBusy] = useState<'approve' | 'decline' | 'send' | null>(null);
  const [markingSent, setMarkingSent] = useState(false);
  const [finalBody, setFinalBody] = useState('');

  const { person, idea, move } = match;
  // Default to 'buyer' so a pre-migration row (no role column) or an older match
  // renders exactly as before — the badge just reads "Customer".
  const role = ROLE_META[(match.match.role ?? 'buyer') as MatchRole] ?? ROLE_META.buyer;

  useEffect(() => {
    if (move?.draft_body) setFinalBody(move.draft_body);
  }, [move?.draft_body]);

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
  const handleOpenDraft = async () => {
    const body = (finalBody || move?.draft_body || '').trim();
    if (!body) {
      toast.error('No draft to open');
      return;
    }
    if (channel === 'email' && person.primary_email) {
      const params = new URLSearchParams();
      if (move?.draft_subject) params.set('subject', move.draft_subject);
      params.set('body', body);
      window.location.href = `mailto:${person.primary_email}?${params.toString()}`;
      return;
    }
    if (person.linkedin_url) {
      openLinkedIn(person.linkedin_url);
      try {
        await navigator.clipboard.writeText(body);
        toast.success('Draft copied — paste into LinkedIn');
      } catch {
        toast.info('Opened LinkedIn — copy the draft manually');
      }
      return;
    }
    toast.error('Add an email or LinkedIn URL to open a draft');
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

  const handleMarkSent = async () => {
    if (!move || !finalBody.trim()) return;
    setBusy('send');
    try {
      const { data, error } = await supabase.functions.invoke('log-move-sent', {
        body: { move_id: move.id, final_body: finalBody },
      });
      if (error) throw error;
      const distance = (data as { edit_distance?: number } | null)?.edit_distance ?? 0;
      toast.success(
        distance === 0
          ? 'Logged as sent — no edits.'
          : `Logged as sent — ${distance} char edits.`
      );
      setMarkingSent(false);
      await onStateChange(match.match.id, 'sent');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not log');
    } finally {
      setBusy(null);
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
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', role.cls)}>
            <role.Icon className="w-3 h-3" />
            {role.label}
          </div>
          <div className="flex items-center gap-1 rounded-full bg-foreground/[0.04] px-2 py-0.5 text-[10px] font-medium text-foreground-muted">
            <ChannelIcon className="w-3 h-3" />
            {channelLabel}
          </div>
        </div>
      </header>

      {person && (
        <div className="mt-3">
          <ContactButton
            person={{
              id: person.id,
              display_name: person.display_name,
              primary_email: person.primary_email,
              primary_phone: person.primary_phone,
              linkedin_url: person.linkedin_url,
              handles: person.handles,
            }}
            raws={match.personRaws}
            size="sm"
          />
        </div>
      )}

      {idea && (
        <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
          {role.verb} {idea.title}
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
              <div className="mt-2 flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => void handleOpenDraft()}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80"
                >
                  <Send className="w-3.5 h-3.5" />
                  Open {channel === 'email' ? 'email' : 'LinkedIn'}
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 text-xs text-foreground-secondary hover:text-foreground"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </button>
                {match.match.state !== 'sent' && (
                  <button
                    onClick={() => setMarkingSent((v) => !v)}
                    className="inline-flex items-center gap-1.5 text-xs text-foreground-secondary hover:text-foreground"
                  >
                    <Send className="w-3.5 h-3.5" />
                    I sent it
                  </button>
                )}
              </div>
              {markingSent && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 overflow-hidden"
                >
                  <label
                    htmlFor="match-final-body"
                    className="block text-[11px] uppercase tracking-wide text-foreground-muted mb-1"
                  >
                    What did you actually send?
                  </label>
                  <textarea
                    id="match-final-body"
                    value={finalBody}
                    onChange={(e) => setFinalBody(e.target.value)}
                    className="w-full min-h-[90px] rounded-xl border border-border/60 bg-background p-2 text-sm text-foreground resize-none"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={handleMarkSent}
                      disabled={busy === 'send' || !finalBody.trim()}
                      className={cn(
                        'flex-1 h-9 rounded-full bg-primary text-primary-foreground text-xs font-medium',
                        'inline-flex items-center justify-center gap-1.5 shadow-sm shadow-primary/20',
                        'disabled:opacity-60'
                      )}
                    >
                      {busy === 'send' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Log as sent
                    </button>
                    <button
                      onClick={() => setMarkingSent(false)}
                      disabled={busy === 'send'}
                      className="h-9 px-3 rounded-full border border-border/60 bg-card/60 text-xs font-medium text-foreground-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
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

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollText, Loader2, RefreshCw, ChevronDown, ChevronUp, Headphones, Share2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useSundayLetter, type SundayLetterRow, type SundayLetterStats } from '@/hooks/useSundayLetter';

// 5e: opt-in public Signal feed. Off by default; flip VITE_SUNDAY_FEED_ENABLED
// to expose the share control. When on, sharing flips is_publishable = true so
// the de-identified preview appears in the public Sunday Letter feed.
const SUNDAY_FEED_ENABLED = import.meta.env.VITE_SUNDAY_FEED_ENABLED === 'true';

const formatWeekOf = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
};

const StatLine = ({ stats }: { stats: SundayLetterStats | null }) => {
  if (!stats) return null;
  const bits: string[] = [];
  if (stats.matches_surfaced) bits.push(`${stats.matches_surfaced} surfaced`);
  if (stats.matches_approved) bits.push(`${stats.matches_approved} approved`);
  if (stats.moves_sent) bits.push(`${stats.moves_sent} sent`);
  if (stats.new_circle_people) bits.push(`${stats.new_circle_people} new in Circle`);
  if (!bits.length) return null;
  return (
    <p className="text-[11px] uppercase tracking-wide text-foreground-muted">
      {bits.join(' · ')}
    </p>
  );
};

interface SundayLetterCardProps {
  canGenerate: boolean;
}

const Preview = ({ letter }: { letter: SundayLetterRow }) => {
  const firstPara = letter.text_body.split(/\n\s*\n/)[0] ?? letter.text_body;
  return (
    <p className="text-sm text-foreground leading-relaxed line-clamp-3">{firstPara}</p>
  );
};

// Opt-in control: flips is_publishable = true on the current letter so its
// de-identified preview joins the public feed (5e). Owner RLS allows the
// update. The new columns are not in the generated supabase types yet, so we
// cast the client narrowly for this one call.
const ShareSignal = ({ letter }: { letter: SundayLetterRow }) => {
  const [published, setPublished] = useState<boolean>(
    Boolean((letter as unknown as { is_publishable?: boolean }).is_publishable)
  );
  const [saving, setSaving] = useState(false);

  const handleShare = async () => {
    if (published || saving) return;
    setSaving(true);
    try {
      const { error } = await (supabase as unknown as { from: (t: string) => any })
        .from('sunday_letters')
        .update({ is_publishable: true })
        .eq('id', letter.id);
      if (error) throw error;
      setPublished(true);
      toast.success('Shared as a public Signal. Only the de-identified teaser is published.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not share this letter');
    } finally {
      setSaving(false);
    }
  };

  if (published) {
    return (
      <p className="mt-3 inline-flex items-center gap-1 text-xs text-foreground-muted">
        <Check className="w-3.5 h-3.5 text-primary" />
        Shared as a public Signal
      </p>
    );
  }

  return (
    <button
      onClick={handleShare}
      disabled={saving}
      className="mt-3 ml-3 inline-flex items-center gap-1 text-xs font-medium text-foreground-secondary hover:text-foreground disabled:opacity-60"
      aria-label="Share this week's letter as a public Signal"
    >
      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
      Share as public Signal
    </button>
  );
};

export const SundayLetterCard = ({ canGenerate }: SundayLetterCardProps) => {
  const { letter, loading, generating, generate, isThisWeek } = useSundayLetter();
  const [expanded, setExpanded] = useState(false);

  const handleGenerate = async (force: boolean) => {
    try {
      const next = await generate({ force });
      if (next) {
        setExpanded(true);
        toast.success(force ? 'Letter refreshed.' : "This week's letter is in.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not generate letter');
    }
  };

  if (loading) return null;

  // Empty-state: no letter at all, but user has enough to generate one.
  if (!letter) {
    if (!canGenerate) return null;
    return (
      <motion.section
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-5"
      >
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <ScrollText className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">The Sunday Letter</p>
            <p className="mt-1 text-sm text-foreground-secondary leading-relaxed">
              A short weekly read across your Matches, Moves, and Circle. Generate
              the first one now — it'll take about 10 seconds.
            </p>
            <button
              onClick={() => handleGenerate(false)}
              disabled={generating}
              className={cn(
                'mt-3 h-9 px-4 rounded-full bg-primary text-primary-foreground text-xs font-medium',
                'inline-flex items-center gap-1.5 shadow-sm shadow-primary/20',
                'disabled:opacity-70'
              )}
            >
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScrollText className="w-3.5 h-3.5" />}
              {generating ? 'Writing…' : 'Generate this week'}
            </button>
          </div>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur p-5"
    >
      <header className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-primary/10 p-1.5">
            <ScrollText className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">The Sunday Letter</p>
            <p className="text-[11px] text-foreground-muted">
              Week of {formatWeekOf(letter.week_of)}
              {!isThisWeek && ' · older'}
            </p>
          </div>
        </div>
        {canGenerate && (
          <button
            onClick={() => handleGenerate(true)}
            disabled={generating}
            className="text-xs text-foreground-secondary hover:text-foreground inline-flex items-center gap-1 disabled:opacity-60"
            aria-label="Regenerate this week's letter"
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </button>
        )}
      </header>

      <StatLine stats={letter.stats} />

      {letter.audio_url && (
        <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <div className="flex items-center gap-2 mb-2 text-xs font-medium text-primary">
            <Headphones className="w-3.5 h-3.5" />
            Listen — 90 seconds
          </div>
          <audio controls preload="none" src={letter.audio_url} className="w-full" />
        </div>
      )}

      <div className="mt-2">
        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.div
              key="full"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap space-y-3">
                {letter.text_body.split(/\n\s*\n/).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Preview letter={letter} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-foreground-secondary hover:text-foreground"
      >
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {expanded ? 'Collapse' : 'Read the letter'}
      </button>

      {SUNDAY_FEED_ENABLED && <ShareSignal letter={letter} />}
    </motion.section>
  );
};

import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, ArrowRight, Mic } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { TabId } from '@/components/layout/BottomNav';

const MAX_TYPED_CHARS = 1500;

interface IdeaDraft {
  title: string;
  one_liner?: string | null;
  offer?: string | null;
  pain?: string | null;
  price_band?: string | null;
  icp?: string | null;
}

interface AskScreenProps {
  onNavigate?: (tab: TabId) => void;
}

export const AskScreen = ({ onNavigate }: AskScreenProps) => {
  const { user } = useAuth();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = useCallback(async () => {
    const text = typed.trim();
    if (!text || !user) return;
    setBusy(true);
    try {
      const extractRes = await supabase.functions.invoke('extract-ideas', {
        body: { transcript: text.slice(0, MAX_TYPED_CHARS) },
      });
      if (extractRes.error) throw new Error(extractRes.error.message || 'Could not make sense of that');
      const data = extractRes.data as { ideas?: IdeaDraft[] } | null;
      const parsed = Array.isArray(data?.ideas) ? data!.ideas : [];
      if (!parsed.length) throw new Error('No Ideas landed. Try again with a little more detail.');

      const { error } = await supabase.from('ideas').insert(
        parsed.map((i) => ({
          user_id: user.id,
          title: i.title,
          one_liner: i.one_liner ?? null,
          offer: i.offer ?? null,
          pain: i.pain ?? null,
          price_band: i.price_band ?? null,
          icp: i.icp ?? null,
          status: 'voiced' as const,
        }))
      );
      if (error) throw error;

      toast.success(`${parsed.length} new Idea${parsed.length === 1 ? '' : 's'} added.`);
      setTyped('');
      onNavigate?.('today');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add that Idea');
    } finally {
      setBusy(false);
    }
  }, [typed, user, onNavigate]);

  return (
    <div className="min-h-full bg-background px-4 pt-6 pb-24 flex flex-col">
      <motion.header
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <h1 className="text-display text-foreground">
          Ask
        </h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          Tell me something you could sell and I'll turn it into an Idea — with a
          price band and the buyer it suits.
        </p>
      </motion.header>

      <section className="flex-1">
        <textarea
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          maxLength={MAX_TYPED_CHARS}
          rows={5}
          placeholder="I'm a fractional CMO. I just helped a Series B fintech fix their attribution and cut CAC by 30%…"
          className={cn(
            'w-full rounded-2xl border border-border bg-card p-4 text-sm text-foreground',
            'placeholder:text-foreground-muted resize-none',
            'focus:outline-none focus:ring-2 focus:ring-primary/40'
          )}
        />
        <button
          onClick={handleSubmit}
          disabled={!typed.trim() || busy}
          className={cn(
            'mt-3 w-full h-12 rounded-full bg-primary text-primary-foreground font-medium',
            'flex items-center justify-center gap-2 shadow-lg shadow-primary/30',
            'disabled:opacity-50'
          )}
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {busy ? 'Turning it into an Idea…' : 'Capture Idea'}
          {!busy && <ArrowRight className="w-4 h-4" />}
        </button>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-foreground-muted">
          <Mic className="w-3.5 h-3.5" />
          Hold-to-talk voice capture is coming here next.
        </p>
      </section>
    </div>
  );
};

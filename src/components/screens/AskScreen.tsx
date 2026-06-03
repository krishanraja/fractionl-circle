import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowRight, Mic, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import type { TabId } from '@/components/layout/BottomNav';

const MAX_TYPED_CHARS = 1500;
const MAX_RECORDING_MS = 90_000;

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

// War-story framed openers. A blank box paralyses the archetype ("an average
// user would have no idea what to say"); a question they can actually answer
// from memory does not. Tapping one drops it into the type box to riff on.
const STARTERS = [
  "What's a problem you fixed that you'd happily fix again?",
  'Who did you just talk to — and what did they need?',
  'What did your last company pay you to figure out?',
];

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const s = typeof reader.result === 'string' ? reader.result : '';
      resolve(s.includes(',') ? s.split(',')[1] : s);
    };
    reader.onerror = () => reject(new Error('Could not read audio'));
    reader.readAsDataURL(blob);
  });

type Phase = 'idle' | 'recording' | 'processing';

export const AskScreen = ({ onNavigate }: AskScreenProps) => {
  const { user } = useAuth();
  const [typed, setTyped] = useState('');
  const [showType, setShowType] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');

  const {
    isRecording,
    duration,
    audioBlob,
    waveformData,
    startRecording,
    stopRecording,
    resetRecording,
    error: recError,
  } = useVoiceRecording({ maxDuration: MAX_RECORDING_MS, silenceTimeout: 0 });

  const persistIdeas = useCallback(
    async (parsed: IdeaDraft[]) => {
      if (!user) return;
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
      toast.success(
        parsed.length === 1
          ? `New Idea added — "${parsed[0].title}". Let's find who it's for.`
          : `${parsed.length} new Ideas added.`
      );
      setTyped('');
      setShowType(false);
      onNavigate?.('today');
    },
    [user, onNavigate]
  );

  const extractFrom = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !user) return;
      setPhase('processing');
      try {
        const res = await supabase.functions.invoke('extract-ideas', {
          body: { transcript: trimmed.slice(0, MAX_TYPED_CHARS) },
        });
        if (res.error) throw new Error(res.error.message || 'Could not make sense of that');
        const data = res.data as { ideas?: IdeaDraft[] } | null;
        const parsed = Array.isArray(data?.ideas) ? data!.ideas : [];
        if (!parsed.length) throw new Error('No Ideas landed. Try again with a little more detail.');
        await persistIdeas(parsed);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not add that Idea');
      } finally {
        setPhase('idle');
        resetRecording();
      }
    },
    [user, persistIdeas, resetRecording]
  );

  // Audio path: transcribe first, then extract Ideas.
  useEffect(() => {
    if (!audioBlob) return;
    let cancelled = false;
    void (async () => {
      setPhase('processing');
      try {
        const base64 = await blobToBase64(audioBlob);
        const t = await supabase.functions.invoke('transcribe', {
          body: { audio: base64, format: 'webm' },
        });
        if (t.error) throw new Error(t.error.message || 'Transcription failed');
        const tr = (t.data as { transcript?: string } | null)?.transcript ?? '';
        if (cancelled) return;
        if (!tr.trim()) throw new Error('Nothing came through. Try again?');
        await extractFrom(tr);
      } catch (e) {
        if (cancelled) return;
        toast.error(e instanceof Error ? e.message : 'Could not process that');
        setPhase('idle');
        resetRecording();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [audioBlob, extractFrom, resetRecording]);

  useEffect(() => {
    if (recError) {
      toast.error(recError);
      setPhase('idle');
    }
  }, [recError]);

  const handleHoldStart = useCallback(async () => {
    if (phase === 'processing') return;
    setPhase('recording');
    await startRecording();
  }, [phase, startRecording]);

  const handleHoldEnd = useCallback(() => {
    if (isRecording) {
      stopRecording();
      setPhase('processing');
    }
  }, [isRecording, stopRecording]);

  const busy = phase === 'processing';

  return (
    <div className="min-h-full bg-background px-4 pt-6 pb-24 flex flex-col">
      <motion.header
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <h1 className="text-display text-foreground">Ask</h1>
        <p className="mt-1 text-sm text-foreground-secondary leading-relaxed">
          Talk to me. Tell me what you could sell, what just happened, or who you met —
          I'll turn it into your next move.
        </p>
      </motion.header>

      <section className="flex-1 flex flex-col items-center">
        <AnimatePresence mode="wait">
          {phase === 'processing' ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <motion.div
                className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
              />
              <p className="mt-6 text-sm text-foreground-secondary">Turning that into your next move…</p>
            </motion.div>
          ) : phase === 'recording' ? (
            <motion.div
              key="recording"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center pt-6"
            >
              <div className="flex items-end gap-1 h-16 mb-6">
                {waveformData.map((v, i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 rounded-full bg-primary"
                    animate={{ height: `${Math.max(8, v * 64)}px` }}
                    transition={{ duration: 0.08 }}
                  />
                ))}
              </div>
              <button
                onPointerUp={handleHoldEnd}
                onPointerLeave={handleHoldEnd}
                className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary-light shadow-lg shadow-primary/40 flex items-center justify-center animate-pulse"
              >
                <Mic className="w-9 h-9 text-white" strokeWidth={2} />
              </button>
              <p className="mt-4 text-sm text-foreground-secondary">
                Listening… {Math.floor(duration / 1000)}s — release when done
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col items-center pt-4"
            >
              <motion.button
                onPointerDown={handleHoldStart}
                onPointerUp={handleHoldEnd}
                onPointerLeave={handleHoldEnd}
                whileTap={{ scale: 0.94 }}
                className="relative w-28 h-28 rounded-full bg-gradient-to-br from-primary to-primary-light shadow-lg shadow-primary/30 flex items-center justify-center"
              >
                <Mic className="w-10 h-10 text-white" strokeWidth={2} />
              </motion.button>
              <p className="mt-4 text-xs text-foreground-muted">Hold to talk · up to 90s</p>

              {!showType && (
                <div className="mt-8 w-full max-w-sm space-y-2">
                  <p className="text-[11px] uppercase tracking-wide text-foreground-muted text-center mb-1">
                    Not sure where to start?
                  </p>
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setTyped(s + '\n\n');
                        setShowType(true);
                      }}
                      className="w-full text-left rounded-xl border border-border/60 bg-card/50 px-3 py-2.5 text-[13px] text-foreground-secondary hover:border-primary/40 hover:text-foreground transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-6 w-full max-w-sm">
                {!showType ? (
                  <button
                    onClick={() => setShowType(true)}
                    className="w-full text-center text-xs text-foreground-muted hover:text-foreground"
                  >
                    or type it instead
                  </button>
                ) : (
                  <>
                    <textarea
                      value={typed}
                      onChange={(e) => setTyped(e.target.value)}
                      maxLength={MAX_TYPED_CHARS}
                      rows={5}
                      autoFocus
                      placeholder="I'm a fractional CMO. I just helped a Series B fintech fix their attribution and cut CAC by 30%…"
                      className={cn(
                        'w-full rounded-2xl border border-border bg-card p-4 text-sm text-foreground',
                        'placeholder:text-foreground-muted resize-none',
                        'focus:outline-none focus:ring-2 focus:ring-primary/40'
                      )}
                    />
                    <button
                      onClick={() => void extractFrom(typed)}
                      disabled={!typed.trim() || busy}
                      className={cn(
                        'mt-3 w-full h-12 rounded-full bg-primary text-primary-foreground font-medium',
                        'flex items-center justify-center gap-2 shadow-lg shadow-primary/30',
                        'disabled:opacity-50'
                      )}
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {busy ? 'Turning it into a move…' : 'Capture'}
                      {!busy && <ArrowRight className="w-4 h-4" />}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
};

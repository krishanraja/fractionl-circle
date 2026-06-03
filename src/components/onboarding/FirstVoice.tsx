import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Sparkles, Loader2, AlertCircle, Check, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { ingestVoiceSeed, type VoiceSeedPerson } from '@/lib/circleIngest';
import { emitLifecycle } from '@/lib/attribution';

// Seed the Circle with people named during onboarding so day one is not a
// "no people to match against" dead-end. Flag-gated (default off) until enabled.
// Default ON: people named during onboarding seed the Circle so day one is not
// a "no one to match against" dead-end. Set VITE_PEOPLE_SEEDING_ENABLED=false
// to disable. (P0: was opt-in and off, which left every new Circle empty.)
const PEOPLE_SEEDING_ENABLED = import.meta.env.VITE_PEOPLE_SEEDING_ENABLED !== 'false';

type Step = 'intro' | 'recording' | 'processing' | 'review' | 'error';

interface IdeaDraft {
  title: string;
  one_liner?: string | null;
  offer?: string | null;
  pain?: string | null;
  price_band?: string | null;
  icp?: string | null;
  is_adjacent?: boolean;
}

const MAX_RECORDING_MS = 90_000;
const MAX_TYPED_CHARS = 1500;

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

interface FirstVoiceProps {
  onComplete: () => void;
}

export const FirstVoice = ({ onComplete }: FirstVoiceProps) => {
  const { user } = useAuth();
  const { completeOnboardingStep } = useUserProfile();
  const [step, setStep] = useState<Step>('intro');
  const [transcript, setTranscript] = useState('');
  const [ideas, setIdeas] = useState<IdeaDraft[]>([]);
  const [people, setPeople] = useState<VoiceSeedPerson[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [typed, setTyped] = useState('');

  const {
    isRecording,
    duration,
    audioBlob,
    waveformData,
    startRecording,
    stopRecording,
    resetRecording,
    error: recError,
  } = useVoiceRecording({ maxDuration: MAX_RECORDING_MS });

  const handleHoldStart = useCallback(async () => {
    setErrorMsg('');
    setStep('recording');
    await startRecording();
  }, [startRecording]);

  const handleHoldEnd = useCallback(() => {
    if (isRecording) stopRecording();
  }, [isRecording, stopRecording]);

  useEffect(() => {
    if (recError) {
      setErrorMsg(recError);
      setStep('error');
    }
  }, [recError]);

  // Shared extraction: turn a transcript (typed, or transcribed from audio)
  // into Ideas. Used by both the hold-to-talk and the type-instead paths so a
  // user without a mic — or who simply prefers typing — is never locked out.
  const extractIdeas = useCallback(async (tr: string) => {
    setStep('processing');
    try {
      const extractRes = await supabase.functions.invoke('extract-ideas', {
        body: { transcript: tr },
      });
      if (extractRes.error) throw new Error(extractRes.error.message || 'Could not make sense of that');
      const data = extractRes.data as { ideas?: IdeaDraft[]; people?: VoiceSeedPerson[]; summary?: string | null } | null;
      const parsed = Array.isArray(data?.ideas) ? data!.ideas : [];
      if (!parsed.length) throw new Error('No Ideas landed. Try again with a little more detail.');
      setIdeas(parsed);
      setPeople(Array.isArray(data?.people) ? data!.people : []);
      setSummary(data?.summary ?? null);
      setStep('review');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong');
      setStep('error');
    }
  }, []);

  // Audio path: transcribe first, then hand the transcript to extractIdeas.
  useEffect(() => {
    if (!audioBlob) return;
    let cancelled = false;

    const run = async () => {
      setStep('processing');
      try {
        const base64 = await blobToBase64(audioBlob);
        const transcribeRes = await supabase.functions.invoke('transcribe', {
          body: { audio: base64, format: 'webm' },
        });
        if (transcribeRes.error) throw new Error(transcribeRes.error.message || 'Transcription failed');
        const tr: string = (transcribeRes.data as { transcript?: string } | null)?.transcript ?? '';
        if (!tr.trim()) throw new Error('Nothing came through. Try again?');
        if (cancelled) return;
        setTranscript(tr);
        await extractIdeas(tr);
      } catch (e) {
        if (cancelled) return;
        setErrorMsg(e instanceof Error ? e.message : 'Something went wrong');
        setStep('error');
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [audioBlob, extractIdeas]);

  const handleTypedSubmit = useCallback(() => {
    const text = typed.trim();
    if (!text) return;
    setErrorMsg('');
    setTranscript(text);
    void extractIdeas(text);
  }, [typed, extractIdeas]);

  const handleSave = async () => {
    if (!user || !ideas.length) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('ideas').insert(
        ideas.map((i) => ({
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

      // Seed the Circle with the people they named, so the overnight match has
      // someone to run against on night one. Non-fatal: never block onboarding.
      if (PEOPLE_SEEDING_ENABLED && people.length) {
        try {
          await ingestVoiceSeed(user.id, people);
        } catch {
          // ignore: seeding is a bonus, onboarding completion is what matters
        }
      }

      await completeOnboardingStep(4);
      // Magic moment reached (first voice -> Ideas saved). Server-side lifecycle
      // emit (5d); deduped on user_id downstream, fire-and-forget.
      emitLifecycle('activated');
      onComplete();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Could not save Ideas');
      setStep('error');
      setIsSaving(false);
    }
  };

  const handleRetry = () => {
    resetRecording();
    setTranscript('');
    setTyped('');
    setIdeas([]);
    setSummary(null);
    setErrorMsg('');
    setStep('intro');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-between px-6 pt-16 pb-12">
      <AnimatePresence mode="wait">
        {step === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center max-w-md"
          >
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg font-medium text-foreground leading-relaxed"
            >
              Tell me what you've done.
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mt-2 text-sm text-foreground-secondary"
            >
              I'll turn it into Ideas you can sell.
            </motion.p>
          </motion.div>
        )}

        {step === 'recording' && (
          <motion.div
            key="recording"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center"
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
            <p className="text-sm text-foreground-secondary">
              Listening… {Math.floor(duration / 1000)}s
            </p>
          </motion.div>
        )}

        {step === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center"
          >
            <motion.div
              className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
            />
            <p className="mt-6 text-sm text-foreground-secondary">
              {transcript ? 'Turning it into Ideas…' : 'Writing it down…'}
            </p>
          </motion.div>
        )}

        {step === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex-1 w-full max-w-md flex flex-col"
          >
            {summary && (
              <p className="text-sm text-foreground-secondary leading-relaxed mb-3">
                {summary}
              </p>
            )}
            <p className="text-xs text-foreground-muted leading-relaxed mb-6">
              Each one is something you could sell — with a rough price band and the kind of buyer (ICP) it suits.
            </p>
            <div className="space-y-3">
              {ideas.map((i, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08 }}
                  className={cn(
                    'rounded-2xl border p-4',
                    i.is_adjacent
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border/60 bg-card/50 backdrop-blur'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-foreground">{i.title}</h3>
                      {i.one_liner && (
                        <p className="mt-1 text-xs text-foreground-secondary leading-relaxed">
                          {i.one_liner}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-foreground-muted">
                        {i.price_band && <span>{i.price_band}</span>}
                        {i.icp && <span>· {i.icp}</span>}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            {PEOPLE_SEEDING_ENABLED && people.length > 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: ideas.length * 0.08 + 0.1 }}
                className="mt-4 text-xs text-foreground-muted text-center"
              >
                I also caught {people.length} {people.length === 1 ? 'person' : 'people'} you mentioned. I'll start matching them against these tonight.
              </motion.p>
            )}
          </motion.div>
        )}

        {step === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center max-w-md"
          >
            <AlertCircle className="w-8 h-8 text-destructive mb-4" />
            <p className="text-sm text-foreground">{errorMsg || 'Something went wrong'}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-md flex flex-col items-center">
        {step === 'intro' && (
          <>
            <motion.button
              onPointerDown={handleHoldStart}
              onPointerUp={handleHoldEnd}
              onPointerLeave={handleHoldEnd}
              whileTap={{ scale: 0.94 }}
              className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary-light shadow-lg shadow-primary/30 flex items-center justify-center"
            >
              <Mic className="w-9 h-9 text-white" strokeWidth={2} />
            </motion.button>
            <p className="mt-4 text-xs text-foreground-muted">Hold to talk · up to 90s</p>

            <div className="mt-8 w-full">
              <div className="flex items-center gap-3 text-xs text-foreground-muted">
                <span className="h-px flex-1 bg-border" />
                or type it instead
                <span className="h-px flex-1 bg-border" />
              </div>
              <textarea
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                maxLength={MAX_TYPED_CHARS}
                rows={4}
                placeholder="I'm a fractional CMO. I just helped a Series B fintech fix their attribution and cut CAC by 30%…"
                className={cn(
                  'mt-3 w-full rounded-2xl border border-border bg-card p-4 text-sm text-foreground',
                  'placeholder:text-foreground-muted resize-none',
                  'focus:outline-none focus:ring-2 focus:ring-primary/40'
                )}
              />
              <button
                onClick={handleTypedSubmit}
                disabled={!typed.trim()}
                className={cn(
                  'mt-3 w-full h-12 rounded-full bg-primary text-primary-foreground font-medium',
                  'flex items-center justify-center gap-2 disabled:opacity-50'
                )}
              >
                Turn this into Ideas
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {step === 'recording' && (
          <motion.button
            onPointerUp={handleHoldEnd}
            onPointerLeave={handleHoldEnd}
            whileTap={{ scale: 0.94 }}
            className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary-light shadow-lg shadow-primary/40 flex items-center justify-center animate-pulse"
          >
            <Mic className="w-9 h-9 text-white" strokeWidth={2} />
          </motion.button>
        )}

        {step === 'review' && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              'w-full h-12 rounded-full bg-primary text-primary-foreground font-medium',
              'flex items-center justify-center gap-2',
              'shadow-lg shadow-primary/30',
              'disabled:opacity-60'
            )}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Good. Start with these.
          </button>
        )}

        {step === 'error' && (
          <button
            onClick={handleRetry}
            className="w-full h-12 rounded-full border border-border/60 bg-card/50 backdrop-blur text-sm font-medium text-foreground"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
};

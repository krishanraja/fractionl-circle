import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Sparkles, Loader2, AlertCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';

type Step = 'intro' | 'recording' | 'processing' | 'review' | 'error';

interface IdeaDraft {
  title: string;
  one_liner?: string | null;
  offer?: string | null;
  price_band?: string | null;
  icp?: string | null;
  is_adjacent?: boolean;
}

const MAX_RECORDING_MS = 90_000;

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
  const [summary, setSummary] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

        const extractRes = await supabase.functions.invoke('extract-ideas', {
          body: { transcript: tr },
        });
        if (extractRes.error) throw new Error(extractRes.error.message || 'Could not make sense of that');
        const data = extractRes.data as { ideas?: IdeaDraft[]; summary?: string | null } | null;
        const parsed = Array.isArray(data?.ideas) ? data!.ideas : [];
        if (!parsed.length) throw new Error('No Ideas landed. Try again with a little more detail.');
        if (cancelled) return;
        setIdeas(parsed);
        setSummary(data?.summary ?? null);
        setStep('review');
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
  }, [audioBlob]);

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
          price_band: i.price_band ?? null,
          icp: i.icp ?? null,
          status: 'voiced' as const,
        }))
      );
      if (error) throw error;
      await completeOnboardingStep(4);
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
              <p className="text-sm text-foreground-secondary leading-relaxed mb-6">
                {summary}
              </p>
            )}
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

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';

// Anonymous "live-mic demo": a logged-OUT visitor speaks (or types) for a few
// seconds and watches real, sellable Ideas get extracted before any signup.
// This is the conversion hook. It calls the unauthenticated demo-extract edge
// function (verify_jwt=false, IP rate-limited 3/hour). No auth, no DB writes.

type Step = 'intro' | 'recording' | 'processing' | 'review' | 'error';

interface DemoIdea {
  title: string;
  one_liner?: string | null;
  price_band?: string | null;
  icp?: string | null;
}

const MAX_RECORDING_MS = 30_000;
const MAX_TRANSCRIPT_CHARS = 1200;

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

export default function TryDemo() {
  const [step, setStep] = useState<Step>('intro');
  const [typed, setTyped] = useState('');
  const [ideas, setIdeas] = useState<DemoIdea[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

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

  const runExtract = useCallback(async (body: { transcript?: string; audio?: string; format?: string }) => {
    setStep('processing');
    try {
      const res = await supabase.functions.invoke('demo-extract', { body });
      if (res.error) {
        // supabase-js surfaces non-2xx as a FunctionsHttpError; pull the body.
        let message = res.error.message || 'Could not make sense of that';
        const ctx = (res.error as { context?: Response }).context;
        if (ctx && typeof ctx.json === 'function') {
          try {
            const payload = await ctx.json();
            if (payload?.error) message = payload.error;
            if (ctx.status === 429) {
              setErrorMsg(payload?.error || 'You have tried the demo a few times. Sign up to keep going.');
              setStep('error');
              return;
            }
          } catch {
            // fall through to generic message below
          }
        }
        throw new Error(message);
      }
      const data = res.data as { ideas?: DemoIdea[] } | null;
      const parsed = Array.isArray(data?.ideas) ? data!.ideas : [];
      if (!parsed.length) throw new Error('No Ideas landed. Try again with a little more detail.');
      setIdeas(parsed);
      setStep('review');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong');
      setStep('error');
    }
  }, []);

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
      try {
        const base64 = await blobToBase64(audioBlob);
        if (cancelled) return;
        await runExtract({ audio: base64, format: 'webm' });
      } catch (e) {
        if (cancelled) return;
        setErrorMsg(e instanceof Error ? e.message : 'Could not read audio');
        setStep('error');
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [audioBlob, runExtract]);

  const handleTypedSubmit = useCallback(() => {
    const text = typed.trim();
    if (!text) return;
    setErrorMsg('');
    void runExtract({ transcript: text.slice(0, MAX_TRANSCRIPT_CHARS) });
  }, [typed, runExtract]);

  const handleRetry = () => {
    resetRecording();
    setTyped('');
    setIdeas([]);
    setErrorMsg('');
    setStep('intro');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-6 pt-16 pb-12 safe-top safe-bottom">
      <div className="w-full max-w-md flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {step === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-center"
            >
              <motion.h1
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-2xl font-semibold text-foreground leading-snug"
              >
                Say what you've been working on.
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mt-2 text-sm text-foreground-secondary"
              >
                In a few seconds, watch it turn into Ideas you could sell.
              </motion.p>

              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                onPointerDown={handleHoldStart}
                onPointerUp={handleHoldEnd}
                onPointerLeave={handleHoldEnd}
                whileTap={{ scale: 0.94 }}
                className="mt-10 relative w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary-light shadow-lg shadow-primary/30 flex items-center justify-center"
              >
                <Mic className="w-9 h-9 text-primary-foreground" strokeWidth={2} />
              </motion.button>
              <p className="mt-4 text-xs text-foreground-muted">Hold to talk · up to 30s</p>

              <div className="mt-8 w-full">
                <div className="flex items-center gap-3 text-xs text-foreground-muted">
                  <span className="h-px flex-1 bg-border" />
                  or type what you've been working on
                  <span className="h-px flex-1 bg-border" />
                </div>
                <textarea
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  maxLength={MAX_TRANSCRIPT_CHARS}
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
                  Extract my Ideas
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
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
              <motion.button
                onPointerUp={handleHoldEnd}
                onPointerLeave={handleHoldEnd}
                whileTap={{ scale: 0.94 }}
                className="mt-10 relative w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary-light shadow-lg shadow-primary/40 flex items-center justify-center animate-pulse"
              >
                <Mic className="w-9 h-9 text-primary-foreground" strokeWidth={2} />
              </motion.button>
              <p className="mt-4 text-xs text-foreground-muted">Release to finish</p>
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
              <p className="mt-6 text-sm text-foreground-secondary">Turning it into Ideas…</p>
            </motion.div>
          )}

          {step === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex-1 w-full flex flex-col"
            >
              <p className="text-sm text-foreground-secondary leading-relaxed mb-6">
                Here is what you could sell:
              </p>
              <div className="space-y-3">
                {ideas.map((i, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.12 }}
                    className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-4"
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

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: ideas.length * 0.12 + 0.2 }}
                className="mt-8 text-center"
              >
                <p className="text-sm font-medium text-foreground leading-relaxed">
                  These are yours. Want to see who in your network to sell them to?
                </p>
                <Link
                  to="/"
                  className={cn(
                    'mt-4 inline-flex w-full h-12 rounded-full bg-primary text-primary-foreground font-medium',
                    'items-center justify-center gap-2 shadow-lg shadow-primary/30'
                  )}
                >
                  Show me my Circle
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  onClick={handleRetry}
                  className="mt-3 text-xs text-foreground-muted"
                >
                  Try again
                </button>
              </motion.div>
            </motion.div>
          )}

          {step === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-center"
            >
              <AlertCircle className="w-8 h-8 text-destructive mb-4" />
              <p className="text-sm text-foreground">{errorMsg || 'Something went wrong'}</p>
              <button
                onClick={handleRetry}
                className="mt-6 w-full h-12 rounded-full border border-border/60 bg-card/50 backdrop-blur text-sm font-medium text-foreground"
              >
                Try again
              </button>
              <Link to="/" className="mt-4 text-xs text-foreground-muted">
                Or sign up to keep going
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

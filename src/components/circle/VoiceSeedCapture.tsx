import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { ingestVoiceSeed, type VoiceSeedPerson, type IngestResult } from '@/lib/circleIngest';

type Step = 'intro' | 'recording' | 'processing' | 'review' | 'saving' | 'done' | 'error';

const MAX_RECORDING_MS = 60_000;

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

interface VoiceSeedCaptureProps {
  onDone?: (result: IngestResult) => void;
}

export const VoiceSeedCapture = ({ onDone }: VoiceSeedCaptureProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('intro');
  const [people, setPeople] = useState<VoiceSeedPerson[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [result, setResult] = useState<IngestResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const {
    isRecording, duration, audioBlob, waveformData,
    startRecording, stopRecording, resetRecording, error: recError,
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

        const parseRes = await supabase.functions.invoke('parse-voice-seed', {
          body: { transcript: tr },
        });
        if (parseRes.error) throw new Error(parseRes.error.message || 'Could not parse names');
        const data = parseRes.data as { people?: VoiceSeedPerson[]; summary?: string | null } | null;
        const parsed = Array.isArray(data?.people) ? data!.people : [];
        if (!parsed.length) throw new Error('No one came through. Try naming a few people again.');
        if (cancelled) return;

        setPeople(parsed);
        setSummary(data?.summary ?? null);
        setStep('review');
      } catch (e) {
        if (cancelled) return;
        setErrorMsg(e instanceof Error ? e.message : 'Something went wrong');
        setStep('error');
      }
    };

    void run();
    return () => { cancelled = true; };
  }, [audioBlob]);

  const handleSave = async () => {
    if (!user || !people.length) return;
    setStep('saving');
    try {
      const ingested = await ingestVoiceSeed(user.id, people);
      setResult(ingested);
      setStep('done');
      onDone?.(ingested);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Could not save to Circle');
      setStep('error');
    }
  };

  const handleRetry = () => {
    resetRecording();
    setPeople([]);
    setSummary(null);
    setResult(null);
    setErrorMsg('');
    setStep('intro');
  };

  return (
    <div className="flex flex-col items-center w-full">
      <AnimatePresence mode="wait">
        {step === 'intro' && (
          <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center max-w-sm mb-6">
            <p className="text-sm text-foreground leading-relaxed">
              Name 5 people you trust most — or anyone you'd want me to start with. Give me a quick hint about each (an ex-colleague, an old boss, a friend).
            </p>
          </motion.div>
        )}

        {step === 'recording' && (
          <motion.div key="recording" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center mb-6">
            <div className="flex items-end gap-1 h-14 mb-3">
              {waveformData.map((v, i) => (
                <motion.div
                  key={i}
                  className="w-1.5 rounded-full bg-primary"
                  animate={{ height: `${Math.max(6, v * 56)}px` }}
                  transition={{ duration: 0.08 }}
                />
              ))}
            </div>
            <p className="text-xs text-foreground-secondary">Listening… {Math.floor(duration / 1000)}s</p>
          </motion.div>
        )}

        {step === 'processing' && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center mb-6">
            <motion.div
              className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            />
            <p className="mt-4 text-xs text-foreground-secondary">Getting names…</p>
          </motion.div>
        )}

        {step === 'review' && (
          <motion.div key="review" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full mb-6">
            {summary && (
              <p className="text-xs text-foreground-secondary mb-3">{summary}</p>
            )}
            <div className="space-y-2">
              {people.map((p, idx) => (
                <div key={idx} className="rounded-xl border border-border/60 bg-card/50 backdrop-blur p-3">
                  <p className="text-sm font-semibold text-foreground">{p.name}</p>
                  {p.hint && <p className="text-xs text-foreground-secondary mt-0.5">{p.hint}</p>}
                  <div className="mt-1 flex gap-2 text-[11px] text-foreground-muted">
                    {p.company && <span>{p.company}</span>}
                    {p.title && <span>· {p.title}</span>}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'done' && result && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2 mb-6">
            <Check className="w-8 h-8 text-success" />
            <p className="text-sm font-medium text-foreground">
              {result.circleNew} new · {result.circleMerged} merged into your Circle.
            </p>
          </motion.div>
        )}

        {step === 'error' && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2 mb-6 text-center">
            <AlertCircle className="w-6 h-6 text-destructive" />
            <p className="text-sm text-foreground">{errorMsg || 'Something went wrong'}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {step === 'intro' && (
        <>
          <motion.button
            onPointerDown={handleHoldStart}
            onPointerUp={handleHoldEnd}
            onPointerLeave={handleHoldEnd}
            whileTap={{ scale: 0.94 }}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary-light shadow-lg shadow-primary/30 flex items-center justify-center"
          >
            <Mic className="w-8 h-8 text-white" strokeWidth={2} />
          </motion.button>
          <p className="mt-3 text-xs text-foreground-muted">Hold to talk · up to 60s</p>
        </>
      )}

      {step === 'recording' && (
        <motion.button
          onPointerUp={handleHoldEnd}
          onPointerLeave={handleHoldEnd}
          whileTap={{ scale: 0.94 }}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary-light shadow-lg shadow-primary/40 flex items-center justify-center animate-pulse"
        >
          <Mic className="w-8 h-8 text-white" strokeWidth={2} />
        </motion.button>
      )}

      {step === 'review' && (
        <button
          onClick={handleSave}
          className={cn(
            'w-full h-11 rounded-full bg-primary text-primary-foreground text-sm font-medium',
            'flex items-center justify-center gap-2 shadow-lg shadow-primary/30'
          )}
        >
          <Check className="w-4 h-4" />
          Add {people.length} to my Circle
        </button>
      )}

      {step === 'saving' && (
        <button
          disabled
          className="w-full h-11 rounded-full bg-primary/70 text-primary-foreground text-sm font-medium flex items-center justify-center gap-2"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          Saving…
        </button>
      )}

      {(step === 'done' || step === 'error') && (
        <button
          onClick={handleRetry}
          className="w-full h-11 rounded-full border border-border/60 bg-card/50 backdrop-blur text-sm font-medium text-foreground"
        >
          {step === 'done' ? 'Name more' : 'Try again'}
        </button>
      )}
    </div>
  );
};

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Loader2, Check, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { ingestVoiceSeed, type VoiceSeedPerson, type IngestResult } from '@/lib/circleIngest';
import { haptics } from '@/utils/haptics';

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
  onClose?: () => void;
}

export const VoiceSeedCapture = ({ onDone, onClose }: VoiceSeedCaptureProps) => {
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
    haptics.medium();
    setStep('recording');
    await startRecording();
  }, [startRecording]);

  const handleHoldEnd = useCallback(() => {
    if (isRecording) {
      haptics.tap();
      stopRecording();
    }
  }, [isRecording, stopRecording]);

  useEffect(() => {
    if (recError) {
      haptics.error();
      setErrorMsg(recError);
      setStep('error');
    }
  }, [recError]);

  // Voice success holds slightly longer so the new/merged count is readable.
  useEffect(() => {
    if (step !== 'done' || !onClose) return;
    const id = window.setTimeout(onClose, 2200);
    return () => window.clearTimeout(id);
  }, [step, onClose]);

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
        haptics.tap();
        setStep('review');
      } catch (e) {
        if (cancelled) return;
        haptics.error();
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
      haptics.success();
      setStep('done');
      onDone?.(ingested);
    } catch (e) {
      haptics.error();
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
              Name a few people you trust — anyone you'd want us to start with. A quick hint about each helps (an ex-colleague, an old boss, a friend).
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
            <div>
              {people.map((p, idx) => (
                <div key={idx} className="crow" style={{ marginTop: idx ? 8 : 0, padding: '12px 14px' }}>
                  <p className="cname">{p.name}</p>
                  {p.hint && <p className="csub">{p.hint}</p>}
                  {(p.company || p.title) && (
                    <p className="ssrc" style={{ marginTop: 5 }}>{[p.company, p.title].filter(Boolean).join(' · ')}</p>
                  )}
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
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'var(--thx-accent)', boxShadow: '0 8px 30px -6px rgba(224,162,60,0.5)' }}
          >
            <Mic className="w-8 h-8" style={{ color: '#1A1206' }} strokeWidth={2} />
          </motion.button>
          <p className="mt-3 text-xs text-foreground-muted">Hold to talk · up to 60s</p>
        </>
      )}

      {step === 'recording' && (
        <motion.button
          onPointerUp={handleHoldEnd}
          onPointerLeave={handleHoldEnd}
          whileTap={{ scale: 0.94 }}
          className="w-20 h-20 rounded-full flex items-center justify-center animate-pulse"
          style={{ background: 'var(--thx-accent)', boxShadow: '0 8px 30px -6px rgba(224,162,60,0.6)' }}
        >
          <Mic className="w-8 h-8" style={{ color: '#1A1206' }} strokeWidth={2} />
        </motion.button>
      )}

      {step === 'review' && (
        <button className="cta" style={{ width: '100%' }} onClick={handleSave}>
          <span className="ctaicon"><Check size={16} /> Add {people.length} to my Circle</span>
          <span className="mono">→</span>
        </button>
      )}

      {step === 'saving' && (
        <button className="cta" style={{ width: '100%' }} disabled>
          <span className="ctaicon"><Loader2 size={16} style={{ animation: 'thxspin 0.8s linear infinite' }} /> Saving…</span>
        </button>
      )}

      {(step === 'done' || step === 'error') && (
        <button className="ghostbtn" style={{ width: '100%', justifyContent: 'center' }} onClick={handleRetry}>
          {step === 'done' ? 'Name more' : 'Try again'}
        </button>
      )}
    </div>
  );
};

import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { parseLinkedInCsv } from '@/lib/linkedinCsv';
import { ingestLinkedInCsv, type IngestResult, type IngestProgress } from '@/lib/circleIngest';
import { haptics } from '@/utils/haptics';

type Step = 'idle' | 'parsing' | 'ingesting' | 'done' | 'error';

interface LinkedInCsvDropProps {
  onDone?: (result: IngestResult) => void;
}

export const LinkedInCsvDrop = ({ onDone }: LinkedInCsvDropProps) => {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [result, setResult] = useState<IngestResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [progress, setProgress] = useState<IngestProgress | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!user) {
      setErrorMsg('Sign in first.');
      setStep('error');
      return;
    }
    setErrorMsg('');

    try {
      setStep('parsing');
      const text = await file.text();
      const parsed = parseLinkedInCsv(text);
      if (!parsed.connections.length) {
        setErrorMsg(parsed.warning ?? 'No connections found in the file.');
        setStep('error');
        return;
      }

      setStep('ingesting');
      setProgress({ total: parsed.connections.length, processed: 0 });
      const ingested = await ingestLinkedInCsv(user.id, parsed.connections, setProgress);
      setResult(ingested);
      haptics.success();
      setStep('done');
      onDone?.(ingested);
    } catch (e) {
      haptics.error();
      setErrorMsg(e instanceof Error ? e.message : 'Ingestion failed');
      setStep('error');
    }
  }, [user, onDone]);

  const onPick = () => inputRef.current?.click();

  const onDrop = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = '';
  };

  const onReset = () => {
    setStep('idle');
    setResult(null);
    setErrorMsg('');
    setProgress(null);
  };

  const busy = step === 'parsing' || step === 'ingesting';

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card/50 backdrop-blur p-4 text-xs text-foreground-secondary leading-relaxed">
        <p className="mb-2 font-medium text-foreground">How to get your CSV</p>
        <ol className="list-decimal pl-4 space-y-1">
          <li>
            <a
              href="https://www.linkedin.com/mypreferences/d/download-my-data"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              LinkedIn → Settings &amp; Privacy → Get a copy of your data
            </a>
            .
          </li>
          <li>Pick <span className="font-medium">Connections</span> only. It arrives by email in about 10 minutes.</li>
          <li>Drop the <span className="font-mono">Connections.csv</span> file below.</li>
        </ol>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={onChange}
      />

      <motion.button
        type="button"
        onClick={onPick}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        disabled={busy}
        whileTap={{ scale: busy ? 1 : 0.98 }}
        className={cn(
          'w-full rounded-2xl px-6 py-10 flex flex-col items-center justify-center gap-3',
          'transition-colors',
          step === 'idle' && 'bg-surface-muted/70 hover:bg-surface-muted',
          step === 'parsing' && 'bg-primary/8',
          step === 'ingesting' && 'bg-primary/8',
          step === 'done' && 'bg-success/8',
          step === 'error' && 'bg-destructive/8'
        )}
      >
        {step === 'idle' && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" strokeWidth={1.8} />
            </div>
            <p className="text-[15px] font-semibold text-foreground">Drop Connections.csv</p>
            <p className="text-xs text-foreground-muted">or tap to pick a file</p>
          </>
        )}
        {step === 'parsing' && (
          <>
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="text-sm font-medium text-foreground">Reading your connections…</p>
          </>
        )}
        {step === 'ingesting' && (
          <>
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="text-sm font-medium text-foreground">
              {progress && progress.total > 0
                ? `Weaving ${progress.processed.toLocaleString()} of ${progress.total.toLocaleString()}…`
                : 'Weaving them into your Circle…'}
            </p>
            {progress && progress.total > 0 && (
              <div className="w-2/3 h-1.5 rounded-full bg-border/60 overflow-hidden">
                <div
                  className="h-full bg-primary transition-[width] duration-200"
                  style={{ width: `${Math.min(100, Math.round((progress.processed / progress.total) * 100))}%` }}
                />
              </div>
            )}
          </>
        )}
        {step === 'done' && result && (
          <>
            <Check className="w-6 h-6 text-success" />
            <p className="text-sm font-medium text-foreground">
              {result.circleNew} new · {result.circleMerged} merged
            </p>
            <p className="text-xs text-foreground-muted">
              {result.rawInserted} connections ingested
            </p>
          </>
        )}
        {step === 'error' && (
          <>
            <AlertCircle className="w-6 h-6 text-destructive" />
            <p className="text-sm font-medium text-foreground">{errorMsg}</p>
            <p className="text-xs text-foreground-muted">Tap to try again</p>
          </>
        )}
      </motion.button>

      {(step === 'done' || step === 'error') && (
        <button
          onClick={onReset}
          className="w-full text-xs text-foreground-secondary hover:text-foreground"
        >
          {step === 'done' ? 'Drop another' : 'Reset'}
        </button>
      )}
    </div>
  );
};

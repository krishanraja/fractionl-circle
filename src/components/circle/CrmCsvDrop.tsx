import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { parseCrmCsv, formatLabel, type CrmFormat } from '@/lib/crmCsv';
import { ingestCrmCsv } from '@/lib/circleIngest';
import type { IngestResult } from '@/lib/circleIngest';

type Step = 'idle' | 'parsing' | 'ingesting' | 'done' | 'error';

interface CrmCsvDropProps {
  onDone?: (result: IngestResult) => void;
}

export const CrmCsvDrop = ({ onDone }: CrmCsvDropProps) => {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [format, setFormat] = useState<CrmFormat | null>(null);
  const [result, setResult] = useState<IngestResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

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
      const parsed = parseCrmCsv(text);
      setFormat(parsed.format);
      if (!parsed.contacts.length) {
        setErrorMsg(parsed.warning ?? 'No contacts found in the file.');
        setStep('error');
        return;
      }
      setStep('ingesting');
      const ingested = await ingestCrmCsv(user.id, parsed.format, parsed.contacts);
      setResult(ingested);
      setStep('done');
      onDone?.(ingested);
    } catch (e) {
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
    setFormat(null);
    setResult(null);
    setErrorMsg('');
  };

  const busy = step === 'parsing' || step === 'ingesting';

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card/50 backdrop-blur p-4 text-xs text-foreground-secondary leading-relaxed">
        <p className="mb-2 font-medium text-foreground">Bring your existing book</p>
        <p>
          Drop a CSV export from your old CRM or spreadsheet. We auto-detect
          the format — HubSpot, Attio, Folk, LinkedIn, or generic sheets all
          work. Headers get matched by name (case-insensitive); we pull name,
          email, phone, company, title, LinkedIn, and location if present.
        </p>
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
          'w-full rounded-2xl border-2 border-dashed p-8 flex flex-col items-center justify-center gap-2 transition-colors',
          step === 'idle' && 'border-border bg-card/40 hover:border-primary/50',
          step === 'parsing' && 'border-primary/40 bg-primary/5',
          step === 'ingesting' && 'border-primary/40 bg-primary/5',
          step === 'done' && 'border-success/40 bg-success/5',
          step === 'error' && 'border-destructive/40 bg-destructive/5'
        )}
      >
        {step === 'idle' && (
          <>
            <Upload className="w-6 h-6 text-foreground-secondary" />
            <p className="text-sm font-medium text-foreground">Drop a CSV</p>
            <p className="text-xs text-foreground-muted">HubSpot · Attio · Folk · LinkedIn · anything with a name column</p>
          </>
        )}
        {step === 'parsing' && (
          <>
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="text-sm font-medium text-foreground">Detecting format…</p>
          </>
        )}
        {step === 'ingesting' && (
          <>
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="text-sm font-medium text-foreground">
              Weaving {format ? formatLabel(format).toLowerCase() : 'contacts'} into your Circle…
            </p>
          </>
        )}
        {step === 'done' && result && (
          <>
            <Check className="w-6 h-6 text-success" />
            <p className="text-sm font-medium text-foreground">
              {result.circleNew} new · {result.circleMerged} merged
            </p>
            <p className="text-xs text-foreground-muted">
              {format ? `${formatLabel(format)} · ` : ''}{result.rawInserted} contacts ingested
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

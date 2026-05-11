import { useEffect, useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { ingestQuickAdd, type IngestResult } from '@/lib/circleIngest';
import { haptics } from '@/utils/haptics';

type Step = 'idle' | 'saving' | 'done' | 'error';

interface QuickAddTypedProps {
  onDone?: (result: IngestResult) => void;
  onClose?: () => void;
}

export const QuickAddTyped = ({ onDone, onClose }: QuickAddTypedProps) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-dismiss after success so the sheet doesn't trap the user.
  useEffect(() => {
    if (step !== 'done' || !onClose) return;
    const id = window.setTimeout(onClose, 1400);
    return () => window.clearTimeout(id);
  }, [step, onClose]);

  const handleSave = async () => {
    if (!user) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setStep('saving');
    setErrorMsg('');
    try {
      const { result } = await ingestQuickAdd(
        user.id,
        { name: trimmed, notes: notes.trim() || null },
        { kind: 'manual_add', label: 'Quick adds' },
      );
      haptics.success();
      setStep('done');
      onDone?.(result);
    } catch (e) {
      haptics.error();
      setErrorMsg(e instanceof Error ? e.message : 'Could not save');
      setStep('error');
    }
  };

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <Check className="w-6 h-6 text-success" />
        <p className="text-sm text-foreground">Added to your Circle.</p>
        <p className="text-xs text-foreground-secondary">
          You can fill in details later from their card.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        autoFocus
        className={cn(
          'w-full h-12 px-3 rounded-xl border border-border/60 bg-card/50 backdrop-blur',
          'text-base text-foreground placeholder:text-foreground-muted outline-none',
          'focus:border-primary/60'
        )}
      />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Anything else you remember (optional) — role, where you met, why they matter…"
        rows={3}
        className={cn(
          'w-full px-3 py-2 rounded-xl border border-border/60 bg-card/50 backdrop-blur',
          'text-base text-foreground placeholder:text-foreground-muted outline-none resize-none',
          'focus:border-primary/60'
        )}
      />
      {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
      <button
        onClick={handleSave}
        disabled={!name.trim() || step === 'saving'}
        className={cn(
          'w-full h-11 rounded-full bg-primary text-primary-foreground text-sm font-medium',
          'flex items-center justify-center gap-2 shadow-lg shadow-primary/30',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none'
        )}
      >
        {step === 'saving' ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving…
          </>
        ) : (
          <>
            <Check className="w-4 h-4" />
            Add to Circle
          </>
        )}
      </button>
      <p className="text-[11px] text-foreground-muted text-center">
        Just a name is enough. We'll enrich them as more sources show up.
      </p>
    </div>
  );
};

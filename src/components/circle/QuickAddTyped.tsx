import { useEffect, useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ingestQuickAdd, type IngestResult } from '@/lib/circleIngest';
import { haptics } from '@/utils/haptics';
import { TagChips } from './TagChips';

type Step = 'idle' | 'saving' | 'done' | 'error';

interface QuickAddTypedProps {
  onDone?: (result: IngestResult) => void;
  onClose?: () => void;
}

export const QuickAddTyped = ({ onDone, onClose }: QuickAddTypedProps) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
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
        { name: trimmed, notes: notes.trim() || null, tags: tags.length ? tags : null },
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '16px 0' }}>
        <Check size={22} style={{ color: 'var(--thx-good)' }} />
        <p className="slabel">Added to your Circle.</p>
        <p className="sub" style={{ marginTop: 0 }}>You can fill in details later from their card.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" autoFocus />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Anything else you remember (optional) - role, where you met, why they matter…"
        rows={3}
      />
      <TagChips tags={tags} onChange={setTags} context={{ name, notes }} />
      {errorMsg && <p className="cerr">{errorMsg}</p>}
      <button className="cta" onClick={handleSave} disabled={!name.trim() || step === 'saving'}>
        <span className="ctaicon">
          {step === 'saving' ? <Loader2 size={16} style={{ animation: 'thxspin 0.8s linear infinite' }} /> : <Check size={16} strokeWidth={2.5} />}
          {step === 'saving' ? 'Saving…' : 'Add to Circle'}
        </span>
        <span className="mono">→</span>
      </button>
      <p className="ssrc" style={{ textAlign: 'center' }}>Just a name is enough. We'll enrich them as more sources show up.</p>
    </div>
  );
};

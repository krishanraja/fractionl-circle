import { useEffect, useMemo, useState } from 'react';
import { Loader2, Check, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ingestQuickAdd, type IngestResult, type QuickAddInput } from '@/lib/circleIngest';
import { canonicalLinkedIn, canonicalInstagram } from '@/lib/handles';
import { linkedinSlug } from '@/lib/fingerprint';
import { haptics } from '@/utils/haptics';
import { ContactConfirmCard } from './ContactConfirmCard';

type Step = 'idle' | 'parsing' | 'review' | 'saving' | 'done' | 'error';

interface QuickAddPasteProps {
  onDone?: (result: IngestResult) => void;
  onClose?: () => void;
  /** Optional initial textarea value. When non-empty, autoFocuses and lets the user hit Parse. */
  prefill?: string;
}

// Sniff a single LinkedIn URL or Instagram handle out of pasted text so we
// can shortcut the LLM round-trip when the user pastes the obvious thing.
const detectShortcut = (raw: string): QuickAddInput | null => {
  const text = raw.trim();
  if (!text) return null;

  const linkedin = canonicalLinkedIn(text);
  if (linkedin && /^https?:\/\/(www\.)?linkedin\.com\//i.test(text)) {
    const slug = linkedinSlug(linkedin) ?? '';
    const guessName = slug
      ? slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : 'New contact';
    return {
      name: guessName,
      linkedin_url: linkedin,
      detected_platform: 'linkedin',
      notes: text,
    };
  }

  // Bare Instagram handle (with or without leading @).
  if (/^@?[a-z0-9._]{2,30}$/i.test(text) && !text.includes('http')) {
    const handle = text.replace(/^@/, '');
    const canonical = canonicalInstagram(handle);
    if (canonical) {
      return {
        name: `@${handle}`,
        instagram_handle: handle,
        detected_platform: 'instagram',
        notes: text,
      };
    }
  }

  return null;
};

export const QuickAddPaste = ({ onDone, onClose, prefill }: QuickAddPasteProps) => {
  const { user } = useAuth();
  const [text, setText] = useState(prefill ?? '');
  const [step, setStep] = useState<Step>('idle');
  const [parsed, setParsed] = useState<QuickAddInput | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (prefill && prefill.trim()) setText(prefill);
  }, [prefill]);

  useEffect(() => {
    if (step !== 'done' || !onClose) return;
    const id = window.setTimeout(onClose, 1400);
    return () => window.clearTimeout(id);
  }, [step, onClose]);

  const trimmed = text.trim();
  const shortcut = useMemo(() => detectShortcut(trimmed), [trimmed]);

  const handleParse = async () => {
    if (!trimmed) return;
    setErrorMsg('');

    if (shortcut) {
      haptics.tap();
      setParsed(shortcut);
      setStep('review');
      return;
    }

    setStep('parsing');
    try {
      // parse-voice-contact accepts unstructured text and returns the same
      // contact-fields shape as parse-contact-image.
      const res = await supabase.functions.invoke('parse-voice-contact', {
        body: { transcript: trimmed },
      });
      if (res.error) throw new Error(res.error.message || 'Could not parse');
      const data = res.data as { parsed?: Record<string, string | null> } | null;
      const p = data?.parsed ?? {};
      const name = (p.name ?? '').trim();
      if (!name) throw new Error("Couldn't pick out a name. Try adding the person's name.");
      setParsed({
        name,
        email: p.email,
        phone: p.phone,
        company: p.company,
        title: p.title,
        city: p.city,
        specialty_summary: p.specialty_summary,
        linkedin_url: p.linkedin_url,
        instagram_handle: p.instagram_handle,
        notes: trimmed,
      });
      haptics.tap();
      setStep('review');
    } catch (e) {
      haptics.error();
      setErrorMsg(e instanceof Error ? e.message : 'Could not parse');
      setStep('error');
    }
  };

  const handleSave = async () => {
    if (!user || !parsed) return;
    setStep('saving');
    setErrorMsg('');
    try {
      const { result } = await ingestQuickAdd(user.id, parsed, {
        kind: 'manual_add',
        label: 'Quick adds',
      });
      haptics.success();
      setStep('done');
      onDone?.(result);
    } catch (e) {
      haptics.error();
      setErrorMsg(e instanceof Error ? e.message : 'Could not save');
      setStep('error');
    }
  };

  const handleReset = () => {
    setText('');
    setParsed(null);
    setErrorMsg('');
    setStep('idle');
  };

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <Check className="w-6 h-6 text-success" />
        <p className="text-sm text-foreground">Added to your Circle.</p>
        <button
          onClick={handleReset}
          className="text-xs text-primary hover:underline"
        >
          Add another
        </button>
      </div>
    );
  }

  if ((step === 'review' || step === 'saving') && parsed) {
    return (
      <ContactConfirmCard
        value={parsed}
        onChange={setParsed}
        onSave={handleSave}
        onCancel={handleReset}
        saving={step === 'saving'}
        cancelLabel="Start over"
        errorMsg={errorMsg || undefined}
      />
    );
  }

  return (
    <div className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste a LinkedIn URL, an Instagram handle, an email signature, a bio — anything you have."
        rows={5}
        autoFocus
        className={cn(
          'w-full px-3 py-2 rounded-xl border border-border/60 bg-card/50 backdrop-blur',
          'text-base text-foreground placeholder:text-foreground-muted outline-none resize-none',
          'focus:border-primary/60'
        )}
      />
      {step === 'error' && errorMsg && (
        <div className="flex items-start gap-2 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      <button
        onClick={handleParse}
        disabled={!trimmed || step === 'parsing'}
        className={cn(
          'w-full h-11 rounded-full bg-primary text-primary-foreground text-sm font-medium',
          'flex items-center justify-center gap-2 shadow-lg shadow-primary/30',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none'
        )}
      >
        {step === 'parsing' ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Reading…
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            {shortcut ? 'Add this person' : 'Find this person'}
          </>
        )}
      </button>
    </div>
  );
};

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Check, AlertCircle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ingestQuickAdd, type IngestResult, type QuickAddInput } from '@/lib/circleIngest';
import { haptics } from '@/utils/haptics';
import { ContactConfirmCard } from './ContactConfirmCard';

type Step = 'idle' | 'parsing' | 'review' | 'saving' | 'done' | 'error';

interface QuickAddImageProps {
  onDone?: (result: IngestResult) => void;
  onClose?: () => void;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const s = typeof reader.result === 'string' ? reader.result : '';
      resolve(s.includes(',') ? s.split(',')[1] : s);
    };
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.readAsDataURL(file);
  });

export const QuickAddImage = ({ onDone, onClose }: QuickAddImageProps) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [parsed, setParsed] = useState<QuickAddInput | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (step !== 'done' || !onClose) return;
    const id = window.setTimeout(onClose, 1400);
    return () => window.clearTimeout(id);
  }, [step, onClose]);

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return;
    setErrorMsg('');
    setNote('');
    setPreviewUrl(URL.createObjectURL(file));
    setStep('parsing');
    // Resilient: whatever the parser does - succeeds, finds no name, errors, or
    // the key is missing - we land in an editable confirm card with the photo
    // still attached. A bad read becomes a 2-second manual add, never a dead end.
    try {
      const base64 = await fileToBase64(file);
      const res = await supabase.functions.invoke('parse-contact-image', {
        body: { image: base64 },
      });
      if (res.error) {
        setParsed({ name: '' });
        setNote("Couldn't read that one automatically - add the details below and save.");
        haptics.error();
        setStep('review');
        return;
      }
      const data = res.data as { parsed?: Record<string, string | null> } | null;
      const p = data?.parsed ?? {};
      const name = (p.name ?? '').trim();
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
        website: p.website,
        detected_platform: p.platform,
      });
      setNote(name ? '' : "Couldn't make out the name - add it and save. I kept everything else I could read.");
      haptics.tap();
      setStep('review');
    } catch {
      // Even a hard failure (couldn't read the file) → manual add, photo kept.
      setParsed({ name: '' });
      setNote("Couldn't read that image - add the details here and save.");
      haptics.error();
      setStep('review');
    }
  };

  const handleSave = async () => {
    if (!user || !parsed) return;
    setStep('saving');
    setErrorMsg('');
    try {
      const { result } = await ingestQuickAdd(user.id, parsed, {
        kind: 'business_card_photo',
        label: 'Quick adds (photo)',
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
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setParsed(null);
    setErrorMsg('');
    setNote('');
    setStep('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (step === 'done') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 0' }}>
        <Check size={22} style={{ color: 'var(--thx-good)' }} />
        <p className="slabel">Added from photo.</p>
        <button className="foothint" onClick={handleReset}>Add another</button>
      </div>
    );
  }

  if ((step === 'review' || step === 'saving') && parsed) {
    const preview = previewUrl ? (
      <div className="relative rounded-xl overflow-hidden border border-border/60">
        <img src={previewUrl} alt="Captured" className="w-full max-h-48 object-cover" />
        <button
          onClick={handleReset}
          aria-label="Remove image"
          disabled={step === 'saving'}
          className="absolute top-2 right-2 w-11 h-11 rounded-full bg-background/80 backdrop-blur flex items-center justify-center disabled:opacity-50"
        >
          <X className="w-4 h-4 text-foreground" />
        </button>
      </div>
    ) : null;

    return (
      <ContactConfirmCard
        value={parsed}
        onChange={setParsed}
        onSave={handleSave}
        onCancel={handleReset}
        saving={step === 'saving'}
        cancelLabel="Retake"
        errorMsg={errorMsg || undefined}
        note={note || undefined}
        preview={preview}
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Single file input - iOS surfaces its own action sheet
          (Take Photo / Photo Library / Choose Files); Android opens the
          gallery with a camera shortcut. Matches Apple Notes "Scan" feel. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {step === 'parsing' && previewUrl ? (
        <div className="relative rounded-xl overflow-hidden border border-border/60">
          <img src={previewUrl} alt="Reading…" className="w-full max-h-48 object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/85 to-background/0 backdrop-blur-sm px-3 py-2 flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
            <p className="text-xs text-foreground">Reading the image…</p>
          </div>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="modetile"
          style={{ width: '100%', minHeight: 0, alignItems: 'center', textAlign: 'center', padding: '28px 16px', gap: 12 }}
        >
          <div className="modeicon" style={{ width: 52, height: 52, borderRadius: 14 }}>
            <ImagePlus size={26} strokeWidth={1.8} />
          </div>
          <div className="modetitle" style={{ fontSize: 15 }}>Add a photo</div>
          <div className="modehint">Camera or photo library</div>
        </button>
      )}

      {step === 'error' && errorMsg && (
        <div className="cerr" style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <AlertCircle size={14} style={{ marginTop: 1, flex: '0 0 auto' }} />
          <span>{errorMsg}</span>
        </div>
      )}

      <p className="ssrc" style={{ textAlign: 'center' }}>
        LinkedIn screenshot, business card, name tag, calendar invite - whatever you have.
      </p>
    </div>
  );
};

import { useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, Check, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ingestQuickAdd, type IngestResult, type QuickAddInput } from '@/lib/circleIngest';

type Step = 'idle' | 'parsing' | 'review' | 'saving' | 'done' | 'error';

interface QuickAddImageProps {
  onDone?: (result: IngestResult) => void;
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

export const QuickAddImage = ({ onDone }: QuickAddImageProps) => {
  const { user } = useAuth();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [parsed, setParsed] = useState<QuickAddInput | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return;
    setErrorMsg('');
    setPreviewUrl(URL.createObjectURL(file));
    setStep('parsing');
    try {
      const base64 = await fileToBase64(file);
      const res = await supabase.functions.invoke('parse-contact-image', {
        body: { image: base64 },
      });
      if (res.error) throw new Error(res.error.message || 'Image parse failed');
      const data = res.data as { parsed?: Record<string, string | null> } | null;
      const p = data?.parsed ?? {};
      const name = (p.name ?? '').trim();
      if (!name) {
        throw new Error("Couldn't find a name in that image. Try a clearer shot.");
      }
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
      setStep('review');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Could not read the image');
      setStep('error');
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
      setStep('done');
      onDone?.(result);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Could not save');
      setStep('error');
    }
  };

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setParsed(null);
    setErrorMsg('');
    setStep('idle');
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (libraryInputRef.current) libraryInputRef.current.value = '';
  };

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <Check className="w-6 h-6 text-success" />
        <p className="text-sm text-foreground">Added from photo.</p>
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
      <div className="space-y-3">
        {previewUrl && (
          <div className="relative rounded-xl overflow-hidden border border-border/60">
            <img src={previewUrl} alt="Captured" className="w-full max-h-48 object-cover" />
            <button
              onClick={handleReset}
              aria-label="Remove image"
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5 text-foreground" />
            </button>
          </div>
        )}
        <div className="rounded-xl border border-border/60 bg-card/50 backdrop-blur p-3">
          <p className="text-sm font-semibold text-foreground">{parsed.name}</p>
          {(parsed.title || parsed.company) && (
            <p className="text-xs text-foreground-secondary mt-0.5">
              {[parsed.title, parsed.company].filter(Boolean).join(' · ')}
            </p>
          )}
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-foreground-muted">
            {parsed.email && <span>{parsed.email}</span>}
            {parsed.phone && <span>{parsed.phone}</span>}
            {parsed.linkedin_url && <span>LinkedIn</span>}
            {parsed.instagram_handle && <span>@{parsed.instagram_handle}</span>}
            {parsed.city && <span>{parsed.city}</span>}
          </div>
        </div>
        {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
        <button
          onClick={handleSave}
          disabled={step === 'saving'}
          className={cn(
            'w-full h-11 rounded-full bg-primary text-primary-foreground text-sm font-medium',
            'flex items-center justify-center gap-2 shadow-lg shadow-primary/30',
            'disabled:opacity-70'
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
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {step === 'parsing' && previewUrl ? (
        <div className="relative rounded-xl overflow-hidden border border-border/60">
          <img src={previewUrl} alt="Reading…" className="w-full max-h-48 object-cover opacity-70" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="text-xs text-foreground">Reading the image…</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className={cn(
              'h-24 rounded-xl border border-border/60 bg-card/50 backdrop-blur',
              'flex flex-col items-center justify-center gap-1.5',
              'hover:border-primary/60 transition-colors'
            )}
          >
            <Camera className="w-5 h-5 text-primary" />
            <span className="text-xs font-medium text-foreground">Take photo</span>
          </button>
          <button
            onClick={() => libraryInputRef.current?.click()}
            className={cn(
              'h-24 rounded-xl border border-border/60 bg-card/50 backdrop-blur',
              'flex flex-col items-center justify-center gap-1.5',
              'hover:border-primary/60 transition-colors'
            )}
          >
            <ImagePlus className="w-5 h-5 text-primary" />
            <span className="text-xs font-medium text-foreground">Upload screenshot</span>
          </button>
        </div>
      )}

      {step === 'error' && errorMsg && (
        <div className="flex items-start gap-2 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <p className="text-[11px] text-foreground-muted text-center">
        LinkedIn screenshot, business card, name tag, calendar invite — whatever you have.
      </p>
    </div>
  );
};

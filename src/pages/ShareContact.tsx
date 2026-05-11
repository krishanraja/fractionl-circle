import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Check, AlertTriangle, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { readSharedScreenshot } from '@/utils/registerServiceWorker';
import { toast } from 'sonner';
import { haptics } from '@/utils/haptics';
import { ingestSharedContact } from '@/lib/circleIngest';

interface ParsedScreenshot {
  platform?: string;
  name?: string;
  headline?: string;
  company?: string;
  title?: string;
  location?: string;
  handle?: string;
  profile_url?: string;
  email?: string;
  phone?: string;
}

type ScreenState = 'loading' | 'parsing' | 'confirm' | 'error' | 'success';

/**
 * Entry point for screenshots shared into Circle via:
 *   - Android Web Share Target (POST /share-contact — intercepted by sw.js)
 *   - iOS Apple Shortcut (POSTs image to parse-screenshot, then opens
 *     /share-contact?parse_id=...)
 *
 * See docs/screenshot-to-contact.md for the setup flow.
 */
export default function ShareContact() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState<ScreenState>('loading');
  const [parsed, setParsed] = useState<ParsedScreenshot>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('error')) {
        setErrorMsg('The share didn\'t come through. Try again?');
        setState('error');
        return;
      }

      // 1. iOS Shortcut path — parsed JSON passed inline via ?prefill=<urlencoded-JSON>.
      //    The Shortcut does the vision parse on-device (via parse-screenshot) and
      //    hands the result straight into the confirm card. No DB round-trip needed.
      const prefillParam = params.get('prefill');
      if (prefillParam) {
        try {
          const decoded = JSON.parse(decodeURIComponent(prefillParam)) as ParsedScreenshot;
          setParsed(decoded || {});
          setState('confirm');
          return;
        } catch (_err) {
          setErrorMsg('Could not read the shared contact data.');
          setState('error');
          return;
        }
      }

      // 2. Android / PWA share target path — read from service worker cache.
      const { blob, meta } = await readSharedScreenshot();

      // 3. Legacy iOS path — parse_id points at a pre-parsed result in the DB.
      //    Kept for backward compatibility; new Shortcuts use prefill above.
      const parseId = params.get('parse_id');
      if (parseId) {
        await loadPreParsed(parseId);
        return;
      }

      // 3. Text-only share (no file, just a LinkedIn URL)
      if (!blob && meta?.url) {
        setState('parsing');
        await parseFromUrl(meta.url);
        return;
      }

      if (!blob) {
        setErrorMsg('Nothing was shared. Try picking a screenshot again.');
        setState('error');
        return;
      }

      setPreview(URL.createObjectURL(blob));
      setState('parsing');
      await parseFromImage(blob);
    })();
  }, []);

  const parseFromImage = async (blob: Blob) => {
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onloadend = () => resolve((r.result as string).split(',')[1]);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });

      const { data, error } = await supabase.functions.invoke('parse-screenshot', {
        body: { image: base64, mime: blob.type },
      });
      if (error) throw error;

      setParsed(data?.parsed || {});
      setState('confirm');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not parse the screenshot.');
      setState('error');
    }
  };

  const parseFromUrl = async (url: string) => {
    // Extract slug and enrich via the existing LinkedIn search.
    const slugMatch = url.match(/linkedin\.com\/in\/([^/?]+)/);
    const name = slugMatch
      ? slugMatch[1].replace(/-/g, ' ').replace(/\d+/g, '').trim()
      : url;
    try {
      const { data } = await supabase.functions.invoke('contact-enrich', {
        body: { name, linkedin_search: true },
      });
      const match = data?.results?.[0];
      if (match) {
        setParsed({
          platform: 'linkedin',
          name: match.name,
          company: match.company,
          title: match.title,
          headline: match.headline,
          profile_url: match.url || url,
        });
      } else {
        setParsed({
          platform: 'linkedin',
          name: name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          profile_url: url,
        });
      }
      setState('confirm');
    } catch {
      setParsed({ platform: 'linkedin', profile_url: url });
      setState('confirm');
    }
  };

  const loadPreParsed = async (parseId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('parse-screenshot', {
        body: { parse_id: parseId },
      });
      if (error) throw error;
      setParsed(data?.parsed || {});
      setState('confirm');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not load the parsed contact.');
      setState('error');
    }
  };

  const updateField = (field: keyof ParsedScreenshot, value: string) => {
    setParsed(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!parsed.name?.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!user) {
      toast.error('Sign in first');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await ingestSharedContact(user.id, {
        name: parsed.name.trim(),
        email: parsed.email?.trim() || null,
        phone: parsed.phone?.trim() || null,
        linkedin_url: parsed.profile_url?.includes('linkedin.com') ? parsed.profile_url : null,
        company: parsed.company?.trim() || null,
        title: parsed.title?.trim() || null,
        location: parsed.location?.trim() || null,
        headline: parsed.headline?.trim() || null,
        profile_url: parsed.profile_url?.trim() || null,
        platform: parsed.platform ?? null,
      });
      haptics.success();
      if (result.result.circleMerged > 0) {
        toast.success(`Merged into ${parsed.name}'s existing Circle entry.`);
      } else {
        toast.success(`${parsed.name} added to your Circle`);
      }
      setState('success');
      setTimeout(() => navigate('/'), 800);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save.');
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-start pt-safe-top">
      <div className="w-full max-w-md px-5 py-6">
        <div className="flex items-center gap-2 mb-6">
          <Linkedin className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">Add from screenshot</h1>
        </div>

        {state === 'loading' && <CenterLoader label="Reading your screenshot..." />}
        {state === 'parsing' && (
          <div className="space-y-4">
            {preview && (
              <img src={preview} alt="" className="w-full max-h-56 object-contain rounded-xl border border-border" />
            )}
            <CenterLoader label="Extracting contact details..." />
          </div>
        )}

        {state === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 py-8"
          >
            <div className="w-14 h-14 rounded-full bg-destructive/15 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <p className="text-center text-sm text-foreground">{errorMsg}</p>
            <Button onClick={() => navigate('/')} variant="outline">Back to Circle</Button>
          </motion.div>
        )}

        {state === 'confirm' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {preview && (
              <img src={preview} alt="" className="w-full max-h-48 object-contain rounded-xl border border-border" />
            )}
            <Field label="Name" value={parsed.name || ''} onChange={v => updateField('name', v)} autoFocus />
            <Field label="Title" value={parsed.title || ''} onChange={v => updateField('title', v)} />
            <Field label="Company" value={parsed.company || ''} onChange={v => updateField('company', v)} />
            <Field label="Email" value={parsed.email || ''} onChange={v => updateField('email', v)} type="email" />
            <Field label="Phone" value={parsed.phone || ''} onChange={v => updateField('phone', v)} type="tel" />
            <Field label="Location" value={parsed.location || ''} onChange={v => updateField('location', v)} />
            <Field label="Profile URL" value={parsed.profile_url || ''} onChange={v => updateField('profile_url', v)} />

            <div className="flex gap-3 pt-3">
              <Button variant="outline" onClick={() => navigate('/')} disabled={isSubmitting} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSubmitting || !parsed.name?.trim()} className="flex-1">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" /> Save</>}
              </Button>
            </div>
          </motion.div>
        )}

        {state === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 py-12"
          >
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
              <Check className="w-8 h-8 text-success" />
            </div>
            <p className="text-lg font-semibold text-foreground">Added to your Circle</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function CenterLoader({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="text-sm text-foreground-secondary">{label}</p>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', autoFocus }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="text-[11px] font-medium text-foreground-secondary uppercase tracking-wider mb-1 block">
        {label}
      </label>
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        type={type}
        autoFocus={autoFocus}
        className="bg-input border-border text-foreground text-base h-11"
      />
    </div>
  );
}

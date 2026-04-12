import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Image, Loader2, Check, Edit3, Sparkles } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useContactIntake } from '@/hooks/useContactIntake';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { haptics } from '@/utils/haptics';
import { normalizePhoneToE164 } from '@/utils/contactActions';
import { fadeInUp } from '@/constants/animation';

interface ParsedContact {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  city?: string;
  specialty_summary?: string;
  linkedin_url?: string;
  website?: string;
  platform?: string;
  photo_url?: string;
}

type ImportState = 'choose' | 'processing' | 'enriching' | 'confirming' | 'success';

interface PhotoImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Merge enrichment data into parsed contact, filling gaps without overwriting OCR data.
 */
function mergeEnrichment(parsed: ParsedContact, enriched: Record<string, any>): ParsedContact {
  const merged = { ...parsed };
  if (!merged.company && enriched.company) merged.company = enriched.company;
  if (!merged.title && enriched.title) merged.title = enriched.title;
  if (!merged.city && enriched.city) merged.city = enriched.city;
  if (!merged.email && enriched.email) merged.email = enriched.email;
  if (!merged.phone && enriched.phone) merged.phone = enriched.phone;
  if (!merged.linkedin_url && enriched.linkedin_url) merged.linkedin_url = enriched.linkedin_url;
  if (!merged.photo_url && enriched.photo_url) merged.photo_url = enriched.photo_url;
  if (!merged.specialty_summary && enriched.specialty_summary) merged.specialty_summary = enriched.specialty_summary;
  return merged;
}

export const PhotoImportSheet = ({ open, onOpenChange }: PhotoImportSheetProps) => {
  const { intake } = useContactIntake();
  const [state, setState] = useState<ImportState>('choose');
  const [preview, setPreview] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedContact>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enrichmentCount, setEnrichmentCount] = useState(0);
  const [enrichmentFailed, setEnrichmentFailed] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    haptics.light();
    setState('processing');

    // Show preview
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);

    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Send to OCR edge function
      const { data, error } = await supabase.functions.invoke('parse-contact-image', {
        body: { image: base64 },
      });

      if (error) throw error;

      const parsedContact: ParsedContact = data?.parsed || {};

      // Auto-enrich if we have a name
      if (parsedContact.name?.trim()) {
        setState('enriching');
        setEnrichmentCount(0);
        const enriched = await autoEnrich(parsedContact);
        setParsed(enriched);
      } else {
        setParsed(parsedContact);
      }

      setState('confirming');
      haptics.success();
    } catch (err) {
      console.error('Photo import error:', err);
      toast.error('Could not extract contact info. Try a clearer image.');
      handleReset();
    }

    // Reset file input
    e.target.value = '';
  };

  /**
   * Chain enrichment: name search → pick best match → email enrichment.
   * Fills gaps in the OCR-parsed contact with data from Apollo/Clearbit.
   */
  const autoEnrich = async (contact: ParsedContact): Promise<ParsedContact> => {
    let enriched = { ...contact };
    let anyEnrichmentSucceeded = false;

    try {
      // Step 1: LinkedIn search by name via Apollo
      setEnrichmentCount(1);
      const { data: searchData } = await supabase.functions.invoke('contact-enrich', {
        body: { name: contact.name, linkedin_search: true },
      });

      if (searchData?.results?.length > 0) {
        const best = pickBestMatch(searchData.results, contact);
        if (best) {
          enriched = mergeEnrichment(enriched, best);
          anyEnrichmentSucceeded = true;
        }
      }

      // Step 2: If we now have an email, do deeper enrichment
      if (enriched.email) {
        setEnrichmentCount(2);
        const { data: emailData } = await supabase.functions.invoke('contact-enrich', {
          body: { email: enriched.email },
        });

        if (emailData?.enriched) {
          enriched = mergeEnrichment(enriched, emailData.enriched);
          anyEnrichmentSucceeded = true;
        }
      }
    } catch (err) {
      // Enrichment is best-effort — don't fail the import
      console.warn('Auto-enrichment failed:', err);
    }

    // Flag for the warning system if we tried but got nothing useful back.
    setEnrichmentFailed(!anyEnrichmentSucceeded);
    return enriched;
  };

  /**
   * Pick the best matching LinkedIn result based on OCR-extracted context.
   */
  const pickBestMatch = (
    results: Array<{ name: string; company?: string; title?: string; url: string; photo_url?: string; city?: string; headline?: string }>,
    ocrContact: ParsedContact
  ) => {
    if (results.length === 0) return null;
    if (results.length === 1) return results[0];

    // Score each result by how well it matches OCR data
    let bestScore = -1;
    let bestResult = results[0];

    for (const r of results) {
      let score = 0;
      if (ocrContact.company && r.company?.toLowerCase().includes(ocrContact.company.toLowerCase())) score += 3;
      if (ocrContact.title && r.title?.toLowerCase().includes(ocrContact.title.toLowerCase())) score += 2;
      if (ocrContact.city && r.city?.toLowerCase().includes(ocrContact.city.toLowerCase())) score += 1;
      if (score > bestScore) {
        bestScore = score;
        bestResult = r;
      }
    }

    return bestResult;
  };

  const updateField = (field: keyof ParsedContact, value: string) => {
    setParsed(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!parsed.name?.trim()) {
      toast.error('Name is required');
      return;
    }
    setIsSubmitting(true);
    try {
      const platformLabel = parsed.platform && parsed.platform !== 'unknown'
        ? parsed.platform.charAt(0).toUpperCase() + parsed.platform.slice(1)
        : undefined;

      const result = await intake(
        {
          name: parsed.name.trim(),
          email: parsed.email?.trim() || null,
          phone: parsed.phone?.trim() ? (normalizePhoneToE164(parsed.phone.trim()) || parsed.phone.trim()) : null,
          company: parsed.company?.trim() || null,
          specialty_summary: parsed.specialty_summary?.trim() || [parsed.title, parsed.company].filter(Boolean).join(' at ') || null,
          linkedin_url: parsed.linkedin_url?.trim() || null,
          portfolio_url: parsed.website?.trim() || null,
          photo_url: parsed.photo_url?.trim() || null,
          city: parsed.city?.trim() || null,
          title: parsed.title?.trim() || null,
          source: 'photo' as any,
          met_at: platformLabel || null,
        },
        {
          onDuplicate: 'auto_merge',
          enrichmentStatus: enrichmentFailed ? 'failed' : 'succeeded',
          enrichmentFailureReason: enrichmentFailed
            ? 'Profile enrichment returned no results'
            : undefined,
        }
      );

      setState('success');
      haptics.success();
      if (result.status === 'merged') {
        toast.success(`Merged into ${result.contact.name}`);
      } else if (result.status === 'duplicates') {
        toast(`${parsed.name} saved. Possible duplicate: ${result.matches[0].contact.name}`);
      } else {
        toast.success(`${parsed.name} added to your Circle`);
      }
      setTimeout(() => {
        handleReset();
        onOpenChange(false);
      }, 800);
    } catch {
      // Error handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setState('choose');
    setPreview(null);
    setParsed({});
    setEnrichmentCount(0);
    setEnrichmentFailed(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) handleReset();
    onOpenChange(isOpen);
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="bg-background border-border max-h-[90dvh]">
        <div className="overflow-y-auto pb-safe-bottom">
          {/* Hidden file inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <AnimatePresence mode="wait">
            {/* Choose method */}
            {state === 'choose' && (
              <motion.div key="choose" {...fadeInUp} className="px-6 py-6">
                <DrawerHeader className="pb-4 pt-0 px-0">
                  <DrawerTitle className="text-xl">Scan a Card or Screenshot</DrawerTitle>
                  <p className="text-sm text-foreground-secondary mt-1">
                    Take a photo of a business card, or choose a screenshot from your gallery
                  </p>
                </DrawerHeader>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-secondary/50 border border-border active:bg-secondary transition-colors"
                  >
                    <div className="w-14 h-14 rounded-full bg-amber-500/15 flex items-center justify-center">
                      <Camera className="w-7 h-7 text-amber-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">Take Photo</p>
                      <p className="text-[11px] text-foreground-secondary mt-0.5">Business card</p>
                    </div>
                  </button>

                  <button
                    onClick={() => galleryInputRef.current?.click()}
                    className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-secondary/50 border border-border active:bg-secondary transition-colors"
                  >
                    <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
                      <Image className="w-7 h-7 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">Gallery</p>
                      <p className="text-[11px] text-foreground-secondary mt-0.5">Screenshot or photo</p>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Processing (OCR) */}
            {state === 'processing' && (
              <motion.div key="processing" {...fadeInUp} className="flex flex-col items-center gap-5 px-6 py-10">
                {preview && (
                  <img src={preview} alt="" className="w-32 h-32 object-cover rounded-xl border border-border" />
                )}
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <div className="text-center">
                  <p className="text-lg font-semibold text-foreground">Extracting info...</p>
                  <p className="text-sm text-foreground-secondary">Reading text from image</p>
                </div>
              </motion.div>
            )}

            {/* Enriching (auto-enrichment after OCR) */}
            {state === 'enriching' && (
              <motion.div key="enriching" {...fadeInUp} className="flex flex-col items-center gap-5 px-6 py-10">
                {preview && (
                  <img src={preview} alt="" className="w-32 h-32 object-cover rounded-xl border border-border" />
                )}
                <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                <div className="text-center">
                  <p className="text-lg font-semibold text-foreground">Enriching contact...</p>
                  <p className="text-sm text-foreground-secondary">
                    {enrichmentCount === 0 && 'Preparing to enrich...'}
                    {enrichmentCount === 1 && 'Searching for profile details...'}
                    {enrichmentCount === 2 && 'Finding additional info...'}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Confirming */}
            {state === 'confirming' && (
              <motion.div key="confirming" {...fadeInUp} className="px-4 py-4">
                <DrawerHeader className="pb-2 pt-0">
                  <DrawerTitle className="text-lg flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-primary" />
                    Confirm Details
                  </DrawerTitle>
                </DrawerHeader>

                {preview && (
                  <div className="px-2 mb-3">
                    <img src={preview} alt="" className="w-full max-h-32 object-contain rounded-lg border border-border" />
                  </div>
                )}

                <div className="space-y-3 px-2">
                  <FieldInput label="Name" value={parsed.name || ''} onChange={v => updateField('name', v)} autoFocus />
                  <FieldInput label="Title / Role" value={parsed.title || ''} onChange={v => updateField('title', v)} />
                  <FieldInput label="Company" value={parsed.company || ''} onChange={v => updateField('company', v)} />
                  <FieldInput label="Email" value={parsed.email || ''} onChange={v => updateField('email', v)} type="email" />
                  <FieldInput label="Phone" value={parsed.phone || ''} onChange={v => updateField('phone', v)} type="tel" />
                  <FieldInput label="City" value={parsed.city || ''} onChange={v => updateField('city', v)} />
                  <FieldInput label="LinkedIn" value={parsed.linkedin_url || ''} onChange={v => updateField('linkedin_url', v)} />
                  <FieldInput label="Website" value={parsed.website || ''} onChange={v => updateField('website', v)} />
                </div>

                <div className="flex gap-3 mt-5 px-2 pb-4">
                  <Button variant="outline" onClick={handleReset} className="flex-1" disabled={isSubmitting}>
                    Try Again
                  </Button>
                  <Button onClick={handleSave} className="flex-1" disabled={isSubmitting || !parsed.name?.trim()}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>
                      <Check className="w-4 h-4 mr-1" /> Save
                    </>}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Success */}
            {state === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-12 px-6"
              >
                <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-4">
                  <Check className="w-8 h-8 text-success" />
                </div>
                <p className="text-lg font-semibold text-foreground">Added to your Circle</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

function FieldInput({ label, value, onChange, type = 'text', autoFocus }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoFocus?: boolean;
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
        className="bg-input border-border text-foreground text-sm h-10"
      />
    </div>
  );
}

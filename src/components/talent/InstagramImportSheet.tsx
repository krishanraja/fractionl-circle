import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Instagram, Camera, Check, Loader2, Sparkles } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTalentContacts } from '@/hooks/useTalentContacts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { haptics } from '@/utils/haptics';
import { fadeInUp } from '@/constants/animation';

type ImportState = 'input' | 'processing' | 'success';

interface EnrichmentResult {
  name?: string;
  company?: string;
  title?: string;
  linkedin_url?: string;
  photo_url?: string;
  city?: string;
  specialty_summary?: string;
}

interface LinkedInResult {
  name: string;
  headline: string;
  url: string;
  photo_url?: string;
  company?: string;
  title?: string;
  city?: string;
}

interface InstagramImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanScreenshot: () => void;
}

/**
 * Convert an Instagram handle to a likely real name by splitting on
 * dots, underscores, and stripping trailing digits.
 * e.g. "priya.sharma" → "Priya Sharma", "john_doe_99" → "John Doe"
 */
function handleToName(handle: string): string {
  // Remove trailing digits (common pattern: "krishanraja1")
  let cleaned = handle.replace(/\d+$/, '');
  // Split on dots, underscores, hyphens
  const parts = cleaned.split(/[._-]+/).filter(Boolean);
  if (parts.length === 0) return '';
  // Title-case each part
  return parts
    .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ');
}

export const InstagramImportSheet = ({ open, onOpenChange, onScanScreenshot }: InstagramImportSheetProps) => {
  const { createContact } = useTalentContacts();
  const [state, setState] = useState<ImportState>('input');
  const [handle, setHandle] = useState('');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichedData, setEnrichedData] = useState<EnrichmentResult | null>(null);
  const [wasAutoFilled, setWasAutoFilled] = useState(false);

  const cleanHandle = (input: string): string => {
    let h = input.trim();
    // Strip @ prefix
    if (h.startsWith('@')) h = h.slice(1);
    // Extract from URL
    const urlMatch = h.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
    if (urlMatch) h = urlMatch[1];
    return h;
  };

  const enrichFromHandle = useCallback(async (cleaned: string) => {
    if (!cleaned || cleaned.length < 2) return;

    const guessedName = handleToName(cleaned);
    if (!guessedName || guessedName.length < 2) return;

    // Auto-fill name field with our guess if empty
    setName(prev => prev || guessedName);
    setIsEnriching(true);

    try {
      const { data, error } = await supabase.functions.invoke('contact-enrich', {
        body: { name: guessedName, linkedin_search: true },
      });

      if (error) throw error;

      const results = data?.results as LinkedInResult[] | null;
      if (results && results.length > 0) {
        const best = results[0];
        const enriched: EnrichmentResult = {
          name: best.name,
          company: best.company,
          title: best.title,
          linkedin_url: best.url,
          photo_url: best.photo_url,
          city: best.city,
          specialty_summary: best.headline || (best.title && best.company
            ? `${best.title} at ${best.company}${best.city ? `, ${best.city}` : ''}`
            : undefined),
        };
        setEnrichedData(enriched);
        setWasAutoFilled(true);

        // Auto-fill name with the real matched name
        if (enriched.name) {
          setName(enriched.name);
        }
        // Auto-fill notes with specialty if empty
        if (enriched.specialty_summary) {
          setNotes(prev => prev || enriched.specialty_summary || '');
        }
      }
    } catch {
      // Enrichment is best-effort
    } finally {
      setIsEnriching(false);
    }
  }, []);

  const handleHandleBlur = () => {
    const cleaned = cleanHandle(handle);
    if (cleaned) {
      enrichFromHandle(cleaned);
    }
  };

  const handleSave = async () => {
    const cleaned = cleanHandle(handle);
    if (!cleaned && !name.trim()) {
      toast.error('Enter a handle or name');
      return;
    }

    setIsSubmitting(true);
    try {
      const contactName = name.trim() || `@${cleaned}`;
      await createContact({
        name: contactName,
        specialty_summary: notes.trim() || enrichedData?.specialty_summary || null,
        // Store Instagram URL in portfolio_url (no dedicated instagram field in DB)
        portfolio_url: cleaned ? `https://instagram.com/${cleaned}` : null,
        linkedin_url: enrichedData?.linkedin_url || null,
        photo_url: enrichedData?.photo_url || null,
      }, []);

      setState('success');
      haptics.success();
      toast.success(`${contactName} added to your Black Book`);
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

  const handleScanInstead = () => {
    onOpenChange(false);
    setTimeout(() => onScanScreenshot(), 200);
  };

  const handleReset = () => {
    setState('input');
    setHandle('');
    setName('');
    setNotes('');
    setEnrichedData(null);
    setWasAutoFilled(false);
    setIsEnriching(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) handleReset();
    onOpenChange(isOpen);
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="bg-background border-border">
        <AnimatePresence mode="wait">
          {state === 'input' && (
            <motion.div key="input" {...fadeInUp}>
              <DrawerHeader className="pb-2 pt-3">
                <DrawerTitle className="text-xl flex items-center gap-2">
                  <Instagram className="w-5 h-5 text-[#E1306C]" />
                  Add from Instagram
                </DrawerTitle>
                <p className="text-sm text-foreground-secondary mt-1">
                  Enter their handle or paste their profile URL
                </p>
              </DrawerHeader>

              <div className="space-y-4 px-4 pb-2">
                <div>
                  <label className="text-[11px] font-medium text-foreground-secondary uppercase tracking-wider mb-1 block">
                    Instagram Handle
                  </label>
                  <Input
                    value={handle}
                    onChange={e => setHandle(e.target.value)}
                    onBlur={handleHandleBlur}
                    placeholder="@username or instagram.com/username"
                    className="bg-input border-border text-foreground text-base"
                    autoFocus
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-medium text-foreground-secondary uppercase tracking-wider">
                      Their Name
                    </label>
                    {isEnriching && (
                      <span className="flex items-center gap-1 text-[10px] text-primary">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Looking up...
                      </span>
                    )}
                    {wasAutoFilled && !isEnriching && (
                      <span className="flex items-center gap-1 text-[10px] text-primary">
                        <Sparkles className="w-3 h-3" />
                        Auto-filled
                      </span>
                    )}
                  </div>
                  <Input
                    value={name}
                    onChange={e => { setName(e.target.value); setWasAutoFilled(false); }}
                    placeholder="Full name"
                    className="bg-input border-border text-foreground text-base"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-medium text-foreground-secondary uppercase tracking-wider">
                      Notes (optional)
                    </label>
                    {wasAutoFilled && enrichedData?.specialty_summary && !isEnriching && (
                      <span className="flex items-center gap-1 text-[10px] text-primary">
                        <Sparkles className="w-3 h-3" />
                        Auto-filled
                      </span>
                    )}
                  </div>
                  <Input
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="What they do, how you met, etc."
                    className="bg-input border-border text-foreground text-base"
                  />
                </div>
              </div>

              <DrawerFooter className="pt-3 pb-6 safe-bottom">
                <Button
                  onClick={handleSave}
                  disabled={(!handle.trim() && !name.trim()) || isSubmitting}
                  size="xl"
                  className="w-full gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Contact'}
                </Button>

                <div className="relative flex items-center my-2">
                  <div className="flex-1 border-t border-border/50" />
                  <span className="px-3 text-[11px] text-foreground-muted uppercase">or faster</span>
                  <div className="flex-1 border-t border-border/50" />
                </div>

                <button
                  onClick={handleScanInstead}
                  className="flex items-center gap-3 w-full p-3 rounded-xl bg-primary/8 border border-primary/20 active:bg-primary/15 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <Camera className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">Scan their profile screenshot</p>
                    <p className="text-[11px] text-foreground-secondary">AI extracts name, bio & details automatically</p>
                  </div>
                </button>
              </DrawerFooter>
            </motion.div>
          )}

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
              <p className="text-lg font-semibold text-foreground">Added to your circle</p>
            </motion.div>
          )}
        </AnimatePresence>
      </DrawerContent>
    </Drawer>
  );
};

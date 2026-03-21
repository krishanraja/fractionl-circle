import { useState, useRef, useCallback, useEffect } from 'react';
import { Loader2, ArrowRight, Sparkles, Check, Phone, Mail } from 'lucide-react';
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
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { isValidEmail } from '@/utils/contactActions';

interface EnrichmentResult {
  name?: string;
  company?: string;
  title?: string;
  linkedin_url?: string;
  photo_url?: string;
  city?: string;
  specialty_summary?: string;
}

interface QuickAddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenFullForm: () => void;
}

export const QuickAddSheet = ({ open, onOpenChange, onOpenFullForm }: QuickAddSheetProps) => {
  const { createContact } = useTalentContacts();
  const { isKeyboardVisible } = useKeyboardVisible();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', specialty: '' });

  // Enrichment state
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichedData, setEnrichedData] = useState<EnrichmentResult | null>(null);
  const [enrichedEmail, setEnrichedEmail] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll focused input into view when keyboard opens
  useEffect(() => {
    if (isKeyboardVisible && contentRef.current) {
      const activeEl = document.activeElement as HTMLElement;
      if (activeEl && contentRef.current.contains(activeEl)) {
        setTimeout(() => {
          activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }, [isKeyboardVisible]);

  const enrichFromEmail = useCallback(async (email: string) => {
    if (!isValidEmail(email) || email === enrichedEmail) return;

    setIsEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke('contact-enrich', {
        body: { email: email.trim() },
      });

      if (error) throw error;

      const enriched = data?.enriched as EnrichmentResult | null;
      if (enriched) {
        setEnrichedData(enriched);
        setEnrichedEmail(email);

        // Auto-fill empty fields
        setForm(f => ({
          ...f,
          name: f.name || enriched.name || f.name,
          specialty: f.specialty || enriched.specialty_summary || f.specialty,
        }));

        toast.success('Contact details found', { duration: 2000 });
      }
    } catch {
      // Enrichment is best-effort — silent fail
    } finally {
      setIsEnriching(false);
    }
  }, [enrichedEmail]);

  const handleEmailBlur = () => {
    const email = form.email.trim();
    if (email && isValidEmail(email)) {
      enrichFromEmail(email);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() && !form.phone.trim() && !form.email.trim()) return;
    setIsSubmitting(true);
    try {
      await createContact({
        name: form.name.trim() || enrichedData?.name || form.email.trim() || form.phone.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        specialty_summary: form.specialty.trim() || null,
        linkedin_url: enrichedData?.linkedin_url || null,
        photo_url: enrichedData?.photo_url || null,
        company: enrichedData?.company || null,
        title: enrichedData?.title || null,
        city: enrichedData?.city || null,
      }, []);
      setShowSuccess(true);
      const displayName = form.name.trim() || enrichedData?.name || 'Contact';
      toast.success(`${displayName} added to your Black Book`);
      setTimeout(() => {
        setForm({ name: '', phone: '', email: '', specialty: '' });
        setEnrichedData(null);
        setEnrichedEmail('');
        setShowSuccess(false);
        onOpenChange(false);
      }, 800);
    } catch {
      // Error toast is handled by the hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setEnrichedData(null);
      setEnrichedEmail('');
    }
    onOpenChange(isOpen);
  };

  const hasMinimumInfo = form.name.trim() || form.phone.trim() || form.email.trim();

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="bg-background border-border max-h-[85dvh]">
        <AnimatePresence mode="wait">
          {showSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 px-6"
            >
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-success" />
              </div>
              <p className="text-lg font-semibold text-foreground">Added to your circle</p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              ref={contentRef}
              className="overflow-y-auto overscroll-contain"
            >
              <DrawerHeader className="pb-1 pt-2">
                <DrawerTitle className="text-foreground text-xl">Quick Add</DrawerTitle>
                <p className="text-caption text-foreground-secondary">Add a contact in seconds.</p>
              </DrawerHeader>

              <div className="space-y-4 px-4 pb-2">
                {/* Name */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                >
                  <Input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Name"
                    className="bg-input border-border text-foreground text-base"
                    autoFocus
                  />
                </motion.div>

                {/* Phone */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                    <Input
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="Phone number"
                      type="tel"
                      className="pl-11 bg-input border-border text-foreground text-base"
                    />
                  </div>
                </motion.div>

                {/* Email */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                    <Input
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      onBlur={handleEmailBlur}
                      placeholder="Email address"
                      type="email"
                      className="pl-11 pr-10 bg-input border-border text-foreground text-base"
                    />
                    {isEnriching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
                    )}
                  </div>
                  {enrichedData && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="flex items-center gap-1.5 mt-1.5 ml-1"
                    >
                      <Sparkles className="w-3 h-3 text-primary" />
                      <span className="text-[11px] text-foreground-secondary">
                        Auto-filled from email
                        {enrichedData.company && ` — ${enrichedData.company}`}
                      </span>
                    </motion.div>
                  )}
                </motion.div>

                {/* What they do */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Input
                    value={form.specialty}
                    onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                    placeholder="What they do — role, rate, location"
                    className="bg-input border-border text-foreground text-base"
                  />
                </motion.div>
              </div>

              <DrawerFooter className="pt-2 pb-6 safe-bottom">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="w-full"
                >
                  <Button
                    onClick={handleSave}
                    disabled={!hasMinimumInfo || isSubmitting}
                    size="xl"
                    className="w-full gap-2 shadow-glow"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>Save <ArrowRight className="w-5 h-5" /></>
                    )}
                  </Button>
                </motion.div>
                <button
                  onClick={onOpenFullForm}
                  className="text-foreground-secondary text-caption text-center py-2 active:text-foreground transition-colors"
                >
                  Need more detail? Open full form
                </button>
              </DrawerFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DrawerContent>
    </Drawer>
  );
};

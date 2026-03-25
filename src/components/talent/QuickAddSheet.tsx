import { useState, useRef, useCallback, useEffect } from 'react';
import { Loader2, ArrowRight, Sparkles, Check, Phone, Mail, Linkedin, Search, X, ExternalLink } from 'lucide-react';
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
import { isValidEmail, isValidPhone, normalizePhoneToE164 } from '@/utils/contactActions';

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
  const [enrichedPhone, setEnrichedPhone] = useState('');

  // LinkedIn search state
  const [showLinkedinSearch, setShowLinkedinSearch] = useState(false);
  const [linkedinResults, setLinkedinResults] = useState<LinkedInResult[]>([]);
  const [isSearchingLinkedin, setIsSearchingLinkedin] = useState(false);
  const [selectedLinkedin, setSelectedLinkedin] = useState<LinkedInResult | null>(null);

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

  // ── Email enrichment ──────────────────────────────────────────────

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
        setEnrichedData(prev => ({ ...prev, ...enriched }));
        setEnrichedEmail(email);

        // Auto-fill empty fields
        setForm(f => ({
          ...f,
          name: f.name || enriched.name || f.name,
          specialty: f.specialty || enriched.specialty_summary || f.specialty,
        }));

        // If enrichment found LinkedIn, select it
        if (enriched.linkedin_url) {
          setSelectedLinkedin({
            name: enriched.name || '',
            headline: enriched.specialty_summary || '',
            url: enriched.linkedin_url,
            photo_url: enriched.photo_url,
          });
        }

        toast.success('Contact details found', { duration: 2000 });
      }
    } catch {
      // Enrichment is best-effort
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

  // ── Phone enrichment ──────────────────────────────────────────────

  const enrichFromPhone = useCallback(async (phone: string) => {
    if (!isValidPhone(phone) || phone === enrichedPhone) return;

    setIsEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke('contact-enrich', {
        body: { phone: phone.trim() },
      });

      if (error) throw error;

      const enriched = data?.enriched as EnrichmentResult | null;
      if (enriched) {
        setEnrichedData(prev => ({ ...prev, ...enriched }));
        setEnrichedPhone(phone);

        // Auto-fill name if Twilio returned caller name
        if (enriched.name && !form.name) {
          setForm(f => ({ ...f, name: enriched.name || f.name }));
        }

        toast.success('Caller info found', { duration: 2000 });
      }
    } catch {
      // Best-effort
    } finally {
      setIsEnriching(false);
    }
  }, [enrichedPhone, form.name]);

  const handlePhoneBlur = () => {
    const phone = form.phone.trim();
    if (phone && isValidPhone(phone)) {
      enrichFromPhone(phone);
    }
  };

  // ── LinkedIn search by name ───────────────────────────────────────

  const searchLinkedIn = useCallback(async () => {
    const name = form.name.trim();
    if (name.length < 2) return;

    setIsSearchingLinkedin(true);
    setShowLinkedinSearch(true);
    try {
      const { data, error } = await supabase.functions.invoke('contact-enrich', {
        body: { name, linkedin_search: true },
      });

      if (error) throw error;
      setLinkedinResults(data?.results || []);
    } catch {
      setLinkedinResults([]);
    } finally {
      setIsSearchingLinkedin(false);
    }
  }, [form.name]);

  const selectLinkedInResult = (result: LinkedInResult) => {
    setSelectedLinkedin(result);
    setShowLinkedinSearch(false);
    setLinkedinResults([]);

    // Auto-fill empty fields from the LinkedIn result
    setForm(f => ({
      ...f,
      specialty: f.specialty || [result.title, result.company].filter(Boolean).join(' at ') || f.specialty,
    }));

    // Merge into enrichment data
    setEnrichedData(prev => ({
      ...prev,
      linkedin_url: result.url,
      photo_url: result.photo_url || prev?.photo_url,
      company: result.company || prev?.company,
      title: result.title || prev?.title,
      city: result.city || prev?.city,
    }));
  };

  // ── Save ──────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.name.trim() && !form.phone.trim() && !form.email.trim()) return;
    setIsSubmitting(true);
    try {
      await createContact({
        name: form.name.trim() || enrichedData?.name || form.email.trim() || form.phone.trim(),
        phone: form.phone.trim() ? (normalizePhoneToE164(form.phone.trim()) || form.phone.trim()) : null,
        email: form.email.trim() || null,
        specialty_summary: form.specialty.trim() || null,
        linkedin_url: selectedLinkedin?.url || enrichedData?.linkedin_url || null,
        photo_url: enrichedData?.photo_url || selectedLinkedin?.photo_url || null,
        company: enrichedData?.company || null,
        title: enrichedData?.title || null,
        city: enrichedData?.city || null,
      }, []);
      setShowSuccess(true);
      const displayName = form.name.trim() || enrichedData?.name || 'Contact';
      toast.success(`${displayName} added to your Black Book`);
      setTimeout(() => {
        resetForm();
        onOpenChange(false);
      }, 800);
    } catch {
      // Error toast is handled by the hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({ name: '', phone: '', email: '', specialty: '' });
    setEnrichedData(null);
    setEnrichedEmail('');
    setEnrichedPhone('');
    setSelectedLinkedin(null);
    setShowLinkedinSearch(false);
    setLinkedinResults([]);
    setShowSuccess(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) resetForm();
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
                {/* Name + LinkedIn search */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                >
                  <div className="relative">
                    <Input
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Name"
                      className="bg-input border-border text-foreground text-base pr-28"
                      autoFocus
                    />
                    {form.name.trim().length >= 2 && !selectedLinkedin && (
                      <button
                        type="button"
                        onClick={searchLinkedIn}
                        disabled={isSearchingLinkedin}
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[#0A66C2] text-[11px] font-medium active:opacity-70 transition-opacity"
                      >
                        {isSearchingLinkedin ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Linkedin className="w-3 h-3" />
                        )}
                        <span>Find LinkedIn</span>
                      </button>
                    )}
                  </div>

                  {/* Selected LinkedIn profile */}
                  {selectedLinkedin && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="flex items-center gap-2 mt-1.5 ml-1"
                    >
                      <Linkedin className="w-3 h-3 text-[#0A66C2]" />
                      <span className="text-[11px] text-foreground-secondary truncate flex-1">
                        {selectedLinkedin.headline || selectedLinkedin.url}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedLinkedin(null)}
                        className="text-foreground-muted active:text-foreground"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  )}

                  {/* LinkedIn search results */}
                  <AnimatePresence>
                    {showLinkedinSearch && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2"
                      >
                        {isSearchingLinkedin && (
                          <div className="flex items-center justify-center py-3">
                            <Loader2 className="w-4 h-4 animate-spin text-[#0A66C2] mr-2" />
                            <span className="text-caption text-foreground-secondary">Searching LinkedIn...</span>
                          </div>
                        )}

                        {!isSearchingLinkedin && linkedinResults.length > 0 && (
                          <div className="space-y-1 max-h-48 overflow-y-auto overscroll-contain rounded-xl border border-border bg-input/50">
                            {linkedinResults.map((result, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => selectLinkedInResult(result)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-left active:bg-primary/10 transition-colors"
                              >
                                {result.photo_url ? (
                                  <img
                                    src={result.photo_url}
                                    alt=""
                                    className="w-8 h-8 rounded-full object-cover shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-[#0A66C2]/20 flex items-center justify-center shrink-0">
                                    <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-foreground truncate">{result.name}</p>
                                  {result.headline && (
                                    <p className="text-[11px] text-foreground-secondary truncate">{result.headline}</p>
                                  )}
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 text-foreground-muted shrink-0" />
                              </button>
                            ))}
                          </div>
                        )}

                        {!isSearchingLinkedin && linkedinResults.length === 0 && (
                          <p className="text-caption text-foreground-secondary text-center py-2">
                            No LinkedIn profiles found for "{form.name.trim()}"
                          </p>
                        )}

                        {!isSearchingLinkedin && (
                          <button
                            type="button"
                            onClick={() => { setShowLinkedinSearch(false); setLinkedinResults([]); }}
                            className="w-full text-caption text-foreground-muted text-center py-1.5 active:text-foreground transition-colors"
                          >
                            Dismiss
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
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
                      onBlur={handlePhoneBlur}
                      placeholder="+1 555 123 4567"
                      type="tel"
                      className="pl-11 bg-input border-border text-foreground text-base"
                    />
                    {isEnriching && enrichedPhone !== form.phone.trim() && form.phone.trim() && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
                    )}
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
                    {isEnriching && enrichedEmail !== form.email.trim() && form.email.trim() && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
                    )}
                  </div>
                  {enrichedData && (enrichedEmail || enrichedPhone) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="flex items-center gap-1.5 mt-1.5 ml-1"
                    >
                      <Sparkles className="w-3 h-3 text-primary" />
                      <span className="text-[11px] text-foreground-secondary">
                        Auto-filled
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

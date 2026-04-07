import { useState, useRef, useCallback, useEffect } from 'react';
import { Loader2, ArrowRight, Sparkles, Check, Phone, Mail, Linkedin, Search, X, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTalentContacts, TalentContactWithSkills } from '@/hooks/useTalentContacts';
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { isValidEmail, isValidPhone, normalizePhoneToE164 } from '@/utils/contactActions';
import { haptics } from '@/utils/haptics';
import { useDuplicateDetection, DuplicateMatch } from '@/hooks/useDuplicateDetection';
import { AlertTriangle } from 'lucide-react';

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
  onOpenFullForm: (contact?: TalentContactWithSkills) => void;
}

// Rotating placeholder examples
const PLACEHOLDER_EXAMPLES = [
  'Sarah Chen',
  'sarah@nike.com',
  '+1 555 123 4567',
  'linkedin.com/in/sarah-chen',
  '@sarahdesigns',
];

const MET_AT_SUGGESTIONS = ['Conference', 'LinkedIn', 'Referral', 'Client intro', 'Event', 'Coworking'];

export const QuickAddSheet = ({ open, onOpenChange, onOpenFullForm }: QuickAddSheetProps) => {
  const { createContact, updateContact, contacts, getContact } = useTalentContacts();
  const { isKeyboardVisible } = useKeyboardVisible();
  const { findDuplicates } = useDuplicateDetection(contacts);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', specialty: '' });

  // Context fields (met_at, met_date, quick note)
  const [showContext, setShowContext] = useState(false);
  const [metAt, setMetAt] = useState('');
  const [quickNote, setQuickNote] = useState('');

  // Duplicate detection state
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);

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

  // Post-save state
  const [savedContact, setSavedContact] = useState<any>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const isFirstContact = contacts.length === 0;

  // Rotating placeholder
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const contentRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [smartDetected, setSmartDetected] = useState<string | null>(null);

  // Rotate placeholder every 3s when form is empty and input isn't focused
  useEffect(() => {
    if (!open || form.name) return;
    const interval = setInterval(() => {
      setPlaceholderIndex(i => (i + 1) % PLACEHOLDER_EXAMPLES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [open, form.name]);

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

  // ── Smart input detection on name field ───────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const val = form.name.trim();
    if (!val || val.length < 3) {
      setSmartDetected(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      // Email detection
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        setSmartDetected('email');
        setForm(f => ({ ...f, name: '', email: val }));
        enrichFromEmail(val);
        return;
      }
      // Phone detection
      const digitsOnly = val.replace(/[\s\-().]/g, '');
      if (/^\+/.test(val) || (/^\d+$/.test(digitsOnly) && digitsOnly.length >= 10)) {
        setSmartDetected('phone');
        setForm(f => ({ ...f, name: '', phone: val }));
        enrichFromPhone(val);
        return;
      }
      // LinkedIn URL detection
      if (/linkedin\.com/i.test(val)) {
        setSmartDetected('linkedin');
        const slugMatch = val.match(/linkedin\.com\/in\/([a-zA-Z0-9-]+)/i);
        if (slugMatch) {
          const slug = slugMatch[1];
          const guessedName = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          setForm(f => ({ ...f, name: guessedName }));
          setIsSearchingLinkedin(true);
          setShowLinkedinSearch(true);
          supabase.functions.invoke('contact-enrich', {
            body: { name: guessedName, linkedin_search: true },
          }).then(({ data }) => {
            const results = data?.results || [];
            setLinkedinResults(results);
            const match = results.find((r: LinkedInResult) => r.url?.includes(slug));
            if (match) selectLinkedInResult(match);
            else if (results.length === 1) selectLinkedInResult(results[0]);
          }).catch(() => setLinkedinResults([])).finally(() => setIsSearchingLinkedin(false));
        }
        return;
      }
      // Instagram handle detection
      if (/^@[a-zA-Z0-9._]+$/.test(val)) {
        setSmartDetected('instagram');
        const handle = val.slice(1);
        const cleaned = handle.replace(/\d+$/, '');
        const parts = cleaned.split(/[._-]+/).filter(Boolean);
        const guessedName = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
        if (guessedName.length >= 2) {
          setForm(f => ({ ...f, name: guessedName }));
          setIsSearchingLinkedin(true);
          setShowLinkedinSearch(true);
          supabase.functions.invoke('contact-enrich', {
            body: { name: guessedName, linkedin_search: true },
          }).then(({ data }) => {
            setLinkedinResults(data?.results || []);
          }).catch(() => setLinkedinResults([])).finally(() => setIsSearchingLinkedin(false));
        }
        return;
      }
      setSmartDetected(null);
    }, 600);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [form.name]); // eslint-disable-line react-hooks/exhaustive-deps

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

        setForm(f => ({
          ...f,
          name: f.name || enriched.name || f.name,
          specialty: f.specialty || enriched.specialty_summary || f.specialty,
        }));

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

    setForm(f => ({
      ...f,
      specialty: f.specialty || [result.title, result.company].filter(Boolean).join(' at ') || f.specialty,
    }));

    setEnrichedData(prev => ({
      ...prev,
      linkedin_url: result.url,
      photo_url: result.photo_url || prev?.photo_url,
      company: result.company || prev?.company,
      title: result.title || prev?.title,
      city: result.city || prev?.city,
    }));
  };

  // ── Build contact data ─────────────────────────────────────────────

  const buildContactData = () => {
    const today = new Date().toISOString().split('T')[0];
    return {
      name: form.name.trim() || enrichedData?.name || form.email.trim() || form.phone.trim(),
      phone: form.phone.trim() ? (normalizePhoneToE164(form.phone.trim()) || form.phone.trim()) : null,
      email: form.email.trim() || null,
      specialty_summary: form.specialty.trim() || null,
      linkedin_url: selectedLinkedin?.url || enrichedData?.linkedin_url || null,
      photo_url: enrichedData?.photo_url || selectedLinkedin?.photo_url || null,
      company: enrichedData?.company || null,
      title: enrichedData?.title || null,
      city: enrichedData?.city || null,
      source: 'cold' as any,
      met_at: metAt.trim() || null,
      met_date: metAt.trim() ? today : null,
      notes_voice_raw: quickNote.trim() || null,
    };
  };

  // ── Save ──────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.name.trim() && !form.phone.trim() && !form.email.trim()) return;

    // Check for duplicates before saving
    const dupes = findDuplicates(form.name.trim(), form.email.trim(), form.phone.trim());
    if (dupes.length > 0 && duplicateMatches.length === 0) {
      setDuplicateMatches(dupes);
      return; // Show duplicate warning, don't save yet
    }

    await saveAsNew();
  };

  const saveAsNew = async () => {
    setIsSubmitting(true);
    setDuplicateMatches([]);
    try {
      const newContact = await createContact(buildContactData(), []);

      setSavedContact(newContact);
      setSessionCount(c => c + 1);
      setShowSuccess(true);
      haptics.success();

      const displayName = form.name.trim() || enrichedData?.name || 'Contact';
      toast.success(`${displayName} added to your circle`);
    } catch {
      // Error toast is handled by the hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const mergeWithExisting = async (existingContact: TalentContactWithSkills) => {
    setIsSubmitting(true);
    setDuplicateMatches([]);
    try {
      const data = buildContactData();
      // Only fill empty fields on the existing contact
      const updates: Record<string, any> = {};
      if (!existingContact.email && data.email) updates.email = data.email;
      if (!existingContact.phone && data.phone) updates.phone = data.phone;
      if (!existingContact.specialty_summary && data.specialty_summary) updates.specialty_summary = data.specialty_summary;
      if (!existingContact.linkedin_url && data.linkedin_url) updates.linkedin_url = data.linkedin_url;
      if (!existingContact.photo_url && data.photo_url) updates.photo_url = data.photo_url;
      if (!existingContact.company && data.company) updates.company = data.company;
      if (!existingContact.title && data.title) updates.title = data.title;
      if (!existingContact.city && data.city) updates.city = data.city;
      if (!existingContact.met_at && data.met_at) updates.met_at = data.met_at;
      if (!existingContact.met_date && data.met_date) updates.met_date = data.met_date;
      if (!existingContact.notes_voice_raw && data.notes_voice_raw) updates.notes_voice_raw = data.notes_voice_raw;

      if (Object.keys(updates).length > 0) {
        await updateContact(existingContact.id, updates);
      }

      setSavedContact(existingContact);
      setSessionCount(c => c + 1);
      setShowSuccess(true);
      haptics.success();
      toast.success(`Merged with ${existingContact.name}`);
    } catch {
      // Error handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const dismissDuplicates = () => {
    setDuplicateMatches([]);
  };

  // ── Post-save actions ─────────────────────────────────────────────

  const handleAddAnother = () => {
    resetFormOnly();
    setShowSuccess(false);
    haptics.light();
  };

  const handleAddDetails = async () => {
    if (savedContact?.id) {
      const fullContact = await getContact(savedContact.id);
      onOpenFullForm(fullContact || undefined);
    }
    resetForm();
    onOpenChange(false);
  };

  const handleDone = () => {
    resetForm();
    onOpenChange(false);
  };

  const resetFormOnly = () => {
    setForm({ name: '', phone: '', email: '', specialty: '' });
    setEnrichedData(null);
    setEnrichedEmail('');
    setEnrichedPhone('');
    setSelectedLinkedin(null);
    setShowLinkedinSearch(false);
    setLinkedinResults([]);
    setSmartDetected(null);
    setShowContext(false);
    setMetAt('');
    setQuickNote('');
    setDuplicateMatches([]);
    setSavedContact(null);
    setPlaceholderIndex(0);
  };

  const resetForm = () => {
    resetFormOnly();
    setShowSuccess(false);
    setSessionCount(0);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

  const hasMinimumInfo = form.name.trim() || form.phone.trim() || form.email.trim();

  // Build completeness hint for post-save
  const getCompletenessHint = () => {
    const saved = [];
    if (form.name.trim()) saved.push('name');
    if (form.email.trim()) saved.push('email');
    if (form.phone.trim()) saved.push('phone');
    const savedStr = saved.join(' and ');
    return `${savedStr.charAt(0).toUpperCase() + savedStr.slice(1)} saved. Add skills and rate to make them easier to find later.`;
  };

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
              className="flex flex-col items-center justify-center py-8 px-6"
            >
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-3">
                <Check className="w-8 h-8 text-success" />
              </div>
              <p className="text-lg font-semibold text-foreground">Added to your circle</p>

              {sessionCount > 1 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-caption text-primary font-medium mt-1"
                >
                  {sessionCount} contacts added this session
                </motion.p>
              )}

              <p className="text-[12px] text-foreground-secondary text-center mt-2 max-w-[260px]">
                {getCompletenessHint()}
              </p>

              {/* Post-save action buttons */}
              <div className="w-full space-y-2 mt-5">
                <Button
                  onClick={handleAddDetails}
                  variant="outline"
                  size="lg"
                  className="w-full gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Add skills &amp; details
                </Button>
                <Button
                  onClick={handleAddAnother}
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  Add another
                </Button>
                <button
                  onClick={handleDone}
                  className="w-full text-foreground-secondary text-caption text-center py-2 active:text-foreground transition-colors"
                >
                  Done
                </button>
              </div>
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
                      placeholder={PLACEHOLDER_EXAMPLES[placeholderIndex]}
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

                  {/* Accepted input types hint (only when name is empty) */}
                  {!form.name && !smartDetected && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="flex items-center gap-2 mt-1.5 ml-1"
                    >
                      <span className="text-[10px] text-foreground-muted">
                        Accepts name, email, phone, LinkedIn URL, or @handle
                      </span>
                    </motion.div>
                  )}

                  {/* Smart detection indicator */}
                  {smartDetected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="flex items-center gap-1.5 mt-1 ml-1"
                    >
                      <Sparkles className="w-3 h-3 text-primary" />
                      <span className="text-[10px] text-primary font-medium">
                        {smartDetected === 'email' && 'Detected email — searching contacts...'}
                        {smartDetected === 'phone' && 'Detected phone — looking up caller...'}
                        {smartDetected === 'linkedin' && 'Detected LinkedIn — finding profile...'}
                        {smartDetected === 'instagram' && 'Detected Instagram — searching...'}
                      </span>
                    </motion.div>
                  )}

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

                  {/* LinkedIn search results (fixed height, no layout shift) */}
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
                        {enrichedData.company && `, ${enrichedData.company}`}
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
                    placeholder="What they do, e.g. role, rate, location"
                    className="bg-input border-border text-foreground text-base"
                  />
                </motion.div>

                {/* Context section: How did you meet? */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <button
                    type="button"
                    onClick={() => setShowContext(!showContext)}
                    className="flex items-center gap-1.5 text-[12px] text-foreground-secondary active:text-foreground transition-colors"
                  >
                    {showContext ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    How did you meet?
                  </button>

                  <AnimatePresence>
                    {showContext && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 mt-2"
                      >
                        {/* Met at chip suggestions */}
                        <div className="flex flex-wrap gap-1.5">
                          {MET_AT_SUGGESTIONS.map(suggestion => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => setMetAt(metAt === suggestion ? '' : suggestion)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                                metAt === suggestion
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-secondary text-foreground-secondary active:bg-secondary/80'
                              }`}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                        {/* Custom met_at input */}
                        <Input
                          value={MET_AT_SUGGESTIONS.includes(metAt) ? '' : metAt}
                          onChange={e => setMetAt(e.target.value)}
                          placeholder="Or type where you met..."
                          className="bg-input border-border text-foreground text-sm h-9"
                        />
                        {/* Quick note */}
                        <Input
                          value={quickNote}
                          onChange={e => setQuickNote(e.target.value)}
                          placeholder="Quick note, e.g. 'great React dev, knows Sarah'"
                          className="bg-input border-border text-foreground text-sm h-9"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>

              {/* Duplicate detection warning */}
              <AnimatePresence>
                {duplicateMatches.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-4 pb-2"
                  >
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        <p className="text-sm font-medium text-foreground">Possible duplicate</p>
                      </div>
                      {duplicateMatches.slice(0, 2).map(match => (
                        <div key={match.contact.id} className="flex items-center gap-3 py-1.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-medium text-primary">
                              {match.contact.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{match.contact.name}</p>
                            <p className="text-[11px] text-foreground-secondary truncate">
                              {match.matchType === 'email' && `Same email: ${match.contact.email}`}
                              {match.matchType === 'phone' && `Same phone: ${match.contact.phone}`}
                              {match.matchType === 'name' && 'Similar name'}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0 text-xs h-7"
                            onClick={() => mergeWithExisting(match.contact)}
                            disabled={isSubmitting}
                          >
                            Merge
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex-1 text-xs h-8"
                          onClick={saveAsNew}
                          disabled={isSubmitting}
                        >
                          Save as new
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex-1 text-xs h-8 text-foreground-muted"
                          onClick={dismissDuplicates}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <DrawerFooter className="pt-2 pb-6 safe-bottom">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
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
                  onClick={() => onOpenFullForm()}
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

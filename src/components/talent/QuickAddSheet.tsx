import { useState, useRef, useCallback, useEffect } from 'react';
import { Loader2, Linkedin, ArrowRight, Sparkles, Check, Search, X, ExternalLink } from 'lucide-react';
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

interface LinkedInResult {
  name: string;
  headline: string;
  url: string;
  image?: string;
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
  const [form, setForm] = useState({ name: '', specialty: '', linkedin_url: '' });

  // LinkedIn search state
  const [linkedinMode, setLinkedinMode] = useState<'url' | 'search'>('url');
  const [linkedinQuery, setLinkedinQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LinkedInResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll focused input into view when keyboard opens
  useEffect(() => {
    if (isKeyboardVisible && contentRef.current) {
      const activeEl = document.activeElement as HTMLElement;
      if (activeEl && contentRef.current.contains(activeEl)) {
        // Small delay to let the viewport settle
        setTimeout(() => {
          activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }, [isKeyboardVisible]);

  const searchLinkedIn = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('linkedin-search', {
        body: { query: query.trim() },
      });

      if (error) throw error;
      setSearchResults(data?.results || []);
    } catch {
      // Silently fail - search is best-effort
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleLinkedinQueryChange = (value: string) => {
    setLinkedinQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchLinkedIn(value), 400);
  };

  const selectLinkedInResult = (result: LinkedInResult) => {
    setForm(f => ({ ...f, linkedin_url: result.url }));
    setLinkedinMode('url');
    setLinkedinQuery('');
    setSearchResults([]);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setIsSubmitting(true);
    try {
      await createContact({
        name: form.name.trim(),
        specialty_summary: form.specialty.trim() || null,
        linkedin_url: form.linkedin_url.trim() || null,
      }, []);
      setShowSuccess(true);
      toast.success(`${form.name} added to your Black Book`);
      setTimeout(() => {
        setForm({ name: '', specialty: '', linkedin_url: '' });
        setShowSuccess(false);
        setLinkedinMode('url');
        setLinkedinQuery('');
        setSearchResults([]);
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
      setLinkedinMode('url');
      setLinkedinQuery('');
      setSearchResults([]);
    }
    onOpenChange(isOpen);
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
                <p className="text-caption text-foreground-secondary">3 fields. Done in seconds.</p>
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
                    placeholder="Name *"
                    className="bg-input border-border text-foreground text-base"
                    autoFocus
                  />
                </motion.div>

                {/* What they do */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Input
                    value={form.specialty}
                    onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                    placeholder="What they do — role, rate, location"
                    className="bg-input border-border text-foreground text-base"
                  />
                </motion.div>

                {/* LinkedIn URL / Search */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <AnimatePresence mode="wait">
                    {linkedinMode === 'url' ? (
                      <motion.div
                        key="url-mode"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <div className="relative">
                          <Linkedin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                          <Input
                            value={form.linkedin_url}
                            onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))}
                            placeholder="LinkedIn URL"
                            className="pl-11 pr-24 bg-input border-border text-foreground text-base"
                          />
                          <button
                            type="button"
                            onClick={() => setLinkedinMode('search')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-primary text-[11px] font-medium active:opacity-70 transition-opacity"
                          >
                            <Search className="w-3 h-3" />
                            <span>Search</span>
                          </button>
                        </div>
                        {form.linkedin_url && (
                          <div className="flex items-center gap-1.5 mt-1.5 ml-1">
                            <Check className="w-3 h-3 text-success" />
                            <span className="text-[11px] text-foreground-secondary truncate">
                              {form.linkedin_url}
                            </span>
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="search-mode"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-2"
                      >
                        <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                          <Input
                            value={linkedinQuery}
                            onChange={e => handleLinkedinQueryChange(e.target.value)}
                            placeholder="Search by name..."
                            className="pl-11 pr-10 bg-input border-border text-foreground text-base border-primary/50 focus:border-primary"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setLinkedinMode('url');
                              setLinkedinQuery('');
                              setSearchResults([]);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted active:text-foreground transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Search results */}
                        {isSearching && (
                          <div className="flex items-center justify-center py-3">
                            <Loader2 className="w-4 h-4 animate-spin text-primary mr-2" />
                            <span className="text-caption text-foreground-secondary">Searching LinkedIn...</span>
                          </div>
                        )}

                        {!isSearching && searchResults.length > 0 && (
                          <div className="space-y-1 max-h-40 overflow-y-auto overscroll-contain rounded-xl border border-border bg-input/50">
                            {searchResults.map((result, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => selectLinkedInResult(result)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-left active:bg-primary/10 transition-colors"
                              >
                                <div className="w-8 h-8 rounded-full bg-[#0A66C2]/20 flex items-center justify-center shrink-0">
                                  <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                                </div>
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

                        {!isSearching && linkedinQuery.length >= 2 && searchResults.length === 0 && (
                          <p className="text-caption text-foreground-secondary text-center py-2">
                            No profiles found. Try a different name or paste a URL.
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>

              <DrawerFooter className="pt-2 pb-6 safe-bottom">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="w-full"
                >
                  <Button
                    onClick={handleSave}
                    disabled={!form.name.trim() || isSubmitting}
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

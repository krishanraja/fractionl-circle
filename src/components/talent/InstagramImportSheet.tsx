import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Instagram, Camera, Check, Loader2 } from 'lucide-react';
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

interface InstagramImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanScreenshot: () => void;
}

export const InstagramImportSheet = ({ open, onOpenChange, onScanScreenshot }: InstagramImportSheetProps) => {
  const { createContact } = useTalentContacts();
  const [state, setState] = useState<ImportState>('input');
  const [handle, setHandle] = useState('');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cleanHandle = (input: string): string => {
    let h = input.trim();
    // Strip @ prefix
    if (h.startsWith('@')) h = h.slice(1);
    // Extract from URL
    const urlMatch = h.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
    if (urlMatch) h = urlMatch[1];
    return h;
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
        specialty_summary: notes.trim() || null,
        // Store Instagram URL in portfolio_url (no dedicated instagram field in DB)
        portfolio_url: cleaned ? `https://instagram.com/${cleaned}` : null,
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
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) handleReset();
    onOpenChange(isOpen);
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="bg-background border-border max-h-[85dvh]">
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
                    placeholder="@username or instagram.com/username"
                    className="bg-input border-border text-foreground text-base"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-foreground-secondary uppercase tracking-wider mb-1 block">
                    Their Name
                  </label>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Full name"
                    className="bg-input border-border text-foreground text-base"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-foreground-secondary uppercase tracking-wider mb-1 block">
                    Notes (optional)
                  </label>
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

                <button
                  onClick={handleScanInstead}
                  className="flex items-center justify-center gap-2 text-foreground-secondary text-caption py-2 active:text-foreground transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Or scan a screenshot of their profile</span>
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

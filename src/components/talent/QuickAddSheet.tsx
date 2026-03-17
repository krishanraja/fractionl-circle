import { useState } from 'react';
import { Loader2, Linkedin, ArrowRight, Sparkles, Check } from 'lucide-react';
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
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface QuickAddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenFullForm: () => void;
}

export const QuickAddSheet = ({ open, onOpenChange, onOpenFullForm }: QuickAddSheetProps) => {
  const { createContact } = useTalentContacts();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [form, setForm] = useState({ name: '', specialty: '', linkedin_url: '' });

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
        onOpenChange(false);
      }, 800);
    } catch (err) {
      // Error toast is handled by the hook
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-background border-border">
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

                {/* LinkedIn URL */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <div className="relative">
                    <Linkedin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                    <Input
                      value={form.linkedin_url}
                      onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))}
                      placeholder="LinkedIn URL"
                      className="pl-11 bg-input border-border text-foreground text-base"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-primary text-[11px] font-medium">
                      <Sparkles className="w-3 h-3" />
                      <span>Auto-fill</span>
                    </div>
                  </div>
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

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Keyboard, Mic, Camera, Instagram, Linkedin, Users, Phone, ArrowRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { haptics } from '@/utils/haptics';
import { callPhone, sendEmail } from '@/utils/contactActions';
import type { TalentContactWithSkills } from '@/hooks/useTalentContacts';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

interface ContactFABMenuProps {
  onQuickAdd: () => void;
  onVoiceAdd: () => void;
  onPhotoImport: () => void;
  onInstagramImport: () => void;
  onLinkedInImport: () => void;
  onPhoneImport: () => void;
  topSuggestion?: TalentContactWithSkills | null;
  contactCount: number;
  searchActive?: boolean;
}

const importItems = [
  { key: 'phone', icon: Users, label: 'Phone Contacts', description: 'Import from your phone', color: 'bg-emerald-500/10 text-emerald-600' },
  { key: 'linkedin', icon: Linkedin, label: 'LinkedIn', description: 'URL or CSV import', color: 'bg-[#0A66C2]/10 text-[#0A66C2]' },
  { key: 'photo', icon: Camera, label: 'Scan Card', description: 'Photo or screenshot', color: 'bg-amber-500/10 text-amber-600' },
  { key: 'instagram', icon: Instagram, label: 'Instagram', description: 'Add by handle', color: 'bg-[#E1306C]/10 text-[#E1306C]' },
] as const;

export const ContactFABMenu = ({
  onQuickAdd,
  onVoiceAdd,
  onPhotoImport,
  onInstagramImport,
  onLinkedInImport,
  onPhoneImport,
  topSuggestion,
  contactCount,
  searchActive,
}: ContactFABMenuProps) => {
  const [showMoreSheet, setShowMoreSheet] = useState(false);

  const importHandlers: Record<string, () => void> = {
    phone: onPhoneImport,
    linkedin: onLinkedInImport,
    photo: onPhotoImport,
    instagram: onInstagramImport,
  };

  const handleImportTap = (key: string) => {
    haptics.light();
    setShowMoreSheet(false);
    setTimeout(() => importHandlers[key]?.(), 150);
  };

  const handleFABTap = useCallback(() => {
    haptics.medium();
    setShowMoreSheet(true);
  }, []);

  const handleSuggestionTap = useCallback(() => {
    haptics.heroTap();
    if (!topSuggestion) return;
    if (topSuggestion.phone) {
      callPhone(topSuggestion.phone);
    } else if (topSuggestion.email) {
      sendEmail(topSuggestion.email, topSuggestion.name);
    }
  }, [topSuggestion]);

  // Determine FAB mode
  const isEmptyMode = contactCount === 0;
  const isSuggestionMode = !isEmptyMode && topSuggestion && !searchActive;
  const isSearchMode = searchActive;

  const suggestionInitials = topSuggestion?.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '';

  return (
    <>
      {/* ─── Smart FAB ─── */}
      <div
        className="fixed bottom-[100px] right-4 z-40 flex flex-col items-end gap-2"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <AnimatePresence mode="wait">
          {isEmptyMode ? (
            /* Empty: "Add your first contact" with pulse */
            <motion.button
              key="empty-fab"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => { haptics.medium(); onQuickAdd(); }}
              className="flex items-center gap-2 px-5 h-12 rounded-full bg-gradient-to-r from-primary to-primary-light text-white shadow-lg shadow-primary/30 animate-pulse-glow select-none"
            >
              <Plus className="w-5 h-5" />
              <span className="text-sm font-semibold">Add contact</span>
            </motion.button>
          ) : isSearchMode ? (
            /* Search with no results: "Add new" */
            <motion.button
              key="search-fab"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => { haptics.medium(); onQuickAdd(); }}
              className="flex items-center gap-2 px-5 h-12 rounded-full bg-primary text-white shadow-lg shadow-primary/30 select-none"
            >
              <Plus className="w-5 h-5" />
              <span className="text-sm font-semibold">Add new</span>
            </motion.button>
          ) : isSuggestionMode ? (
            /* Suggestion: Show top contact to reach out to */
            <motion.div
              key="suggest-fab"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="flex items-center gap-2"
            >
              {/* Small add button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleFABTap}
                className="w-11 h-11 rounded-full flex items-center justify-center bg-secondary border border-border/60 shadow-depth-1 select-none"
              >
                <Plus className="w-5 h-5 text-foreground-secondary" />
              </motion.button>

              {/* Suggestion pill */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSuggestionTap}
                className="flex items-center gap-2 pl-1.5 pr-4 h-11 rounded-full bg-background border border-border/60 shadow-depth-2 select-none"
              >
                <Avatar className="h-8 w-8 ring-1 ring-warning/20">
                  <AvatarImage src={topSuggestion.photo_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                    {suggestionInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-[11px] font-semibold text-foreground leading-tight">{topSuggestion.name.split(' ')[0]}</p>
                  <p className="text-[9px] text-warning font-medium leading-tight">Reach out</p>
                </div>
                <ArrowRight className="w-3 h-3 text-primary ml-0.5" />
              </motion.button>
            </motion.div>
          ) : (
            /* Default: Standard add button */
            <motion.button
              key="default-fab"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleFABTap}
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg bg-primary shadow-primary/30 select-none touch-none"
            >
              <Plus className="w-6 h-6 text-white" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Add Contact Bottom Sheet ─── */}
      <Drawer open={showMoreSheet} onOpenChange={setShowMoreSheet}>
        <DrawerContent className="bg-background border-border">
          <DrawerHeader className="pb-2 pt-2">
            <DrawerTitle className="text-foreground text-lg">Add a contact</DrawerTitle>
          </DrawerHeader>

          <div className="px-4 pb-6 safe-bottom space-y-2">
            {/* Primary actions */}
            <div className="grid grid-cols-1 gap-2">
              <MoreSheetItem
                icon={<Keyboard className="w-5 h-5" />}
                label="Type it"
                description="Quick add by name, email, or phone"
                color="bg-primary/10 text-primary"
                onClick={() => { haptics.light(); setShowMoreSheet(false); setTimeout(onQuickAdd, 150); }}
                delay={0}
              />
              <MoreSheetItem
                icon={<Mic className="w-5 h-5" />}
                label="Say it"
                description="Voice record their details"
                color="bg-rose-500/10 text-rose-600"
                onClick={() => { haptics.light(); setShowMoreSheet(false); setTimeout(onVoiceAdd, 150); }}
                delay={0.03}
              />
            </div>

            {/* Import section */}
            <div className="pt-2">
              <p className="text-[11px] text-foreground-muted uppercase tracking-wider font-medium mb-2 ml-1">Import from</p>
              <div className="grid grid-cols-2 gap-2">
                {importItems.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <MoreSheetItem
                      key={item.key}
                      icon={<Icon className="w-5 h-5" />}
                      label={item.label}
                      description={item.description}
                      color={item.color}
                      onClick={() => handleImportTap(item.key)}
                      delay={0.06 + i * 0.03}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};

function MoreSheetItem({ icon, label, description, color, onClick, delay }: {
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
  onClick: () => void;
  delay: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 border border-border/60 text-left active:scale-[0.97] transition-transform"
    >
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", color)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-[11px] text-foreground-secondary">{description}</p>
      </div>
    </motion.button>
  );
}

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Keyboard, Mic, Camera, Instagram, Linkedin, Users, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/utils/haptics';
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
}

const importItems = [
  { key: 'phone', icon: Users, label: 'Phone Contacts', description: 'Import from your phone', color: 'bg-emerald-500/12 text-emerald-600' },
  { key: 'linkedin', icon: Linkedin, label: 'LinkedIn', description: 'URL or CSV import', color: 'bg-[#0A66C2]/12 text-[#0A66C2]' },
  { key: 'photo', icon: Camera, label: 'Scan Card', description: 'Photo or screenshot', color: 'bg-amber-500/12 text-amber-600' },
  { key: 'instagram', icon: Instagram, label: 'Instagram', description: 'Add by handle', color: 'bg-[#E1306C]/12 text-[#E1306C]' },
] as const;

export const ContactFABMenu = ({
  onQuickAdd,
  onVoiceAdd,
  onPhotoImport,
  onInstagramImport,
  onLinkedInImport,
  onPhoneImport,
}: ContactFABMenuProps) => {
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

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

  const handlePointerDown = useCallback(() => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      haptics.medium();
      setShowMoreSheet(true);
    }, 500);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    // Single tap = Quick Add (only if not a long press)
    if (!didLongPress.current) {
      haptics.light();
      onQuickAdd();
    }
  }, [onQuickAdd]);

  const handlePointerCancel = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  return (
    <>
      {/* Main FAB - single tap = Quick Add, long press = more options */}
      <div
        className="fixed bottom-36 right-4 z-40 flex flex-col items-end gap-2"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* "More ways" hint */}
        <AnimatePresence>
          {!showMoreSheet && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ delay: 1.5, duration: 0.3 }}
              onClick={() => { haptics.light(); setShowMoreSheet(true); }}
              className="flex items-center gap-1 text-[11px] text-foreground-secondary bg-background/90 backdrop-blur-sm border border-border rounded-full px-2.5 py-1 shadow-sm active:bg-secondary transition-colors"
            >
              <ChevronUp className="w-3 h-3" />
              <span>More ways to add</span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* FAB button */}
        <motion.button
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={handlePointerCancel}
          whileTap={{ scale: 0.9 }}
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg bg-primary shadow-primary/30 select-none touch-none"
        >
          <Plus className="w-6 h-6 text-white" />
        </motion.button>
      </div>

      {/* "More ways to add" bottom sheet */}
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
                color="bg-primary/12 text-primary"
                onClick={() => { haptics.light(); setShowMoreSheet(false); setTimeout(onQuickAdd, 150); }}
                delay={0}
              />
              <MoreSheetItem
                icon={<Mic className="w-5 h-5" />}
                label="Say it"
                description="Voice record their details"
                color="bg-rose-500/12 text-rose-600"
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
      className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 border border-border text-left active:bg-secondary transition-colors"
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

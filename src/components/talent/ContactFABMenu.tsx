import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Keyboard, Mic, Camera, Instagram, Linkedin, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/utils/haptics';

interface ContactFABMenuProps {
  onQuickAdd: () => void;
  onVoiceAdd: () => void;
  onPhotoImport: () => void;
  onInstagramImport: () => void;
  onLinkedInImport: () => void;
  onPhoneImport: () => void;
}

const menuItems = [
  { key: 'phone', icon: Users, label: 'Phone Contacts', color: 'bg-emerald-500' },
  { key: 'linkedin', icon: Linkedin, label: 'LinkedIn', color: 'bg-[#0A66C2]' },
  { key: 'instagram', icon: Instagram, label: 'Instagram', color: 'bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]' },
  { key: 'photo', icon: Camera, label: 'Scan Card', color: 'bg-amber-500' },
  { key: 'voice', icon: Mic, label: 'Voice Add', color: 'bg-rose-500' },
  { key: 'quick', icon: Keyboard, label: 'Quick Add', color: 'bg-primary' },
] as const;

export const ContactFABMenu = ({
  onQuickAdd,
  onVoiceAdd,
  onPhotoImport,
  onInstagramImport,
  onLinkedInImport,
  onPhoneImport,
}: ContactFABMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handlers: Record<string, () => void> = {
    quick: onQuickAdd,
    voice: onVoiceAdd,
    photo: onPhotoImport,
    instagram: onInstagramImport,
    linkedin: onLinkedInImport,
    phone: onPhoneImport,
  };

  const handleItemTap = (key: string) => {
    haptics.light();
    setIsOpen(false);
    // Small delay so close animation starts before sheet opens
    setTimeout(() => handlers[key]?.(), 150);
  };

  const toggleMenu = () => {
    haptics.medium();
    setIsOpen(prev => !prev);
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Menu items */}
      <div className="fixed bottom-36 right-4 z-40 flex flex-col-reverse items-end gap-3"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Speed dial items */}
        <AnimatePresence>
          {isOpen && menuItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.key}
                initial={{ opacity: 0, scale: 0.3, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.3, y: 20 }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 22,
                  delay: i * 0.04,
                }}
                onClick={() => handleItemTap(item.key)}
                className="flex items-center gap-3"
              >
                {/* Label */}
                <motion.span
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 + 0.1 }}
                  className="text-sm font-medium text-white bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-lg whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
                {/* Icon button */}
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center shadow-lg",
                  item.color
                )}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>

        {/* Main FAB */}
        <motion.button
          onClick={toggleMenu}
          whileTap={{ scale: 0.9 }}
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center shadow-lg",
            isOpen
              ? "bg-foreground/80 shadow-foreground/20"
              : "bg-primary shadow-primary/30"
          )}
        >
          <Plus className="w-6 h-6 text-white" />
        </motion.button>
      </div>
    </>
  );
};

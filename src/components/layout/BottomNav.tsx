import { motion } from 'framer-motion';
import { Users, BookUser, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/utils/haptics';

export type TabId = 'customers' | 'contacts' | 'settings';

interface BottomNavProps {
  currentTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const navItems: { id: TabId; label: string; icon: typeof Users }[] = [
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'contacts', label: 'Contacts', icon: BookUser },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const BottomNav = ({ currentTab, onTabChange }: BottomNavProps) => {
  const handleTabChange = (tab: TabId) => {
    haptics.tap();
    onTabChange(tab);
  };

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-background/95 backdrop-blur-xl",
        "border-t border-border",
        "safe-bottom"
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1",
                "relative transition-all duration-200",
                "flex-1 h-full py-2",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon
                className={cn(
                  "w-6 h-6 relative z-10 transition-colors",
                  isActive ? "text-primary" : "text-foreground-secondary"
                )}
              />
              <span
                className={cn(
                  "text-[11px] relative z-10 transition-colors font-medium",
                  isActive ? "text-primary" : "text-foreground-secondary"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

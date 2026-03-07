import { motion } from 'framer-motion';
import { Home, Plus, Clock, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TabId = 'pulse' | 'log' | 'history' | 'network' | 'settings';

interface BottomNavProps {
  currentTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const navItems: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: 'pulse', label: 'Pulse', icon: Home },
  { id: 'network', label: 'Network', icon: Users },
  { id: 'log', label: 'Log', icon: Plus },
  { id: 'history', label: 'History', icon: Clock },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const BottomNav = ({ currentTab, onTabChange }: BottomNavProps) => {
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
          const isLog = item.id === 'log';

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1",
                "relative transition-all duration-200",
                isLog ? "w-14 h-14 -mt-4" : "flex-1 h-full py-2",
              )}
            >
              {isLog ? (
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center",
                    "bg-primary shadow-lg shadow-primary/30",
                    isActive && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background"
                  )}
                >
                  <Icon className="w-6 h-6 text-primary-foreground" />
                </motion.div>
              ) : (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-primary/10 rounded-xl"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon
                    className={cn(
                      "w-5 h-5 relative z-10 transition-colors",
                      isActive ? "text-primary" : "text-foreground-secondary"
                    )}
                  />
                  <span
                    className={cn(
                      "text-[10px] relative z-10 transition-colors",
                      isActive ? "text-primary font-medium" : "text-foreground-secondary"
                    )}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

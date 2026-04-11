import { motion } from 'framer-motion';
import { Home, Clock, Users, Mic, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/utils/haptics';

export type TabId = 'customers' | 'contacts' | 'activity' | 'settings';

interface BottomNavProps {
  currentTab: TabId;
  onTabChange: (tab: TabId) => void;
  onOpenLog: () => void;
}

const sideItems: { id: TabId | 'log'; label: string; icon: typeof Home }[] = [
  { id: 'customers', label: 'Pulse', icon: Home },
  { id: 'activity', label: 'Activity', icon: Clock },
  // Circle is handled separately as the center hero
  { id: 'log' as any, label: 'Log', icon: Mic },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const BottomNav = ({ currentTab, onTabChange, onOpenLog }: BottomNavProps) => {
  const handleTabChange = (tab: TabId | 'log') => {
    if (tab === 'log') {
      haptics.medium();
      onOpenLog();
      return;
    }
    haptics.navSwitch();
    onTabChange(tab);
  };

  const isCircleActive = currentTab === 'contacts';

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-background/80 backdrop-blur-2xl",
        "border-t border-border/30",
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* Subtle gradient top edge */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="flex items-end justify-around h-[72px] max-w-lg mx-auto px-1 relative">
        {/* Left pair: Pulse, Activity */}
        {sideItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1",
                "relative flex-1 h-full pb-2 pt-2",
                "transition-colors duration-200",
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-all duration-200",
                  isActive ? "text-primary" : "text-foreground-muted"
                )}
                strokeWidth={isActive ? 2.2 : 1.5}
              />
              <span
                className={cn(
                  "text-[10px] font-medium tracking-wide transition-all duration-200",
                  isActive ? "text-primary opacity-100" : "text-foreground-muted opacity-70"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Center: Circle Hero Button */}
        <div className="flex flex-col items-center justify-start flex-1 relative -mt-4 pb-1">
          <motion.button
            onClick={() => handleTabChange('contacts')}
            whileTap={{ scale: 0.9 }}
            className={cn(
              "relative w-14 h-14 rounded-full flex items-center justify-center",
              "bg-gradient-to-br from-primary to-primary-light",
              "shadow-lg shadow-primary/30",
              "transition-all duration-300",
              isCircleActive && "animate-nav-glow",
            )}
          >
            {/* Outer ring when active */}
            {isCircleActive && (
              <motion.div
                className="absolute inset-[-3px] rounded-full border-2 border-primary/30"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              />
            )}
            <Users
              className="w-6 h-6 text-white"
              strokeWidth={2}
            />
          </motion.button>
          <span
            className={cn(
              "text-[10px] font-semibold tracking-wide mt-1 transition-all duration-200",
              isCircleActive ? "text-primary" : "text-foreground-muted"
            )}
          >
            Circle
          </span>
        </div>

        {/* Right pair: Log, Settings */}
        {sideItems.slice(2).map((item) => {
          const Icon = item.icon;
          const isActive = item.id !== 'log' && currentTab === item.id;
          const isLog = item.id === 'log';

          return (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id as any)}
              className={cn(
                "flex flex-col items-center justify-center gap-1",
                "relative flex-1 h-full pb-2 pt-2",
                "transition-colors duration-200",
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "w-5 h-5 transition-all duration-200",
                    isLog ? "text-foreground-secondary" :
                    isActive ? "text-primary" : "text-foreground-muted"
                  )}
                  strokeWidth={isActive ? 2.2 : 1.5}
                />
                {isLog && (
                  <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium tracking-wide transition-all duration-200",
                  isLog ? "text-foreground-secondary opacity-80" :
                  isActive ? "text-primary opacity-100" : "text-foreground-muted opacity-70"
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

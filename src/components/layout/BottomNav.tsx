import { Home, PenLine, Clock, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/utils/haptics';

export type TabId = 'customers' | 'contacts' | 'settings';

interface BottomNavProps {
  currentTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const navItems: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: 'pulse', label: 'Pulse', icon: Home },
  { id: 'network', label: 'Network', icon: Users },
  { id: 'log', label: 'Log', icon: PenLine },
  { id: 'history', label: 'History', icon: Clock },
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
                "relative flex-1 h-full py-2",
                "transition-colors duration-200",
              )}
            >
              {/* Active top indicator line */}
              {isActive && (
                <span
                  className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full"
                />
              )}
              <Icon
                className={cn(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-primary" : "text-foreground-muted"
                )}
                strokeWidth={isActive ? 2.5 : 1.75}
              />
              <span
                className={cn(
                  "text-[11px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-foreground-muted"
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

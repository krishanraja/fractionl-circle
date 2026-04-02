import { Home, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/utils/haptics';

export type TabId = 'customers' | 'contacts' | 'settings';

interface BottomNavProps {
  currentTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const navItems: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: 'customers', label: 'Customers', icon: Home },
  { id: 'contacts', label: 'Contacts', icon: Users },
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
        "border-t border-border/40",
        "safe-bottom"
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-[68px] max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5",
                "relative flex-1 h-full py-2",
                "transition-colors duration-200",
              )}
            >
              <Icon
                className={cn(
                  "w-[22px] h-[22px] transition-colors",
                  isActive ? "text-primary" : "text-foreground-muted"
                )}
                strokeWidth={isActive ? 2 : 1.5}
              />
              <span
                className={cn(
                  "text-[10px] font-medium tracking-wide transition-colors",
                  isActive ? "text-primary" : "text-foreground-muted"
                )}
              >
                {item.label}
              </span>
              {/* Active dot indicator */}
              {isActive && (
                <span className="absolute bottom-2 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

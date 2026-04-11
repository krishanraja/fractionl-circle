import { Users, BookUser, Settings, LogOut, Plus, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useCircleInsights } from '@/hooks/useCircleInsights';
import type { TabId } from './BottomNav';

interface DesktopSidebarProps {
  currentTab: TabId;
  onTabChange: (tab: TabId) => void;
  onOpenLog: () => void;
}

const mainNavItems: { id: TabId; label: string; icon: typeof Users; isHero?: boolean }[] = [
  { id: 'contacts', label: 'Circle', icon: BookUser, isHero: true },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'activity', label: 'Activity', icon: Clock },
];

export const DesktopSidebar = ({ currentTab, onTabChange, onOpenLog }: DesktopSidebarProps) => {
  const { signOut } = useAuth();
  const { totalContacts, networkHealthColor, networkHealthStatus } = useCircleInsights();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-background border-r border-border flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center h-16 px-6">
        <img
          src="/lovable-uploads/30f9efde-5245-4c24-b26e-1e368f4a5a1b.png"
          alt="Fractionl"
          className="h-6"
        />
      </div>

      {/* Log Activity button */}
      <div className="px-3 mb-2">
        <button
          onClick={onOpenLog}
          className={cn(
            "w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg",
            "bg-primary text-primary-foreground",
            "text-sm font-medium",
            "hover:bg-primary/90 transition-colors",
            "shadow-sm"
          )}
        >
          <Plus className="w-4 h-4" />
          Log Activity
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-2">
        <div className="space-y-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            const isHero = item.isHero;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isHero && isActive && "bg-primary/10 text-primary border border-primary/20",
                  isHero && !isActive && "text-foreground hover:text-primary hover:bg-primary/5",
                  !isHero && isActive && "bg-secondary text-foreground",
                  !isHero && !isActive && "text-foreground-secondary hover:text-foreground hover:bg-secondary/50"
                )}
              >
                <Icon className={cn(
                  "w-[18px] h-[18px]",
                  isHero && "text-primary"
                )} />
                <span className="flex-1 text-left">{item.label}</span>

                {/* Circle: show contact count + health indicator */}
                {isHero && totalContacts > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-foreground-muted">{totalContacts}</span>
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: networkHealthColor }}
                      title={`Network: ${networkHealthStatus}`}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-border space-y-1">
        <button
          onClick={() => onTabChange('settings')}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            currentTab === 'settings'
              ? "bg-secondary text-foreground"
              : "text-foreground-secondary hover:text-foreground hover:bg-secondary/50"
          )}
        >
          <Settings className="w-[18px] h-[18px]" />
          Settings
        </button>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground-secondary hover:text-foreground hover:bg-secondary/50 transition-colors"
        >
          <LogOut className="w-[18px] h-[18px]" />
          Sign out
        </button>
      </div>
    </aside>
  );
};

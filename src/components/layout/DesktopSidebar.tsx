import { Users, BookUser, Settings, LogOut, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import type { TabId } from './BottomNav';

interface DesktopSidebarProps {
  currentTab: TabId;
  onTabChange: (tab: TabId) => void;
  onOpenLog: () => void;
}

const mainNavItems: { id: TabId; label: string; icon: typeof Users }[] = [
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'contacts', label: 'Circle', icon: BookUser },
];

export const DesktopSidebar = ({ currentTab, onTabChange, onOpenLog }: DesktopSidebarProps) => {
  const { signOut } = useAuth();

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

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-foreground-secondary hover:text-foreground hover:bg-secondary/50"
                )}
              >
                <Icon className="w-[18px] h-[18px]" />
                {item.label}
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

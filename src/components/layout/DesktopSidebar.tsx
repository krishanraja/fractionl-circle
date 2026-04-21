import { useState, useMemo } from 'react';
import { Sparkles, Activity, Users, MessageCircle, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/hooks/useUserProfile';
import { ProfileSettingsSheet } from '@/components/profile/ProfileSettingsSheet';
import type { TabId } from './BottomNav';

interface DesktopSidebarProps {
  currentTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const navItems: { id: TabId; label: string; icon: typeof Sparkles; isHero?: boolean }[] = [
  { id: 'today', label: 'Today', icon: Sparkles },
  { id: 'streams', label: 'Streams', icon: Activity },
  { id: 'circle', label: 'Circle', icon: Users, isHero: true },
  { id: 'ask', label: 'Ask', icon: MessageCircle },
];

export const DesktopSidebar = ({ currentTab, onTabChange }: DesktopSidebarProps) => {
  const { profile } = useUserProfile();
  const [profileOpen, setProfileOpen] = useState(false);

  const avatarInitial = useMemo(() => {
    if (!profile?.full_name) return '?';
    return profile.full_name.charAt(0).toUpperCase();
  }, [profile?.full_name]);

  const firstName = useMemo(() => {
    if (!profile?.full_name) return '';
    return profile.full_name.split(' ')[0];
  }, [profile?.full_name]);

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-background border-r border-border flex flex-col z-40">
      <div className="flex items-center h-16 px-6">
        <img
          src="/lovable-uploads/30f9efde-5245-4c24-b26e-1e368f4a5a1b.png"
          alt="Fractionl"
          className="h-6"
        />
      </div>

      <nav className="flex-1 px-3 py-2">
        <div className="space-y-1">
          {navItems.map((item) => {
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
              </button>
            );
          })}
        </div>
      </nav>

      <div className="px-3 py-4 border-t border-border">
        <button
          onClick={() => setProfileOpen(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground-secondary hover:text-foreground hover:bg-secondary/50 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="text-[11px] font-semibold text-primary-foreground">
              {avatarInitial}
            </span>
          </div>
          <span className="flex-1 text-left truncate">{firstName || 'Profile'}</span>
          <Settings className="w-4 h-4 text-foreground-muted" />
        </button>
      </div>

      <ProfileSettingsSheet open={profileOpen} onOpenChange={setProfileOpen} />
    </aside>
  );
};

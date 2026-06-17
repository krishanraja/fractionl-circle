import { ReactNode, useMemo, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserProfile } from '@/hooks/useUserProfile';
import { cn } from '@/lib/utils';
import { ProfileSettingsSheet } from '@/components/profile/ProfileSettingsSheet';
import type { TabId } from './BottomNav';

interface PageHeaderProps {
  title?: string;
  actions?: ReactNode;
  currentTab?: TabId;
  onTabChange?: (tab: TabId) => void;
}

export const PageHeader = ({
  title,
  actions,
  currentTab,
  onTabChange: _onTabChange,
}: PageHeaderProps) => {
  const isMobile = useIsMobile();
  const { profile } = useUserProfile();
  const [profileOpen, setProfileOpen] = useState(false);

  const avatarInitial = useMemo(() => {
    if (!profile?.full_name) return '?';
    return profile.full_name.charAt(0).toUpperCase();
  }, [profile?.full_name]);

  const isCircle = currentTab === 'circle';

  if (isMobile) {
    return (
      <header
        className={cn(
          "shrink-0 z-40",
          "bg-background/95 backdrop-blur-xl",
          "shadow-sm",
          "frame-safe-top",
          isCircle && "circle-hero-bg"
        )}
      >
        <div className="flex items-center justify-between px-4 h-14">
          <img
            src="/brand/fractionl-wordmark.png"
            alt="Fractionl"
            className="h-6"
          />

          <div className="flex items-center gap-2">
            {actions}
            <button
              onClick={() => setProfileOpen(true)}
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center transition-transform active:scale-95"
              aria-label="Open profile and settings"
            >
              <span className="text-xs font-semibold text-primary-foreground">
                {avatarInitial}
              </span>
            </button>
          </div>
        </div>

        <ProfileSettingsSheet open={profileOpen} onOpenChange={setProfileOpen} />
      </header>
    );
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40",
        "bg-background/95 backdrop-blur-xl",
        "border-b border-border",
        "safe-top"
      )}
    >
      <div className="flex items-center justify-between h-14 px-4">
        <img
          src="/brand/fractionl-wordmark.png"
          alt="Fractionl"
          className="h-6"
        />

        {title && (
          <h1 className="text-title-3 text-foreground">{title}</h1>
        )}

        <div className="flex items-center gap-2">
          {actions}
          <button
            onClick={() => setProfileOpen(true)}
            className="w-9 h-9 rounded-full bg-primary flex items-center justify-center transition-transform active:scale-95 hover:opacity-90"
            aria-label="Open profile and settings"
          >
            <span className="text-xs font-semibold text-primary-foreground">
              {avatarInitial}
            </span>
          </button>
        </div>
      </div>

      <ProfileSettingsSheet open={profileOpen} onOpenChange={setProfileOpen} />
    </header>
  );
};

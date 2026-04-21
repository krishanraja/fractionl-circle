import { ReactNode, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserProfile } from '@/hooks/useUserProfile';
import { cn } from '@/lib/utils';
import { getGreeting } from '@/utils/greeting';
import { ProfileSettingsSheet } from '@/components/profile/ProfileSettingsSheet';
import type { TabId } from './BottomNav';

interface PageHeaderProps {
  title?: string;
  actions?: ReactNode;
  currentTab?: TabId;
  onTabChange?: (tab: TabId) => void;
}

const tabConfig: Record<TabId, { title: string; gradient?: boolean }> = {
  today: { title: '' },
  streams: { title: 'Streams' },
  circle: { title: 'Circle', gradient: true },
  ask: { title: 'Ask' },
};

export const PageHeader = ({
  title,
  actions,
  currentTab,
  onTabChange: _onTabChange,
}: PageHeaderProps) => {
  const isMobile = useIsMobile();
  const { profile } = useUserProfile();
  const [profileOpen, setProfileOpen] = useState(false);

  const firstName = useMemo(() => {
    if (!profile?.full_name) return '';
    return profile.full_name.split(' ')[0];
  }, [profile?.full_name]);

  const avatarInitial = useMemo(() => {
    if (!profile?.full_name) return '?';
    return profile.full_name.charAt(0).toUpperCase();
  }, [profile?.full_name]);

  const config = tabConfig[currentTab || 'today'];
  const isCircle = currentTab === 'circle';

  if (isMobile) {
    return (
      <header
        className={cn(
          "sticky top-0 z-40",
          "bg-background/95 backdrop-blur-xl",
          "shadow-sm",
          "safe-top",
          isCircle && "circle-hero-bg"
        )}
      >
        <div className="flex items-center justify-between px-4 h-14">
          <img
            src="/lovable-uploads/30f9efde-5245-4c24-b26e-1e368f4a5a1b.png"
            alt="Fractionl"
            className="h-6"
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2"
            >
              {config.title ? (
                <div className="flex items-center gap-1.5">
                  {isCircle && (
                    <Users className="w-4 h-4 text-primary" strokeWidth={2} />
                  )}
                  <span className={cn(
                    "text-[15px] font-display font-semibold tracking-tight",
                    config.gradient ? "text-gradient" : "text-foreground"
                  )}>
                    {config.title}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-foreground-secondary tracking-tight">
                  {firstName ? `${getGreeting()}, ${firstName}` : getGreeting()}
                </p>
              )}
            </motion.div>
          </AnimatePresence>

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
          src="/lovable-uploads/30f9efde-5245-4c24-b26e-1e368f4a5a1b.png"
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

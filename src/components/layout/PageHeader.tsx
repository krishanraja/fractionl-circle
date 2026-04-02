import { ReactNode, useMemo } from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserProfile } from '@/hooks/useUserProfile';
import { cn } from '@/lib/utils';
import type { TabId } from './BottomNav';

interface PageHeaderProps {
  title?: string;
  actions?: ReactNode;
  currentTab?: TabId;
  onTabChange?: (tab: TabId) => void;
}

const desktopNavItems: { id: TabId; label: string }[] = [
  { id: 'customers', label: 'Customers' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'settings', label: 'Settings' },
];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export const PageHeader = ({
  title,
  actions,
  onTabChange,
}: PageHeaderProps) => {
  const { signOut } = useAuth();
  const isMobile = useIsMobile();
  const { profile } = useUserProfile();

  const firstName = useMemo(() => {
    if (!profile?.full_name) return '';
    return profile.full_name.split(' ')[0];
  }, [profile?.full_name]);

  const avatarInitial = useMemo(() => {
    if (!profile?.full_name) return '?';
    return profile.full_name.charAt(0).toUpperCase();
  }, [profile?.full_name]);

  if (isMobile) {
    return (
      <header
        className={cn(
          "sticky top-0 z-40",
          "bg-background/95 backdrop-blur-xl",
          "shadow-sm",
          "safe-top"
        )}
      >
        <div className="flex items-center justify-between h-14 px-4">
          {/* Logo */}
          <img
            src="/lovable-uploads/30f9efde-5245-4c24-b26e-1e368f4a5a1b.png"
            alt="Fractionl"
            className="h-6"
          />

          {/* Contextual Greeting */}
          <p className="text-sm font-normal text-foreground-secondary tracking-tight">
            {firstName ? `${getGreeting()}, ${firstName}` : getGreeting()}
          </p>

          {/* Avatar Initial */}
          <div className="flex items-center gap-2">
            {actions}
            <div
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center"
              aria-label="User avatar"
            >
              <span className="text-xs font-semibold text-primary-foreground">
                {avatarInitial}
              </span>
            </div>
          </div>
        </div>
      </header>
    );
  }

  // Desktop header
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
        {/* Logo */}
        <img
          src="/lovable-uploads/30f9efde-5245-4c24-b26e-1e368f4a5a1b.png"
          alt="Fractionl"
          className="h-6"
        />

        {/* Title (optional) */}
        {title && (
          <h1 className="text-title-3 text-foreground">{title}</h1>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {actions}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onTabChange?.('settings')}
            className="w-10 h-10"
          >
            <LogOut className="w-5 h-5 text-foreground-secondary" />
          </Button>
        </div>
      </div>
    </header>
  );
};

import { ReactNode } from 'react';
import { Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import type { TabId } from './BottomNav';

interface PageHeaderProps {
  title?: string;
  actions?: ReactNode;
  currentTab?: TabId;
  onTabChange?: (tab: TabId) => void;
}

const desktopNavItems: { id: TabId; label: string }[] = [
  { id: 'pulse', label: 'Pulse' },
  { id: 'log', label: 'Log Activity' },
  { id: 'network', label: 'Network' },
  { id: 'history', label: 'History' },
  { id: 'settings', label: 'Settings' },
];

export const PageHeader = ({ 
  title, 
  actions,
  currentTab,
  onTabChange,
}: PageHeaderProps) => {
  const { signOut } = useAuth();
  const isMobile = useIsMobile();

  if (isMobile) {
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
              <Settings className="w-5 h-5 text-foreground-secondary" />
            </Button>
          </div>
        </div>
      </header>
    );
  }

  // Desktop header
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
      <div className="container-width">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-10">
            <img 
              src="/lovable-uploads/30f9efde-5245-4c24-b26e-1e368f4a5a1b.png" 
              alt="Fractionl" 
              className="h-7"
            />
            
            {/* Desktop Navigation */}
            <nav className="flex items-center gap-1">
              {desktopNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onTabChange?.(item.id)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                    currentTab === item.id 
                      ? "bg-primary text-primary-foreground" 
                      : "text-foreground-secondary hover:text-foreground hover:bg-secondary"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
          
          {/* Right side */}
          <div className="flex items-center gap-3">
            {actions}
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-foreground-secondary hover:text-foreground"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

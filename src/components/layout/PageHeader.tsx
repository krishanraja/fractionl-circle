import { ReactNode } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
  onTabChange,
}: PageHeaderProps) => {
  // Mobile-only header (desktop uses DesktopSidebar)
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
};

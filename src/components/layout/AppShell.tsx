import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomNav, type TabId } from './BottomNav';
import { PageHeader } from './PageHeader';
import { DesktopSidebar } from './DesktopSidebar';
import { VoiceCommandBar } from '@/components/voice/VoiceCommandBar';
import { TrialBanner } from '@/components/billing/SubscriptionBadge';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { pageTransition } from '@/constants/animation';

interface AppShellProps {
  children: ReactNode;
  currentTab: TabId;
  onTabChange: (tab: TabId) => void;
  onOpenLog: () => void;
  title?: string;
  showHeader?: boolean;
  headerActions?: ReactNode;
}

export const AppShell = ({
  children,
  currentTab,
  onTabChange,
  onOpenLog,
  title,
  showHeader = true,
  headerActions,
}: AppShellProps) => {
  const isMobile = useIsMobile();

  const handleVoiceNavigate = (tab: string) => {
    const validTabs: TabId[] = ['customers', 'contacts', 'settings'];
    if (validTabs.includes(tab as TabId)) {
      onTabChange(tab as TabId);
    }
  };

  return (
    <div className={cn(
      "min-h-screen bg-background flex flex-col",
      isMobile && "has-bottom-nav",
      !isMobile && "pl-60" // offset for desktop sidebar
    )}>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <DesktopSidebar
          currentTab={currentTab}
          onTabChange={onTabChange}
          onOpenLog={onOpenLog}
        />
      )}

      {/* Trial Banner */}
      <TrialBanner onUpgrade={() => onTabChange('settings')} />

      {/* Mobile Header */}
      {isMobile && showHeader && (
        <PageHeader
          title={title}
          actions={headerActions}
          currentTab={currentTab}
          onTabChange={onTabChange}
        />
      )}

      {/* Main Content */}
      <main className={cn(
        "flex-1 overflow-hidden",
        !isMobile && "max-w-4xl w-full mx-auto"
      )}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={pageTransition.initial}
            animate={pageTransition.animate}
            exit={pageTransition.exit}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation (Mobile Only) */}
      {isMobile && (
        <BottomNav
          currentTab={currentTab}
          onTabChange={onTabChange}
        />
      )}

      {/* Floating Voice Command Bar */}
      <VoiceCommandBar onNavigate={handleVoiceNavigate} currentTab={currentTab} />
    </div>
  );
};

import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomNav, type TabId } from './BottomNav';
import { PageHeader } from './PageHeader';
import { DesktopSidebar } from './DesktopSidebar';
import { VoiceCommandBar } from '@/components/voice/VoiceCommandBar';
import { TrialBanner } from '@/components/billing/SubscriptionBadge';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

// Tab index for directional transitions
const TAB_ORDER: Record<TabId, number> = {
  customers: 0,
  contacts: 1,
  activity: 2,
  settings: 3,
};

interface AppShellProps {
  children: ReactNode;
  currentTab: TabId;
  onTabChange: (tab: TabId) => void;
  onOpenLog: () => void;
  onSetReminder?: (prefill?: { title?: string; clientId?: string }) => void;
  onShowPricing?: () => void;
  title?: string;
  showHeader?: boolean;
  headerActions?: ReactNode;
}

export const AppShell = ({
  children,
  currentTab,
  onTabChange,
  onOpenLog,
  onSetReminder,
  onShowPricing,
  title,
  showHeader = true,
  headerActions,
}: AppShellProps) => {
  const isMobile = useIsMobile();

  const handleVoiceNavigate = (tab: string) => {
    const mapped = tab === 'circle' ? 'contacts' : tab;
    const validTabs: TabId[] = ['customers', 'contacts', 'activity', 'settings'];
    if (validTabs.includes(mapped as TabId)) {
      onTabChange(mapped as TabId);
    }
  };

  // Directional page transition based on tab position
  const tabIndex = TAB_ORDER[currentTab] ?? 1;

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
      <TrialBanner onUpgrade={() => {
        onTabChange('settings');
        onShowPricing?.();
      }} />

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
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{
              opacity: 1,
              x: 0,
              transition: { duration: 0.22, ease: [0, 0, 0.2, 1] }
            }}
            exit={{
              opacity: 0,
              x: -20,
              transition: { duration: 0.12, ease: [0.4, 0, 1, 1] }
            }}
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
          onOpenLog={onOpenLog}
        />
      )}

      {/* Floating Voice Command Bar (hidden on contacts tab where ContactFABMenu provides its own) */}
      <VoiceCommandBar onNavigate={handleVoiceNavigate} onOpenLog={onOpenLog} onSetReminder={onSetReminder} currentTab={currentTab} hidden={currentTab === 'contacts'} />
    </div>
  );
};

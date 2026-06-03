import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomNav, type TabId } from './BottomNav';
import { PageHeader } from './PageHeader';
import { DesktopSidebar } from './DesktopSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const TAB_ORDER: Record<TabId, number> = {
  today: 0,
  streams: 1,
  circle: 2,
  ask: 3,
};

interface AppShellProps {
  children: ReactNode;
  currentTab: TabId;
  onTabChange: (tab: TabId) => void;
  title?: string;
  showHeader?: boolean;
  headerActions?: ReactNode;
}

export const AppShell = ({
  children,
  currentTab,
  onTabChange,
  title,
  showHeader = true,
  headerActions,
}: AppShellProps) => {
  const isMobile = useIsMobile();

  // keep the directional animation even if TAB_ORDER isn't consumed yet
  void TAB_ORDER[currentTab];

  return (
    <div className={cn(
      "min-h-screen bg-background flex flex-col",
      isMobile && "has-bottom-nav",
      !isMobile && "pl-60"
    )}>
      {!isMobile && (
        <DesktopSidebar
          currentTab={currentTab}
          onTabChange={onTabChange}
        />
      )}

      {isMobile && showHeader && (
        <PageHeader
          title={title}
          actions={headerActions}
          currentTab={currentTab}
          onTabChange={onTabChange}
        />
      )}

      <main className={cn(
        "flex-1 overflow-hidden",
        !isMobile && "max-w-5xl w-full mx-auto"
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

      {isMobile && (
        <BottomNav
          currentTab={currentTab}
          onTabChange={onTabChange}
        />
      )}
    </div>
  );
};

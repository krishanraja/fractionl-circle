import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomNav, type TabId } from './BottomNav';
import { PageHeader } from './PageHeader';
import { DesktopSidebar } from './DesktopSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAppFrame } from '@/hooks/useAppFrame';
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

  // On mobile the whole shell is a locked, zero-scroll frame: header, the tab
  // body, and the bottom nav are in-flow flex children that exactly fill the
  // measured viewport. Desktop keeps its normal scrolling document.
  useAppFrame(isMobile);

  // keep the directional animation even if TAB_ORDER isn't consumed yet
  void TAB_ORDER[currentTab];

  return (
    <div className={cn(
      "bg-background flex flex-col",
      isMobile ? "app-frame" : "min-h-screen pl-60"
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
        isMobile && "min-h-0",
        !isMobile && "w-full mx-auto 2xl:max-w-[100rem]"
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

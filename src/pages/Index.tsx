import { useState } from 'react';
import { AppShell } from '@/components/layout';
import { PulseScreen, LogScreen, SettingsScreen, NetworkScreen } from '@/components/screens';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import type { TabId } from '@/components/layout/BottomNav';

const Index = () => {
  const [currentTab, setCurrentTab] = useState<TabId>('customers');
  const [showLogActivity, setShowLogActivity] = useState(false);
  const isMobile = useIsMobile();

  const renderScreen = () => {
    switch (currentTab) {
      case 'customers':
        return <PulseScreen onNavigate={(tab) => setCurrentTab(tab as TabId)} onOpenLog={() => setShowLogActivity(true)} />;
      case 'contacts':
        return <NetworkScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <PulseScreen onNavigate={(tab) => setCurrentTab(tab as TabId)} onOpenLog={() => setShowLogActivity(true)} />;
    }
  };

  const tabTitle = currentTab.charAt(0).toUpperCase() + currentTab.slice(1);

  return (
    <>
      <AppShell
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenLog={() => setShowLogActivity(true)}
        title={tabTitle}
      >
        {renderScreen()}
      </AppShell>

      {/* Log Activity Modal/Drawer */}
      {isMobile ? (
        <Drawer open={showLogActivity} onOpenChange={setShowLogActivity}>
          <DrawerContent className="max-h-[92vh]">
            <div className="overflow-y-auto pb-safe-bottom">
              <LogScreen onClose={() => setShowLogActivity(false)} />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={showLogActivity} onOpenChange={setShowLogActivity}>
          <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
            <LogScreen onClose={() => setShowLogActivity(false)} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default Index;

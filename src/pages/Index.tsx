import { useState, useEffect, lazy, Suspense } from 'react';
import { AppShell } from '@/components/layout';
import { PulseScreen, LogScreen } from '@/components/screens';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { ReminderSheet } from '@/components/reminders/ReminderSheet';
import { PageLoader } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import type { TabId } from '@/components/layout/BottomNav';

// Lazy-load non-primary screens for code splitting
const CircleScreen = lazy(() => import('@/components/screens/NetworkScreen').then(m => ({ default: m.CircleScreen })));
const SettingsScreen = lazy(() => import('@/components/screens/SettingsScreen').then(m => ({ default: m.SettingsScreen })));

const Index = () => {
  const [currentTab, setCurrentTab] = useState<TabId>('customers');
  const [showLogActivity, setShowLogActivity] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [reminderPrefill, setReminderPrefill] = useState<{ title?: string; clientId?: string } | undefined>();
  const [openPricingOnSettings, setOpenPricingOnSettings] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get('checkout');
    if (checkoutStatus === 'success') {
      toast.success('Welcome to your new plan! Your subscription is now active.');
      params.delete('checkout');
      window.history.replaceState({}, '', `${window.location.pathname}${params.toString() ? `?${params}` : ''}`);
    } else if (checkoutStatus === 'canceled') {
      toast.info('Checkout was canceled. You can upgrade anytime from Settings.');
      params.delete('checkout');
      window.history.replaceState({}, '', `${window.location.pathname}${params.toString() ? `?${params}` : ''}`);
    }
  }, []);

  const renderScreen = () => {
    switch (currentTab) {
      case 'customers':
        return <PulseScreen onNavigate={(tab) => setCurrentTab(tab as TabId)} onOpenLog={() => setShowLogActivity(true)} />;
      case 'contacts':
        return (
          <Suspense fallback={<PageLoader message="Loading contacts..." />}>
            <CircleScreen />
          </Suspense>
        );
      case 'settings':
        return (
          <Suspense fallback={<PageLoader message="Loading settings..." />}>
            <SettingsScreen initialShowPricing={openPricingOnSettings} onPricingShown={() => setOpenPricingOnSettings(false)} />
          </Suspense>
        );
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
        onSetReminder={(prefill) => { setReminderPrefill(prefill); setShowReminder(true); }}
        onShowPricing={() => setOpenPricingOnSettings(true)}
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

      {/* Reminder Sheet */}
      <ReminderSheet
        open={showReminder}
        onOpenChange={setShowReminder}
        prefill={reminderPrefill}
      />
    </>
  );
};

export default Index;

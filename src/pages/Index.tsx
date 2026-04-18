import { useState, useEffect, lazy, Suspense } from 'react';
import { AppShell } from '@/components/layout';
import { TodayScreen } from '@/components/screens';
import { PageLoader } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import type { TabId } from '@/components/layout/BottomNav';

const StreamsScreen = lazy(() => import('@/components/screens/StreamsScreen').then(m => ({ default: m.StreamsScreen })));
const CircleScreen = lazy(() => import('@/components/screens/CircleScreen').then(m => ({ default: m.CircleScreen })));
const AskScreen = lazy(() => import('@/components/screens/AskScreen').then(m => ({ default: m.AskScreen })));

const Index = () => {
  const [currentTab, setCurrentTab] = useState<TabId>('today');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get('checkout');
    if (checkoutStatus === 'success') {
      toast.success('Welcome to your new plan! Your subscription is now active.');
      params.delete('checkout');
      window.history.replaceState({}, '', `${window.location.pathname}${params.toString() ? `?${params}` : ''}`);
    } else if (checkoutStatus === 'canceled') {
      toast.info('Checkout was canceled.');
      params.delete('checkout');
      window.history.replaceState({}, '', `${window.location.pathname}${params.toString() ? `?${params}` : ''}`);
    }
  }, []);

  const renderScreen = () => {
    switch (currentTab) {
      case 'today':
        return <TodayScreen />;
      case 'streams':
        return (
          <Suspense fallback={<PageLoader message="Loading Streams..." />}>
            <StreamsScreen />
          </Suspense>
        );
      case 'circle':
        return (
          <Suspense fallback={<PageLoader message="Loading Circle..." />}>
            <CircleScreen />
          </Suspense>
        );
      case 'ask':
        return (
          <Suspense fallback={<PageLoader message="Loading Ask..." />}>
            <AskScreen />
          </Suspense>
        );
      default:
        return <TodayScreen />;
    }
  };

  return (
    <AppShell currentTab={currentTab} onTabChange={setCurrentTab}>
      {renderScreen()}
    </AppShell>
  );
};

export default Index;

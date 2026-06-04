import { useState, useEffect, lazy, Suspense } from 'react';
import { AppShell } from '@/components/layout';
import { TodayScreen } from '@/components/screens';
import { PageLoader } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { TabId } from '@/components/layout/BottomNav';
import { haptics } from '@/utils/haptics';

// Dispatched after an OAuth-driven sync completes so listening screens
// (CircleScreen) can refresh data without a full reload.
export const CIRCLE_DATA_CHANGED = 'circle-data-changed';

// Optional intent carried when navigating to the Circle tab, so a CTA elsewhere
// (e.g. the Today "who'd buy it?" hero) can land the user straight in the right
// add flow: 'import' opens the source/LinkedIn sheet, 'add' opens quick-add.
export type CircleIntent = 'import' | 'add';

const StreamsScreen = lazy(() => import('@/components/screens/StreamsScreen').then(m => ({ default: m.StreamsScreen })));
const CircleScreen = lazy(() => import('@/components/screens/CircleScreen').then(m => ({ default: m.CircleScreen })));
const AskScreen = lazy(() => import('@/components/screens/AskScreen').then(m => ({ default: m.AskScreen })));

const Index = () => {
  const [currentTab, setCurrentTab] = useState<TabId>('today');
  const [circleIntent, setCircleIntent] = useState<CircleIntent | null>(null);

  // Tab navigation that can carry an intent for the Circle tab. Other tabs
  // ignore the intent. Used by Today's diagnosis hero to deep-link into import.
  const navigate = (tab: TabId, intent?: CircleIntent) => {
    setCurrentTab(tab);
    setCircleIntent(tab === 'circle' ? intent ?? null : null);
  };

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

    const oauth = params.get('oauth');
    const oauthStatus = params.get('status');
    if (oauth === 'google' || oauth === 'microsoft') {
      const reason = params.get('reason') ?? 'unknown';
      params.delete('oauth');
      params.delete('status');
      params.delete('reason');
      window.history.replaceState({}, '', `${window.location.pathname}${params.toString() ? `?${params}` : ''}`);

      const providerLabel = oauth === 'google' ? 'Google' : 'Microsoft';
      const fnName = oauth === 'google' ? 'sync-google' : 'sync-microsoft';

      if (oauthStatus === 'ok') {
        setCurrentTab('circle');
        const run = toast.loading(`${providerLabel} connected. Importing contacts + calendar…`);
        supabase.functions.invoke(fnName, { body: {} })
          .then(({ data, error }) => {
            if (error) throw error;
            const payload = data as {
              circle_new?: number;
              circle_merged?: number;
              signals_inserted?: number;
            } | null;
            const bits: string[] = [];
            if (payload?.circle_new) bits.push(`${payload.circle_new} new`);
            if (payload?.circle_merged) bits.push(`${payload.circle_merged} merged`);
            if (payload?.signals_inserted) bits.push(`${payload.signals_inserted} meeting signals`);
            haptics.success();
            toast.success(bits.length ? bits.join(' · ') : `${providerLabel} sync complete.`, { id: run });
            window.dispatchEvent(new CustomEvent(CIRCLE_DATA_CHANGED));
          })
          .catch((e) => {
            haptics.error();
            toast.error(e instanceof Error ? e.message : `${providerLabel} sync failed`, { id: run });
          });
      } else {
        haptics.error();
        toast.error(`${providerLabel} connection failed: ${reason}`);
      }
    }
  }, []);

  const renderScreen = () => {
    switch (currentTab) {
      case 'today':
        return <TodayScreen onNavigate={navigate} />;
      case 'streams':
        return (
          <Suspense fallback={<PageLoader message="Loading Streams..." />}>
            <StreamsScreen />
          </Suspense>
        );
      case 'circle':
        return (
          <Suspense fallback={<PageLoader message="Loading Circle..." />}>
            <CircleScreen
              initialAction={circleIntent}
              onActionConsumed={() => setCircleIntent(null)}
            />
          </Suspense>
        );
      case 'ask':
        return (
          <Suspense fallback={<PageLoader message="Loading Ask..." />}>
            <AskScreen onNavigate={navigate} />
          </Suspense>
        );
      default:
        return <TodayScreen onNavigate={navigate} />;
    }
  };

  return (
    <AppShell currentTab={currentTab} onTabChange={(tab) => navigate(tab)}>
      {renderScreen()}
    </AppShell>
  );
};

export default Index;

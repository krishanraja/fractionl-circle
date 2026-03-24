import { useState } from 'react';
import { AppShell } from '@/components/layout';
import { PulseScreen, LogScreen, HistoryScreen, SettingsScreen, NetworkScreen } from '@/components/screens';
import type { TabId } from '@/components/layout/BottomNav';

const Index = () => {
  const [currentTab, setCurrentTab] = useState<TabId>('pulse');

  const renderScreen = () => {
    switch (currentTab) {
      case 'pulse':
        return <PulseScreen onNavigate={(tab) => setCurrentTab(tab as TabId)} />;
      case 'log':
        return <LogScreen />;
      case 'history':
        return <HistoryScreen />;
      case 'network':
        return <NetworkScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <PulseScreen onNavigate={(tab) => setCurrentTab(tab as TabId)} />;
    }
  };

  return (
    <AppShell
      currentTab={currentTab}
      onTabChange={setCurrentTab}
      title={currentTab.charAt(0).toUpperCase() + currentTab.slice(1)}
    >
      {renderScreen()}
    </AppShell>
  );
};

export default Index;

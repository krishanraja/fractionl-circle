import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  TrendingUp, TrendingDown, Target, LogOut, BarChart3, Brain,
  Settings, Layers, Calendar, Users, ChevronLeft, ChevronRight,
  Search, Command
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AIStrategyHub } from './AIStrategyHub';
import { RevenueGoalsSetting } from './RevenueGoalsSetting';
import { BusinessDevelopmentGoals } from './BusinessDevelopmentGoals';
import { CurrentStateTracking } from './CurrentStateTracking';
import { CostTracker, Cost } from './CostTracker';
import { MotivationalHeader } from './MotivationalHeader';
import { PipelineContent } from './PipelineContent';
import { GoogleSheetsIntegration } from './GoogleSheetsIntegration';
import { CustomerToolAnalytics } from './CustomerToolAnalytics';
import { MorningBriefing } from './ai/MorningBriefing';
import { PricingPage } from './billing/PricingPage';
import { SubscriptionBadge } from './billing/SubscriptionBadge';
import { TrialBanner } from './billing/SubscriptionBadge';
import { MobileBottomNav, MobileHeader } from './navigation';
import { useTrackingData } from '@/hooks/useTrackingData';
import { useCustomerAnalytics } from '@/hooks/useCustomerAnalytics';
import { useSubscription } from '@/hooks/useSubscription';
import { useIsMobile } from '@/hooks/use-mobile';
import { generateFutureMonths } from '@/utils/monthUtils';
import { cn } from '@/lib/utils';
import { haptics } from '@/utils/haptics';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';

type DashboardView = 'pipeline' | 'planning' | 'ai-strategy' | 'sheets' | 'customer-analytics' | 'pricing';

const sidebarNavItems = [
  { id: 'pipeline' as const, label: 'Pipeline', icon: Layers },
  { id: 'planning' as const, label: 'Planning', icon: Target },
  { id: 'ai-strategy' as const, label: 'AI Strategy', icon: Brain },
  { id: 'customer-analytics' as const, label: 'Analytics', icon: BarChart3 },
  { id: 'sheets' as const, label: 'Integrations', icon: Settings },
];

export const Dashboard = () => {
  const { signOut } = useAuth();
  const isMobile = useIsMobile();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [costs, setCosts] = useState<Record<string, Cost[]>>({});
  const [dashboardView, setDashboardView] = useState<DashboardView>('pipeline');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const { isTrialing } = useSubscription();

  const availableMonths = generateFutureMonths();

  const {
    monthlyGoals,
    monthlySnapshots,
    dailyProgress,
    todaysProgress,
    overallScore,
    loading,
    updateMonthlyGoals,
    updateMonthlySnapshots,
  } = useTrackingData(selectedMonth);
  const { toolAnalytics, leadInsights, loading: analyticsLoading } = useCustomerAnalytics(selectedMonth);

  // Cmd+K handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const updateCosts = (newCosts: Cost[]) => {
    setCosts(prev => ({ ...prev, [selectedMonth]: newCosts }));
  };

  const currentCosts = costs[selectedMonth] || [];
  const totalCosts = currentCosts.reduce((sum, cost) => sum + cost.amount, 0);
  const netProfit = (monthlyGoals?.revenue_forecast || 0) - totalCosts;
  const profitMargin = (monthlyGoals?.revenue_forecast || 0) > 0 ? (netProfit / (monthlyGoals?.revenue_forecast || 1)) * 100 : 0;

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const formatMonthLong = (month: string) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const handleShowPricing = () => {
    setDashboardView('pricing');
    haptics.light();
  };

  return (
    <div className={cn("min-h-screen bg-background", isMobile && "has-bottom-nav")}>
      {/* Trial Banner */}
      <TrialBanner onUpgrade={handleShowPricing} />

      {isMobile ? (
        <>
          <MobileHeader
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            availableMonths={availableMonths}
            formatMonth={formatMonth}
            onSignOut={signOut}
          />
        </>
      ) : (
        /* Desktop: Sidebar + Top bar layout */
        <div className="flex h-screen">
          {/* Sidebar */}
          <aside className={cn(
            "flex-shrink-0 border-r border-border bg-background-elevated flex flex-col transition-all duration-200",
            sidebarCollapsed ? "w-16" : "w-56"
          )}>
            {/* Logo */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-border">
              {!sidebarCollapsed && (
                <img
                  src="/lovable-uploads/30f9efde-5245-4c24-b26e-1e368f4a5a1b.png"
                  alt="Fractionl.ai"
                  className="h-6"
                />
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-foreground-muted" />
                ) : (
                  <ChevronLeft className="w-4 h-4 text-foreground-muted" />
                )}
              </button>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 py-3 px-2 space-y-1">
              {sidebarNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = dashboardView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setDashboardView(item.id); haptics.tap(); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-foreground-secondary hover:text-foreground hover:bg-secondary/50",
                      sidebarCollapsed && "justify-center px-2"
                    )}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </button>
                );
              })}
            </nav>

            {/* Bottom */}
            <div className="p-3 border-t border-border space-y-2">
              {!sidebarCollapsed && <SubscriptionBadge className="w-full justify-center" />}

              {/* Quick search hint */}
              {!sidebarCollapsed && (
                <button
                  onClick={() => setCommandOpen(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-caption text-foreground-muted hover:bg-secondary/50 transition-colors"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span className="flex-1 text-left">Search</span>
                  <kbd className="text-[10px] bg-secondary px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
                </button>
              )}

              <button
                onClick={signOut}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-caption text-foreground-muted hover:text-foreground hover:bg-secondary/50 transition-colors",
                  sidebarCollapsed && "justify-center"
                )}
              >
                <LogOut className="w-4 h-4" />
                {!sidebarCollapsed && <span>Sign out</span>}
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top bar */}
            <header className="h-16 border-b border-border flex items-center justify-between px-6 flex-shrink-0">
              <div className="flex items-center gap-4">
                <h1 className="text-title-3 text-foreground font-semibold">
                  {sidebarNavItems.find(i => i.id === dashboardView)?.label || 'Dashboard'}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-40 h-9 text-sm border-border/50 bg-secondary/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMonths.map(month => (
                      <SelectItem key={month} value={month}>
                        {formatMonthLong(month)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto">
              <div className="py-6 md:py-10">
                <div className="container-width space-y-8 md:space-y-12">

                  {/* Pipeline View */}
                  {dashboardView === 'pipeline' && !loading && (
                    <section className="animate-fade-in space-y-8">
                      {/* Morning Briefing on desktop too */}
                      <MorningBriefing className="max-w-2xl" />

                      <MotivationalHeader
                        streakData={{
                          currentStreak: dailyProgress.length,
                          bestStreak: dailyProgress.length,
                          totalDaysTracked: dailyProgress.length,
                          lastUpdated: new Date().toISOString()
                        }}
                        achievements={[]}
                        overallScore={overallScore}
                        todaysWins={3}
                        monthProgress={85}
                        motivationalMessage="Keep up the great work! Every step forward counts."
                      />
                      <PipelineContent
                        selectedMonth={selectedMonth}
                        monthlyGoals={monthlyGoals}
                      />
                    </section>
                  )}

                  {/* Planning View */}
                  {dashboardView === 'planning' && !loading && (
                    <section className="space-y-10 animate-fade-in">
                      <div className="text-center max-w-xl mx-auto">
                        <h1 className="headline-lg mb-3">Business Planning</h1>
                        <p className="text-foreground-secondary">
                          Set goals, track progress, and build your path to success.
                        </p>
                      </div>

                      <div className="space-y-8">
                        <RevenueGoalsSetting
                          goals={monthlyGoals}
                          onUpdateGoals={updateMonthlyGoals}
                          selectedMonth={selectedMonth}
                        />

                        <BusinessDevelopmentGoals
                          goals={monthlyGoals}
                          onUpdateGoals={updateMonthlyGoals}
                          selectedMonth={selectedMonth}
                        />

                        <CurrentStateTracking
                          snapshots={monthlySnapshots}
                          onUpdateSnapshots={updateMonthlySnapshots}
                          selectedMonth={selectedMonth}
                        />

                        {/* Financial Overview */}
                        <div className="space-y-4">
                          <h2 className="headline-md text-center">Financial Overview</h2>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="hover-lift">
                              <CardHeader className="pb-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10">
                                    <Target className="w-5 h-5 text-primary" />
                                  </div>
                                  <CardTitle className="text-base font-medium">Revenue Target</CardTitle>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="text-2xl font-bold text-foreground">
                                  ${(monthlyGoals?.revenue_forecast || 0).toLocaleString()}
                                </div>
                                <p className="text-sm text-foreground-muted">Monthly goal</p>
                              </CardContent>
                            </Card>

                            <Card className="hover-lift">
                              <CardHeader className="pb-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-warning/10">
                                    <TrendingDown className="w-5 h-5 text-warning" />
                                  </div>
                                  <CardTitle className="text-base font-medium">Cost Budget</CardTitle>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="text-2xl font-bold text-foreground">
                                  ${(monthlyGoals?.cost_budget || 0).toLocaleString()}
                                </div>
                                <p className="text-sm text-foreground-muted">Monthly budget</p>
                              </CardContent>
                            </Card>

                            <Card className="hover-lift">
                              <CardHeader className="pb-2">
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center",
                                    netProfit >= 0 ? "bg-success/10" : "bg-destructive/10"
                                  )}>
                                    {netProfit >= 0 ? (
                                      <TrendingUp className="w-5 h-5 text-success" />
                                    ) : (
                                      <TrendingDown className="w-5 h-5 text-destructive" />
                                    )}
                                  </div>
                                  <CardTitle className="text-base font-medium">Net Profit</CardTitle>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className={cn(
                                  "text-2xl font-bold",
                                  netProfit >= 0 ? "text-success" : "text-destructive"
                                )}>
                                  ${netProfit.toLocaleString()}
                                </div>
                                <p className="text-sm text-foreground-muted">
                                  {profitMargin.toFixed(1)}% margin
                                </p>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* AI Strategy View */}
                  {dashboardView === 'ai-strategy' && (
                    <section className="animate-fade-in">
                      <AIStrategyHub
                        currentMetrics={{
                          currentGoals: {
                            month: selectedMonth,
                            grossRevenue: monthlyGoals?.revenue_forecast || 0,
                            totalCosts: monthlyGoals?.cost_budget || 0,
                            siteVisits: monthlySnapshots?.site_visits || 0,
                            socialFollowers: monthlySnapshots?.social_followers || 0,
                            prArticles: monthlyGoals?.pr_target || 0,
                            workshopCustomers: monthlyGoals?.workshops_target || 0,
                            advisoryCustomers: monthlyGoals?.advisory_target || 0
                          },
                          todaysActuals: {
                            date: new Date().toISOString().split('T')[0],
                            month: selectedMonth,
                            grossRevenue: 0,
                            totalCosts: 0,
                            siteVisits: monthlySnapshots?.site_visits || 0,
                            socialFollowers: monthlySnapshots?.social_followers || 0,
                            prArticles: todaysProgress?.pr_progress || 0,
                            workshopCustomers: todaysProgress?.workshops_progress || 0,
                            advisoryCustomers: todaysProgress?.advisory_progress || 0
                          },
                          overallScore,
                          monthProgress: 85,
                          totalCosts,
                          netProfit,
                          profitMargin
                        }}
                        monthlyGoals={{
                          month: selectedMonth,
                          grossRevenue: monthlyGoals?.revenue_forecast || 0,
                          totalCosts: monthlyGoals?.cost_budget || 0,
                          siteVisits: monthlySnapshots?.site_visits || 0,
                          socialFollowers: monthlySnapshots?.social_followers || 0,
                          prArticles: monthlyGoals?.pr_target || 0,
                          workshopCustomers: monthlyGoals?.workshops_target || 0,
                          advisoryCustomers: monthlyGoals?.advisory_target || 0
                        }}
                      />
                    </section>
                  )}

                  {/* Integrations/Settings View */}
                  {dashboardView === 'sheets' && (
                    <section className="animate-fade-in">
                      <div className="text-center mb-8 max-w-xl mx-auto">
                        <h1 className="headline-lg mb-3">Data Integration</h1>
                        <p className="text-foreground-secondary">
                          Sync your business data with Google Sheets for advanced analysis.
                        </p>
                      </div>
                      <GoogleSheetsIntegration selectedMonth={selectedMonth} />
                    </section>
                  )}

                  {/* Customer Analytics View */}
                  {dashboardView === 'customer-analytics' && (
                    <section className="animate-fade-in">
                      <div className="text-center mb-8 max-w-xl mx-auto">
                        <h1 className="headline-lg mb-3">Customer Analytics</h1>
                        <p className="text-foreground-secondary">
                          Monitor your customer-facing tools and track lead performance.
                        </p>
                      </div>
                      <CustomerToolAnalytics
                        toolAnalytics={toolAnalytics}
                        leadInsights={leadInsights}
                        loading={analyticsLoading}
                      />
                    </section>
                  )}

                  {/* Pricing View */}
                  {dashboardView === 'pricing' && (
                    <section className="animate-fade-in">
                      <PricingPage onClose={() => setDashboardView('pipeline')} />
                    </section>
                  )}

                  {loading && (
                    <div className="flex items-center justify-center py-20">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </div>
            </main>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <MobileBottomNav
          currentView={dashboardView === 'pricing' ? 'pipeline' : dashboardView}
          onViewChange={setDashboardView}
        />
      )}

      {/* Command Palette (Cmd+K) */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Search or jump to..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {sidebarNavItems.map((item) => (
              <CommandItem
                key={item.id}
                onSelect={() => {
                  setDashboardView(item.id);
                  setCommandOpen(false);
                  haptics.tap();
                }}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => { setDashboardView('pricing'); setCommandOpen(false); }}>
              <Target className="mr-2 h-4 w-4" />
              View Pricing & Plans
            </CommandItem>
            <CommandItem onSelect={() => { signOut(); setCommandOpen(false); }}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
};

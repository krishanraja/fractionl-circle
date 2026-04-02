import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Briefcase, ChevronRight, AlertCircle, Plus, DollarSign, ArrowRight, UserCheck, Clock, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/constants/animation';
import { usePortfolioDashboard } from '@/hooks/usePortfolioDashboard';
import { ClientSheet } from '@/components/clients/ClientSheet';
import { RevenueSheet } from '@/components/revenue/RevenueSheet';
import { MorningBriefing } from '@/components/ai/MorningBriefing';
import { AnimatedCurrency } from '@/components/ui/animated-number';
import { Sparkline } from '@/components/ui/sparkline';
import { UpgradePrompt } from '@/components/billing/UpgradePrompt';
import { useSmartNudges } from '@/hooks/useSmartNudges';
import { useSubscription } from '@/hooks/useSubscription';
import { calculateRelationshipHealth } from '@/utils/relationshipHealth';
import { haptics } from '@/utils/haptics';

interface PulseScreenProps {
  className?: string;
  onNavigate?: (tab: string) => void;
  onOpenLog?: () => void;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

const timeAgo = (dateStr: string | null) => {
  if (!dateStr) return 'No activity';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
};

export const PulseScreen = ({ className, onNavigate, onOpenLog }: PulseScreenProps) => {
  const { revenue, clients, pipeline, weeklyInsight, isLoading, error } = usePortfolioDashboard();
  const { nudges, dismiss: dismissNudge } = useSmartNudges();
  const { canUse, effectiveTier, getLimit } = useSubscription();
  const [showAddClient, setShowAddClient] = useState(false);
  const [showLogRevenue, setShowLogRevenue] = useState(false);

  const progressPercent = revenue.target > 0
    ? Math.min((revenue.current / revenue.target) * 100, 100)
    : 0;

  const revenueSparkline = Array.from({ length: 14 }, (_, i) => {
    const dayFraction = (i + 1) / 14;
    return Math.round(revenue.current * dayFraction * (0.8 + Math.random() * 0.4));
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 p-4">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-foreground-secondary text-body text-center">{error}</p>
      </div>
    );
  }

  const handleBriefingAction = (type: string) => {
    haptics.light();
    if (type === 'log') onOpenLog?.();
    if (type === 'review') { /* history is now inline */ }
    if (type === 'plan') onNavigate?.('contacts');
  };

  const clientLimit = getLimit('clients');
  const isAtClientLimit = clients.length >= clientLimit && clientLimit !== Infinity;

  // Build unified action items (max 3)
  const actionItems: Array<{ icon: typeof Clock; accentColor: string; text: string }> = [];
  const now = Date.now();
  const staleClients = clients.filter((c) => {
    if (!c.last_activity_date) return true;
    const daysSince = Math.floor((now - new Date(c.last_activity_date).getTime()) / 86400000);
    return daysSince > 7;
  });
  if (staleClients.length > 0) {
    const client = staleClients[0];
    const days = client.last_activity_date
      ? Math.floor((now - new Date(client.last_activity_date).getTime()) / 86400000)
      : null;
    actionItems.push({
      icon: UserCheck,
      accentColor: 'hsl(var(--warning))',
      text: days
        ? `Reach out to ${client.name} — ${days} days since last interaction.`
        : `Reach out to ${client.name} — no recent activity on file.`,
    });
  }
  if (pipeline.active > 0) {
    actionItems.push({
      icon: Target,
      accentColor: 'hsl(var(--primary))',
      text: `${pipeline.active} deal${pipeline.active === 1 ? '' : 's'} in pipeline worth ${formatCurrency(pipeline.totalValue)}.`,
    });
  }
  if (weeklyInsight && weeklyInsight.highlights.length > 0) {
    actionItems.push({
      icon: TrendingUp,
      accentColor: 'hsl(var(--success))',
      text: `Top win this week: ${weeklyInsight.highlights[0]}`,
    });
  }
  const visibleActions = actionItems.slice(0, 3);

  return (
    <>
      <motion.div
        className={cn("flex flex-col gap-8 px-5 pt-6 pb-28", className)}
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {/* Section A: Executive Summary */}
        <motion.div variants={staggerItem} className="space-y-5">
          <MorningBriefing onAction={handleBriefingAction} />

          {/* Revenue — compact inline */}
          <Card className="bg-background-elevated border-border/40 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-label text-foreground-muted">Revenue This Month</span>
                <button
                  onClick={() => { setShowLogRevenue(true); haptics.light(); }}
                  className="flex items-center gap-1 text-caption text-primary bg-primary/8 rounded-lg px-2.5 py-1"
                >
                  <DollarSign className="w-3 h-3" />
                  Log
                </button>
              </div>

              {isLoading ? (
                <Skeleton className="h-9 w-40" />
              ) : (
                <div className="flex items-end justify-between">
                  <div className="flex items-baseline gap-2">
                    <AnimatedCurrency
                      value={revenue.current}
                      className="text-display text-gradient"
                    />
                    {revenue.target > 0 && (
                      <span className="text-foreground-muted text-caption">
                        / {formatCurrency(revenue.target)}
                      </span>
                    )}
                  </div>
                  {revenue.current > 0 && (
                    <Sparkline
                      data={revenueSparkline}
                      width={72}
                      height={28}
                      color={revenue.trend_pct !== null && revenue.trend_pct >= 0 ? '#22c55e' : '#8B5CF6'}
                    />
                  )}
                </div>
              )}

              {!isLoading && revenue.target > 0 && (
                <div className="mt-3 space-y-1.5">
                  <Progress value={progressPercent} className="h-1.5 bg-primary-muted" />
                  <div className="flex justify-between text-caption text-foreground-muted">
                    <span>{progressPercent.toFixed(0)}% of goal</span>
                    <span>{formatCurrency(Math.max(0, revenue.target - revenue.current))} to go</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Section B: Attention Required */}
        {!isLoading && visibleActions.length > 0 && (
          <motion.div variants={staggerItem} className="space-y-3">
            <h2 className="text-label text-foreground-muted px-0.5">Attention</h2>
            <div className="space-y-2">
              {visibleActions.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-background-elevated border border-border/30 border-l-2"
                    style={{ borderLeftColor: item.accentColor }}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0 text-foreground-muted" />
                    <p className="text-caption text-foreground-secondary flex-1">{item.text}</p>
                    <ArrowRight className="w-3.5 h-3.5 text-foreground-muted flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Section C: Portfolio */}
        <motion.div variants={staggerItem} className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-label text-foreground-muted">Portfolio</h2>
            <button
              onClick={() => { setShowAddClient(true); haptics.light(); }}
              className="text-caption text-primary flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>

          {isAtClientLimit && (
            <UpgradePrompt
              feature="Unlimited Clients"
              message={`You've reached the ${clientLimit}-client limit on the free plan.`}
              compact
            />
          )}

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-[68px] w-full rounded-xl" />)}
            </div>
          ) : clients.length === 0 ? (
            <Card className="bg-background-elevated border-border border-dashed">
              <CardContent className="p-6 text-center">
                <Users className="w-7 h-7 text-foreground-muted mx-auto mb-2" />
                <p className="text-body text-foreground-secondary">No clients yet</p>
                <p className="text-caption text-foreground-muted mt-1 mb-3">Add your first client to get started</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setShowAddClient(true); haptics.light(); }}
                  className="gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Client
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {clients.map((client, index) => {
                const health = calculateRelationshipHealth({
                  last_activity_date: client.last_activity_date,
                  activity_count: client.activity_count,
                });

                return (
                  <motion.div key={client.id} variants={staggerItem} custom={index}>
                    <Card className="card-interactive">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-medium text-sm"
                              style={{ backgroundColor: client.color || '#8B5CF6' }}
                            >
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                            {canUse('relationship_health') && (
                              <div
                                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background"
                                style={{ backgroundColor: health.color }}
                                title={health.label}
                              />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="text-body-bold text-foreground truncate">{client.name}</h3>
                              <span className="text-caption text-foreground-muted flex-shrink-0 ml-2">
                                {timeAgo(client.last_activity_date)}
                              </span>
                            </div>
                            {canUse('relationship_health') && (
                              <div className="flex items-center gap-2 mt-1">
                                <div className="h-1 bg-secondary rounded-full overflow-hidden flex-1">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${client.activity_count > 0 ? Math.min(client.activity_count * 10, 100) : 4}%` }}
                                    transition={{ duration: 0.6, delay: index * 0.05 }}
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: client.color || '#8B5CF6' }}
                                  />
                                </div>
                                <span className={cn(
                                  "text-[9px] font-medium px-1.5 py-0.5 rounded",
                                  health.status === 'healthy' && "text-success bg-success/10",
                                  health.status === 'attention' && "text-warning bg-warning/10",
                                  health.status === 'at_risk' && "text-destructive bg-destructive/10",
                                )}>
                                  {health.label}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}

          {!canUse('relationship_health') && clients.length > 0 && (
            <UpgradePrompt
              feature="Relationship Health"
              message="See which clients need attention with AI-powered health scores."
              compact
            />
          )}

          {/* Pipeline — integrated into portfolio section */}
          {!isLoading && (
            <Card className="card-interactive" onClick={() => { haptics.tap(); }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary-muted flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-[18px] h-[18px] text-primary" />
                  </div>
                  <div className="flex-1">
                    {pipeline.active === 0 ? (
                      <>
                        <h3 className="text-body-bold text-foreground">No active opportunities</h3>
                        <p className="text-caption text-foreground-muted">Track your pipeline here</p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-body-bold text-foreground">
                          {pipeline.active} Active {pipeline.active === 1 ? 'Opportunity' : 'Opportunities'}
                        </h3>
                        <p className="text-caption text-foreground-muted">
                          {formatCurrency(pipeline.totalValue)} pipeline value
                        </p>
                      </>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-foreground-muted" />
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </motion.div>

      <ClientSheet open={showAddClient} onOpenChange={setShowAddClient} />
      <RevenueSheet open={showLogRevenue} onOpenChange={setShowLogRevenue} />
    </>
  );
};

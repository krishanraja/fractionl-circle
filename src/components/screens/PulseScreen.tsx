import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Briefcase, ChevronRight, Lightbulb, AlertCircle, Plus, DollarSign, ArrowRight, UserCheck, Clock, Target } from 'lucide-react';
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
import { SmartNudgeStrip } from '@/components/ai/SmartNudge';
import { AnimatedCurrency, AnimatedPercent } from '@/components/ui/animated-number';
import { Sparkline } from '@/components/ui/sparkline';
import { UpgradePrompt } from '@/components/billing/UpgradePrompt';
import { useSmartNudges } from '@/hooks/useSmartNudges';
import { useSubscription } from '@/hooks/useSubscription';
import { calculateRelationshipHealth } from '@/utils/relationshipHealth';
import { haptics } from '@/utils/haptics';
import { RecentActivity } from '@/components/activity/RecentActivity';

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
  const { revenue, clients, pipeline, isLoading, error } = usePortfolioDashboard();
  const { nudges, dismiss: dismissNudge } = useSmartNudges();
  const { canUse, effectiveTier, getLimit } = useSubscription();
  const [showAddClient, setShowAddClient] = useState(false);
  const [showLogRevenue, setShowLogRevenue] = useState(false);

  const progressPercent = revenue.target > 0
    ? Math.min((revenue.current / revenue.target) * 100, 100)
    : 0;

  // Generate mock sparkline data from revenue (daily accumulation trend)
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

  return (
    <>
      <motion.div
        className={cn("flex flex-col gap-5 p-4 pb-28", className)}
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {/* Morning Briefing - AI-First Hero */}
        <motion.div variants={staggerItem}>
          <MorningBriefing onAction={handleBriefingAction} />
        </motion.div>

        {/* Smart Nudges Strip */}
        {nudges.length > 0 && (
          <motion.div variants={staggerItem}>
            <SmartNudgeStrip nudges={nudges} onDismiss={dismissNudge} />
          </motion.div>
        )}

        {/* Revenue Hero Card */}
        <motion.div variants={staggerItem}>
          <Card className="bg-background-elevated border-border overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-caption text-foreground-secondary">Revenue This Month</span>
                <div className="flex items-center gap-2">
                  {revenue.trend_pct !== null && (
                    <div className={cn(
                      "flex items-center gap-1 text-caption-bold",
                      revenue.trend_pct >= 0 ? "text-success" : "text-destructive"
                    )}>
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>{revenue.trend_pct > 0 ? '+' : ''}{revenue.trend_pct}%</span>
                    </div>
                  )}
                  <button
                    onClick={() => { setShowLogRevenue(true); haptics.light(); }}
                    className="flex items-center gap-1 text-caption text-primary bg-primary/10 rounded-lg px-2.5 py-1 btn-haptic"
                  >
                    <DollarSign className="w-3 h-3" />
                    Log
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-48" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-end justify-between">
                    <div>
                      {revenue.target > 0 ? (
                        <>
                          <AnimatedCurrency
                            value={revenue.current}
                            className="text-display text-gradient"
                          />
                          <span className="text-foreground-muted text-title-3 ml-2">
                            / {formatCurrency(revenue.target)}
                          </span>
                        </>
                      ) : (
                        <div className="space-y-1">
                          <AnimatedCurrency
                            value={revenue.current}
                            className="text-display text-gradient"
                          />
                          {revenue.current === 0 && (
                            <p className="text-caption text-foreground-muted">
                              Tap Log to track your first entry
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Revenue sparkline */}
                    {revenue.current > 0 && (
                      <Sparkline
                        data={revenueSparkline}
                        width={80}
                        height={32}
                        color={revenue.trend_pct !== null && revenue.trend_pct >= 0 ? '#22c55e' : '#8B5CF6'}
                      />
                    )}
                  </div>

                  {revenue.target > 0 && (
                    <div className="space-y-2">
                      <Progress value={progressPercent} className="h-2.5 bg-primary-muted" />
                      <div className="flex justify-between text-caption text-foreground-secondary">
                        <span>{progressPercent.toFixed(0)}% of goal</span>
                        <span>{formatCurrency(Math.max(0, revenue.target - revenue.current))} to go</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Client Health Grid */}
        <motion.div variants={staggerItem} className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-title-3 text-foreground">Portfolio</h2>
            <button
              onClick={() => { setShowAddClient(true); haptics.light(); }}
              className="text-caption text-primary flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {/* Client limit warning */}
          {isAtClientLimit && (
            <UpgradePrompt
              feature="Unlimited Clients"
              message={`You've reached the ${clientLimit}-client limit on the free plan.`}
              compact
            />
          )}

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-[72px] w-full rounded-xl" />)}
            </div>
          ) : clients.length === 0 ? (
            <Card className="bg-background-elevated border-border border-dashed">
              <CardContent className="p-6 text-center">
                <Users className="w-8 h-8 text-foreground-muted mx-auto mb-2" />
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
                          {/* Avatar with health indicator */}
                          <div className="relative flex-shrink-0">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold text-sm"
                              style={{ backgroundColor: client.color || '#8B5CF6' }}
                            >
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                            {/* Health dot */}
                            {canUse('relationship_health') && (
                              <div
                                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background"
                                style={{ backgroundColor: health.color }}
                                title={health.label}
                              />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="text-body-bold text-foreground truncate">{client.name}</h3>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <span className="text-caption text-foreground-secondary">
                                  {timeAgo(client.last_activity_date)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-1.5">
                              <div className="h-1.5 bg-secondary rounded-full overflow-hidden flex-1 mr-3">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${client.activity_count > 0 ? Math.min(client.activity_count * 10, 100) : 4}%` }}
                                  transition={{ duration: 0.6, delay: index * 0.05 }}
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: client.color || '#8B5CF6' }}
                                />
                              </div>
                              {/* Health label for Pro users */}
                              {canUse('relationship_health') && (
                                <span className={cn(
                                  "text-[9px] font-semibold px-1.5 py-0.5 rounded",
                                  health.status === 'healthy' && "text-success bg-success/10",
                                  health.status === 'attention' && "text-warning bg-warning/10",
                                  health.status === 'at_risk' && "text-destructive bg-destructive/10",
                                )}>
                                  {health.label}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Relationship health upgrade prompt for free users */}
          {!canUse('relationship_health') && clients.length > 0 && (
            <UpgradePrompt
              feature="Relationship Health"
              message="See which clients need attention with AI-powered health scores."
              compact
            />
          )}
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={staggerItem}>
          <RecentActivity initialCount={3} />
        </motion.div>

        {/* Pipeline Snapshot */}
        <motion.div variants={staggerItem}>
          {isLoading ? (
            <Skeleton className="h-[72px] w-full rounded-xl" />
          ) : (
            <Card className="card-interactive" onClick={() => { haptics.tap(); }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-muted flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    {pipeline.active === 0 ? (
                      <>
                        <h3 className="text-body-bold text-foreground">No active opportunities</h3>
                        <p className="text-caption text-foreground-secondary">Track your pipeline here</p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-body-bold text-foreground">
                          {pipeline.active} Active {pipeline.active === 1 ? 'Opportunity' : 'Opportunities'}
                        </h3>
                        <p className="text-caption text-foreground-secondary">
                          {formatCurrency(pipeline.totalValue)} pipeline value
                        </p>
                      </>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-foreground-muted" />
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* For You — Smart Nudges */}
        {!isLoading && (() => {
          const nudges: Array<{ icon: typeof Clock; color: string; text: string }> = [];

          // Nudge: clients with no recent activity (>7 days or null)
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
            nudges.push({
              icon: UserCheck,
              color: '#F59E0B',
              text: days
                ? `Reach out to ${client.name} — it's been ${days} days since your last interaction.`
                : `Reach out to ${client.name} — no recent activity on file.`,
            });
          }

          // Nudge: active pipeline deals
          if (pipeline.active > 0) {
            nudges.push({
              icon: Target,
              color: '#8B5CF6',
              text: `${pipeline.active} deal${pipeline.active === 1 ? '' : 's'} in your pipeline worth ${formatCurrency(pipeline.totalValue)}. Any updates to log?`,
            });
          }

          // Nudge: weekly insight highlight
          if (weeklyInsight && weeklyInsight.highlights.length > 0) {
            nudges.push({
              icon: Lightbulb,
              color: '#10B981',
              text: `Your top win this week: ${weeklyInsight.highlights[0]}`,
            });
          }

          // Nudge: progress-based encouragement (only if no highlight nudge filled the slot)
          if (nudges.length < 3 && revenue.target > 0) {
            if (progressPercent >= 75) {
              nudges.push({
                icon: Target,
                color: '#10B981',
                text: `You're ${progressPercent.toFixed(0)}% to your revenue goal — the finish line is in sight.`,
              });
            } else if (progressPercent >= 40) {
              nudges.push({
                icon: Clock,
                color: '#3B82F6',
                text: `${progressPercent.toFixed(0)}% of your monthly goal reached. Solid momentum — keep it going.`,
              });
            }
          }

          const visibleNudges = nudges.slice(0, 3);

          if (visibleNudges.length === 0) return null;

          return (
            <motion.div variants={staggerItem} className="space-y-2">
              <h2 className="text-title-3 text-foreground px-1">For You</h2>
              <div className="space-y-2">
                {visibleNudges.map((nudge, i) => {
                  const Icon = nudge.icon;
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-xl bg-background-elevated border-l-2"
                      style={{ borderColor: nudge.color }}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: nudge.color }} />
                      <p className="text-caption text-foreground-secondary flex-1">{nudge.text}</p>
                      <ArrowRight className="w-3.5 h-3.5 text-foreground-muted flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })()}

        {/* Quick Stats */}
        <motion.div variants={staggerItem} className="grid grid-cols-2 gap-3">
          <Card className="bg-background-elevated border-border">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-success-muted flex items-center justify-center mx-auto mb-2">
                <Users className="w-5 h-5 text-success" />
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-8 mx-auto mb-1" />
              ) : (
                <div className="text-title-2 text-foreground">{clients.length}</div>
              )}
              <div className="text-caption text-foreground-secondary">Active Clients</div>
            </CardContent>
          </Card>

          <Card className="bg-background-elevated border-border">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-full bg-warning-muted flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-5 h-5 text-warning" />
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-12 mx-auto mb-1" />
              ) : (
                <div className="text-title-2 text-foreground">
                  {revenue.target > 0 ? (
                    <AnimatedPercent value={Math.round(progressPercent)} />
                  ) : '-'}
                </div>
              )}
              <div className="text-caption text-foreground-secondary">Goal Progress</div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Sheets */}
      <ClientSheet open={showAddClient} onOpenChange={setShowAddClient} />
      <RevenueSheet open={showLogRevenue} onOpenChange={setShowLogRevenue} />
    </>
  );
};

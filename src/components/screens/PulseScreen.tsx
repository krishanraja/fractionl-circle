import { motion } from 'framer-motion';
import { TrendingUp, Users, Briefcase, ChevronRight, Sparkles, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/constants/animation';
import { usePortfolioDashboard } from '@/hooks/usePortfolioDashboard';

interface PulseScreenProps {
  className?: string;
}

const formatCurrency = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

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

export const PulseScreen = ({ className }: PulseScreenProps) => {
  const { revenue, clients, pipeline, weeklyInsight, isLoading, error } = usePortfolioDashboard();

  const progressPercent = revenue.target > 0
    ? Math.min((revenue.current / revenue.target) * 100, 100)
    : 0;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 p-4">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-foreground-secondary text-body text-center">{error}</p>
      </div>
    );
  }

  return (
    <motion.div
      className={cn("flex flex-col gap-6 p-4 pb-8", className)}
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* AI Weekly Insight — surfaces when available */}
      {weeklyInsight?.ai_summary && (
        <motion.div variants={staggerItem}>
          <Card className="bg-primary/10 border-primary/20 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-caption-bold text-primary mb-1">Your Week</p>
                  <p className="text-caption text-foreground-secondary line-clamp-3">
                    {weeklyInsight.ai_summary}
                  </p>
                  {weeklyInsight.highlights.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {weeklyInsight.highlights.slice(0, 3).map((h, i) => (
                        <span key={i} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {h}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Revenue Card */}
      <motion.div variants={staggerItem}>
        <Card className="bg-background-elevated border-border overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-caption text-foreground-secondary">This Month</span>
              {revenue.trend_pct !== null && (
                <div className={cn(
                  "flex items-center gap-1 text-caption-bold",
                  revenue.trend_pct >= 0 ? "text-success" : "text-destructive"
                )}>
                  <TrendingUp className="w-4 h-4" />
                  <span>{revenue.trend_pct > 0 ? '+' : ''}{revenue.trend_pct}%</span>
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-3 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  {revenue.target > 0 ? (
                    <>
                      <span className="text-display text-gradient">
                        {formatCurrency(revenue.current)}
                      </span>
                      <span className="text-foreground-muted text-title-3 ml-2">
                        / {formatCurrency(revenue.target)}
                      </span>
                    </>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-display text-gradient">
                        {formatCurrency(revenue.current)}
                      </span>
                      {revenue.current === 0 && (
                        <p className="text-caption text-foreground-muted">
                          Log revenue to track your month
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {revenue.target > 0 && (
                  <div className="space-y-2">
                    <Progress value={progressPercent} className="h-3 bg-primary-muted" />
                    <div className="flex justify-between text-caption text-foreground-secondary">
                      <span>{progressPercent.toFixed(0)}% of goal</span>
                      <span>{formatCurrency(revenue.target - revenue.current)} to go</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Portfolio Section */}
      <motion.div variants={staggerItem} className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-title-3 text-foreground">Portfolio</h2>
          <button className="text-caption text-primary flex items-center gap-1">
            Manage
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-[72px] w-full rounded-xl" />)}
          </div>
        ) : clients.length === 0 ? (
          <Card className="bg-background-elevated border-border border-dashed">
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 text-foreground-muted mx-auto mb-2" />
              <p className="text-body text-foreground-secondary">No clients yet</p>
              <p className="text-caption text-foreground-muted mt-1">Add your first client to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {clients.map((client, index) => (
              <motion.div key={client.id} variants={staggerItem} custom={index}>
                <Card className="card-interactive">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                        style={{ backgroundColor: client.color || '#8B5CF6' }}
                      >
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-body-bold text-foreground truncate">{client.name}</h3>
                          <span className="text-caption text-foreground-secondary flex-shrink-0 ml-2">
                            {timeAgo(client.last_activity_date)}
                          </span>
                        </div>
                        <div className="mt-2">
                          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${client.activity_count > 0 ? Math.max(client.activity_count * 10, 8) : 4}%`,
                                backgroundColor: client.color || '#8B5CF6',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Pipeline Card */}
      <motion.div variants={staggerItem}>
        {isLoading ? (
          <Skeleton className="h-[72px] w-full rounded-xl" />
        ) : (
          <Card className="card-interactive">
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
                {revenue.target > 0 ? `${progressPercent.toFixed(0)}%` : '—'}
              </div>
            )}
            <div className="text-caption text-foreground-secondary">Goal Progress</div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

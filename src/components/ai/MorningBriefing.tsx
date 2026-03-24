import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronDown, ChevronUp, AlertTriangle, TrendingUp, Users, Zap, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/constants/animation';
import { useDailyBriefing, type DailyBriefing } from '@/hooks/useDailyBriefing';
import { haptics } from '@/utils/haptics';

interface MorningBriefingProps {
  onAction?: (type: string) => void;
  className?: string;
}

const alertIcons = {
  client_stale: Users,
  revenue: TrendingUp,
  pipeline: Zap,
  momentum: TrendingUp,
};

const priorityColors = {
  high: 'text-destructive bg-destructive/10 border-destructive/20',
  medium: 'text-warning bg-warning/10 border-warning/20',
  low: 'text-primary bg-primary/10 border-primary/20',
};

const moodGradients = {
  positive: 'from-success/5 via-transparent to-transparent',
  neutral: 'from-primary/5 via-transparent to-transparent',
  attention: 'from-warning/5 via-transparent to-transparent',
};

export const MorningBriefing = ({ onAction, className }: MorningBriefingProps) => {
  const { briefing, loading, refresh } = useDailyBriefing();
  const [expanded, setExpanded] = useState(true);

  if (loading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-4 w-64" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!briefing) return null;

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className={className}
    >
      <Card className={cn(
        "overflow-hidden border-border/50",
        `bg-gradient-to-b ${moodGradients[briefing.mood]}`
      )}>
        <CardContent className="p-5">
          <motion.div variants={staggerItem}>
            {/* Header */}
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-body-bold text-foreground">{briefing.greeting}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { refresh(); haptics.light(); }}
                  className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-foreground-muted" />
                </button>
                <button
                  onClick={() => { setExpanded(!expanded); haptics.tap(); }}
                  className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  {expanded ? (
                    <ChevronUp className="w-4 h-4 text-foreground-muted" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-foreground-muted" />
                  )}
                </button>
              </div>
            </div>

            <p className="text-caption text-foreground-secondary ml-[42px] mb-3">
              {briefing.headline}
            </p>
          </motion.div>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                {/* Alerts */}
                {briefing.alerts.length > 0 && (
                  <motion.div variants={staggerItem} className="space-y-2 mb-4">
                    {briefing.alerts.map((alert, i) => {
                      const Icon = alertIcons[alert.type] || AlertTriangle;
                      return (
                        <motion.div
                          key={i}
                          variants={staggerItem}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border",
                            priorityColors[alert.priority]
                          )}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="text-caption flex-1">{alert.message}</span>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}

                {/* Quick Actions */}
                {briefing.actions.length > 0 && (
                  <motion.div variants={staggerItem} className="flex gap-2 flex-wrap">
                    {briefing.actions.map((action, i) => (
                      <Button
                        key={i}
                        variant={i === 0 ? 'default' : 'outline'}
                        size="sm"
                        className="text-caption rounded-xl"
                        onClick={() => { onAction?.(action.type); haptics.light(); }}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};

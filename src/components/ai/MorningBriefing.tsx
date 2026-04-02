import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, ChevronDown, ChevronUp, AlertTriangle, TrendingUp, Users, BarChart3, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/constants/animation';
import { useDailyBriefing, type DailyBriefing } from '@/hooks/useDailyBriefing';
import { haptics } from '@/utils/haptics';
import { getGreeting } from '@/utils/greeting';

interface MorningBriefingProps {
  onAction?: (type: string) => void;
  className?: string;
}

const alertIcons = {
  client_stale: Users,
  revenue: TrendingUp,
  pipeline: BarChart3,
  momentum: TrendingUp,
};

const priorityAccents = {
  high: 'border-l-destructive/60',
  medium: 'border-l-warning/60',
  low: 'border-l-primary/40',
};

const priorityTextColors = {
  high: 'text-foreground-secondary',
  medium: 'text-foreground-secondary',
  low: 'text-foreground-secondary',
};

export const MorningBriefing = ({ onAction, className }: MorningBriefingProps) => {
  const { briefing, loading, refresh } = useDailyBriefing();
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-5 space-y-3">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-4 w-72" />
        </CardContent>
      </Card>
    );
  }

  if (!briefing) return null;

  const hasDetails = briefing.alerts.length > 0 || briefing.actions.length > 0;

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className={className}
    >
      <Card className="overflow-hidden border-border/40">
        <CardContent className="p-0">
          {/* Compact header */}
          <div className="flex items-start gap-3 px-5 pt-5 pb-4">
            <div className="flex-shrink-0 mt-0.5">
              <Compass className="w-[18px] h-[18px] text-primary" strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-title-3 text-foreground leading-snug">
                {briefing.greeting.replace(/^Good (morning|afternoon|evening)/i, getGreeting())}
              </p>
              <p className="text-caption text-foreground-muted mt-1 leading-relaxed">
                {briefing.headline}
              </p>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={() => { refresh(); haptics.light(); }}
                className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-foreground-muted" />
              </button>
              {hasDetails && (
                <button
                  onClick={() => { setExpanded(!expanded); haptics.tap(); }}
                  className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors"
                >
                  {expanded ? (
                    <ChevronUp className="w-4 h-4 text-foreground-muted" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-foreground-muted" />
                  )}
                </button>
              )}
            </div>
          </div>

          <AnimatePresence>
            {expanded && hasDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div className="border-t border-border/30 mx-5" />

                {/* Alerts */}
                {briefing.alerts.length > 0 && (
                  <div className="px-5 pt-4 space-y-2">
                    {briefing.alerts.map((alert, i) => {
                      const Icon = alertIcons[alert.type] || AlertTriangle;
                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex items-center gap-2.5 pl-3 pr-3 py-2.5 rounded-lg border-l-2 bg-secondary/30",
                            priorityAccents[alert.priority]
                          )}
                        >
                          <Icon className="w-3.5 h-3.5 flex-shrink-0 text-foreground-muted" />
                          <span className={cn("text-caption flex-1", priorityTextColors[alert.priority])}>
                            {alert.message}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Quick Actions */}
                {briefing.actions.length > 0 && (
                  <div className="flex gap-2 flex-wrap px-5 pt-3 pb-5">
                    {briefing.actions.map((action, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="text-caption"
                        onClick={() => { onAction?.(action.type); haptics.light(); }}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}

                {briefing.actions.length === 0 && <div className="pb-4" />}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};

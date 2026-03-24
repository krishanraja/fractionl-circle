import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, Users, Zap, Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/utils/haptics';

export interface Nudge {
  id: string;
  type: 'client_stale' | 'revenue_momentum' | 'pipeline_stuck' | 'follow_up' | 'milestone';
  message: string;
  action?: { label: string; handler: () => void };
  priority: 'high' | 'medium' | 'low';
}

interface SmartNudgeProps {
  nudges: Nudge[];
  onDismiss: (id: string) => void;
  className?: string;
}

const nudgeIcons = {
  client_stale: Users,
  revenue_momentum: TrendingUp,
  pipeline_stuck: Clock,
  follow_up: Zap,
  milestone: TrendingUp,
};

const nudgeColors = {
  high: 'border-warning/30 bg-warning/5',
  medium: 'border-primary/30 bg-primary/5',
  low: 'border-border bg-background-elevated',
};

export const SmartNudgeStrip = ({ nudges, onDismiss, className }: SmartNudgeProps) => {
  if (nudges.length === 0) return null;

  return (
    <div className={cn("flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1", className)}>
      <AnimatePresence>
        {nudges.map((nudge) => (
          <SmartNudgeCard key={nudge.id} nudge={nudge} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
};

const SmartNudgeCard = ({ nudge, onDismiss }: { nudge: Nudge; onDismiss: (id: string) => void }) => {
  const Icon = nudgeIcons[nudge.type] || Zap;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, x: 20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9, x: -20 }}
      transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
      className={cn(
        "flex-shrink-0 w-[280px] rounded-2xl border p-3.5",
        nudgeColors[nudge.priority]
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-caption text-foreground leading-relaxed line-clamp-2">{nudge.message}</p>
          {nudge.action && (
            <button
              onClick={() => { nudge.action!.handler(); haptics.light(); }}
              className="flex items-center gap-1 mt-2 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              {nudge.action.label}
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
        <button
          onClick={() => { onDismiss(nudge.id); haptics.tap(); }}
          className="p-1 rounded-md hover:bg-secondary/50 transition-colors flex-shrink-0"
        >
          <X className="w-3 h-3 text-foreground-muted" />
        </button>
      </div>
    </motion.div>
  );
};

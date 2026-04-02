import { motion } from 'framer-motion';
import { 
  Lightbulb, 
  TrendingUp, 
  Target, 
  Compass,
  AlertTriangle, 
  Trophy,
  X,
  Check,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { UserInsight } from '@/hooks/useUserInsights';

interface InsightCardProps {
  insight: UserInsight;
  onDismiss: (id: string) => void;
  onAction: (id: string) => void;
  variant?: 'default' | 'compact' | 'banner';
}

const categoryConfig = {
  productivity: {
    icon: Lightbulb,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  revenue_optimization: {
    icon: TrendingUp,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
  },
  goal_alignment: {
    icon: Target,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  feature_discovery: {
    icon: Compass,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
  risk_alert: {
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800',
  },
  achievement: {
    icon: Trophy,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
  },
};

const priorityConfig = {
  high: {
    label: 'High Priority',
    variant: 'destructive' as const,
  },
  medium: {
    label: 'Medium',
    variant: 'warning' as const,
  },
  low: {
    label: 'Low',
    variant: 'secondary' as const,
  },
};

export function InsightCard({ insight, onDismiss, onAction, variant = 'default' }: InsightCardProps) {
  const config = categoryConfig[insight.category as keyof typeof categoryConfig] || categoryConfig.productivity;
  const priorityInfo = priorityConfig[insight.priority as keyof typeof priorityConfig] || priorityConfig.medium;
  const IconComponent = config.icon;

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 10 }}
        className={cn(
          'flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-md cursor-pointer',
          config.bgColor,
          config.borderColor
        )}
        onClick={() => onAction(insight.id)}
      >
        <div className={cn('p-2 rounded-lg', config.bgColor)}>
          <IconComponent className={cn('h-4 w-4', config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{insight.title}</p>
          <p className="text-xs text-foreground-muted truncate">{insight.description}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-foreground-muted flex-shrink-0" />
      </motion.div>
    );
  }

  if (variant === 'banner') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          'relative flex items-center gap-4 p-4 rounded-2xl border overflow-hidden',
          config.bgColor,
          config.borderColor
        )}
      >
        <div className={cn('p-3 rounded-xl', 'bg-white/50 dark:bg-black/20')}>
          <IconComponent className={cn('h-6 w-6', config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-foreground">{insight.title}</h4>
            <Badge variant={priorityInfo.variant}>{priorityInfo.label}</Badge>
          </div>
          <p className="text-sm text-foreground-secondary">{insight.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDismiss(insight.id)}
            className="h-9 w-9 p-0 hover:bg-white/50 dark:hover:bg-black/20"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
          <Button
            size="sm"
            onClick={() => onAction(insight.id)}
            className="gap-1"
          >
            <Check className="h-4 w-4" />
            Take Action
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={cn('border-2 overflow-hidden transition-all hover:shadow-lg', config.borderColor)}>
        <div className={cn('absolute top-0 left-0 right-0 h-1', config.bgColor.replace('bg-', 'bg-gradient-to-r from-').replace('/30', '/50') + ' to-transparent')} />
        
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={cn('p-2.5 rounded-xl', config.bgColor)}>
                <IconComponent className={cn('h-5 w-5', config.color)} />
              </div>
              <div>
                <CardTitle className="text-lg">{insight.title}</CardTitle>
                <CardDescription className="text-sm mt-1">
                  {insight.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </CardDescription>
              </div>
            </div>
            <Badge variant={priorityInfo.variant}>{priorityInfo.label}</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-foreground-secondary">{insight.description}</p>

          {insight.suggested_actions && insight.suggested_actions.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-foreground">Suggested Actions:</h5>
              <ul className="space-y-1.5">
                {insight.suggested_actions.map((action, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-foreground-secondary">
                    <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {insight.confidence_score && (
            <div className="flex items-center gap-2 text-xs text-foreground-muted">
              <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${insight.confidence_score * 100}%` }}
                />
              </div>
              <span>{Math.round(insight.confidence_score * 100)}% confidence</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDismiss(insight.id)}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-1" />
              Dismiss
            </Button>
            <Button
              size="sm"
              onClick={() => onAction(insight.id)}
              className="flex-1"
            >
              <Check className="h-4 w-4 mr-1" />
              Mark Complete
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

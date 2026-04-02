import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, RefreshCw, Filter, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InsightCard } from './InsightCard';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useUserInsights } from '@/hooks/useUserInsights';
import { cn } from '@/lib/utils';

const categories = [
  { id: 'all', label: 'All Insights' },
  { id: 'productivity', label: 'Productivity' },
  { id: 'revenue_optimization', label: 'Revenue' },
  { id: 'goal_alignment', label: 'Goals' },
  { id: 'feature_discovery', label: 'Features' },
  { id: 'risk_alert', label: 'Alerts' },
  { id: 'achievement', label: 'Achievements' },
];

export function InsightsFeed() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { 
    insights, 
    loading, 
    generating,
    dismissInsight, 
    actionInsight, 
    generateInsights,
    highPriorityCount,
  } = useUserInsights();

  const filteredInsights = selectedCategory === 'all' 
    ? insights 
    : insights.filter(i => i.category === selectedCategory);

  const sortedInsights = [...filteredInsights].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
    return aPriority - bPriority;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" label="Loading insights..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-semibold text-foreground">
            AI Insights
          </h2>
          <p className="text-foreground-secondary mt-1">
            Personalized recommendations based on your activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          {highPriorityCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              {highPriorityCount} urgent
            </Badge>
          )}
          <Button
            onClick={generateInsights}
            disabled={generating}
            className="gap-2"
          >
            {generating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Lightbulb className="h-4 w-4" />
                Generate Insights
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const count = category.id === 'all' 
            ? insights.length 
            : insights.filter(i => i.category === category.id).length;
          
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-all',
                'border border-border hover:border-primary/50',
                selectedCategory === category.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground-secondary hover:bg-muted'
              )}
            >
              {category.label}
              {count > 0 && (
                <span className={cn(
                  'ml-2 px-1.5 py-0.5 rounded-full text-xs',
                  selectedCategory === category.id
                    ? 'bg-white/20'
                    : 'bg-muted'
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Insights Grid */}
      <AnimatePresence mode="popLayout">
        {sortedInsights.length > 0 ? (
          <motion.div
            layout
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {sortedInsights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onDismiss={dismissInsight}
                onAction={actionInsight}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="p-4 rounded-full bg-muted mb-4">
              <Lightbulb className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {selectedCategory === 'all' ? "No insights yet" : `No ${selectedCategory.replace('_', ' ')} insights`}
            </h3>
            <p className="text-foreground-secondary max-w-sm mb-6">
              {selectedCategory === 'all'
                ? "Use the app more to generate personalized insights, or click the button below to analyze your data now."
                : "No insights in this category. Try viewing all insights or generate new ones."}
            </p>
            <Button onClick={generateInsights} disabled={generating}>
              <Lightbulb className="h-4 w-4 mr-2" />
              Generate Insights
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

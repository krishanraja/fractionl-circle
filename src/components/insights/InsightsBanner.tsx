import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InsightCard } from './InsightCard';
import { useUserInsights } from '@/hooks/useUserInsights';
import { cn } from '@/lib/utils';

interface InsightsBannerProps {
  className?: string;
  maxInsights?: number;
  autoRotate?: boolean;
  rotateInterval?: number;
}

export function InsightsBanner({
  className,
  maxInsights = 3,
  autoRotate = true,
  rotateInterval = 8000,
}: InsightsBannerProps) {
  const { insights, loading, dismissInsight, actionInsight, getHighPriorityInsights } = useUserInsights({ 
    status: 'active',
    limit: maxInsights,
  });
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Prioritize high priority insights
  const displayInsights = [
    ...getHighPriorityInsights(),
    ...insights.filter(i => i.priority !== 'high'),
  ].slice(0, maxInsights);

  // Auto-rotate insights
  useEffect(() => {
    if (!autoRotate || isPaused || displayInsights.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayInsights.length);
    }, rotateInterval);

    return () => clearInterval(interval);
  }, [autoRotate, isPaused, displayInsights.length, rotateInterval]);

  // Reset index if insights change
  useEffect(() => {
    if (currentIndex >= displayInsights.length) {
      setCurrentIndex(0);
    }
  }, [displayInsights.length, currentIndex]);

  if (loading || displayInsights.length === 0) {
    return null;
  }

  const currentInsight = displayInsights[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + displayInsights.length) % displayInsights.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % displayInsights.length);
  };

  const handleDismiss = async (id: string) => {
    await dismissInsight(id);
    if (displayInsights.length <= 1) {
      return;
    }
    // Move to next insight after dismissing
    if (currentIndex >= displayInsights.length - 1) {
      setCurrentIndex(0);
    }
  };

  return (
    <div 
      className={cn('relative', className)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentInsight.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <InsightCard
            insight={currentInsight}
            onDismiss={handleDismiss}
            onAction={actionInsight}
            variant="banner"
          />
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      {displayInsights.length > 1 && (
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5">
            {displayInsights.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  'w-2 h-2 rounded-full transition-all duration-300',
                  index === currentIndex
                    ? 'w-6 bg-primary'
                    : 'bg-muted hover:bg-muted-foreground/30'
                )}
                aria-label={`Go to insight ${index + 1}`}
              />
            ))}
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrev}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous insight</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next insight</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

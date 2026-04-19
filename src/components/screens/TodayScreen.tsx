import { motion } from 'framer-motion';
import { Sparkles, Lightbulb } from 'lucide-react';
import { useIdeas } from '@/hooks/useIdeas';
import { cn } from '@/lib/utils';

export const TodayScreen = () => {
  const { ideas, loading } = useIdeas();

  return (
    <div className="min-h-full bg-background px-4 pt-6 pb-24">
      <motion.header
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <p className="text-sm text-foreground-secondary leading-relaxed">
          Overnight I looked for Matches across your Ideas and Circle.
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Nothing waiting for you yet.
        </h1>
      </motion.header>

      <section className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-6 mb-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-primary/10 p-2">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">
              The Match Engine is warming up.
            </p>
            <p className="text-sm text-foreground-secondary leading-relaxed">
              Connect a source in Circle. I'll surface the first Match here once
              I have people to match your Ideas against.
            </p>
          </div>
        </div>
      </section>

      {!loading && ideas.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-foreground-secondary" />
            <h2 className="text-xs font-medium uppercase tracking-wide text-foreground-secondary">
              Your Ideas
            </h2>
          </div>
          <div className="space-y-2">
            {ideas.map((idea, idx) => (
              <motion.div
                key={idea.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                  'rounded-xl border border-border/60 bg-card/50 backdrop-blur p-4'
                )}
              >
                <h3 className="text-sm font-semibold text-foreground">{idea.title}</h3>
                {idea.one_liner && (
                  <p className="mt-1 text-xs text-foreground-secondary leading-relaxed">
                    {idea.one_liner}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-foreground-muted">
                  {idea.price_band && <span>{idea.price_band}</span>}
                  {idea.icp && <span>· {idea.icp}</span>}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

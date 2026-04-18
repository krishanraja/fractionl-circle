import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export const TodayScreen = () => {
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

      <section className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-primary/10 p-2">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">
              The Match Engine is warming up.
            </p>
            <p className="text-sm text-foreground-secondary leading-relaxed">
              Connect a source in Circle and voice an Idea in Ask. I'll surface the
              first Match here once I've got both.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

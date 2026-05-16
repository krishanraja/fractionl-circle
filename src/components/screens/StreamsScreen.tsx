import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

export const StreamsScreen = () => {
  return (
    <div className="min-h-full bg-background px-4 pt-6 pb-24">
      <motion.header
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <h1 className="text-display text-foreground">
          Streams
        </h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          Ideas that earned their way in.
        </p>
      </motion.header>

      <section className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-primary/10 p-2">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">
              No live Streams yet.
            </p>
            <p className="text-sm text-foreground-secondary leading-relaxed">
              A Stream is an Idea that's earned revenue. Approve Matches on Today
              to start one.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

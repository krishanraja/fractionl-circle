import { motion } from 'framer-motion';
import { Users, Plus } from 'lucide-react';

export const CircleScreen = () => {
  return (
    <div className="min-h-full bg-background px-4 pt-6 pb-24">
      <motion.header
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Your Circle
        </h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          Every person you know, across every source — unified.
        </p>
      </motion.header>

      <section className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-6 mb-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-primary/10 p-2">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">
              0 people in your Circle
            </p>
            <p className="text-sm text-foreground-secondary leading-relaxed">
              Connect a source below. The more you connect, the better the Matches.
              LinkedIn + Google Contacts is usually enough to start.
            </p>
          </div>
        </div>
      </section>

      <button
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border/60 bg-card/50 backdrop-blur hover:bg-card text-sm font-medium text-foreground transition-colors"
        disabled
      >
        <Plus className="w-4 h-4" />
        Add a source
      </button>
      <p className="mt-2 text-center text-xs text-foreground-muted">
        Source connectors land in Phase 2.
      </p>
    </div>
  );
};

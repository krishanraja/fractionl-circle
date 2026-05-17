import { motion } from 'framer-motion';
import { Mic } from 'lucide-react';

export const AskScreen = () => {
  return (
    <div className="min-h-full bg-background px-4 pt-6 pb-24 flex flex-col">
      <motion.header
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <h1 className="text-display text-foreground">
          Ask
        </h1>
        <p className="mt-1 text-sm text-foreground-secondary">
          One voice, always listening. Tell me an Idea. Change a setting. Ask
          anything.
        </p>
      </motion.header>

      <section className="flex-1 flex flex-col items-center justify-center">
        <motion.button
          whileTap={{ scale: 0.94 }}
          className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary-light shadow-lg shadow-primary/30 flex items-center justify-center"
          disabled
        >
          <Mic className="w-9 h-9 text-white" strokeWidth={2} />
        </motion.button>
        <p className="mt-6 text-sm text-foreground-secondary text-center max-w-sm leading-relaxed">
          Voice capture lands in Phase 2 alongside first-run. For now, this is
          the home Ask will live in.
        </p>
      </section>
    </div>
  );
};

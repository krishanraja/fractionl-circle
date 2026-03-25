import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { useSubscription } from '@/hooks/useSubscription';
import { haptics } from '@/utils/haptics';

interface VoiceCommandBarProps {
  onNavigate?: (tab: string) => void;
  currentTab?: string;
  className?: string;
}

export const VoiceCommandBar = ({ onNavigate, currentTab, className }: VoiceCommandBarProps) => {
  const { canUse } = useSubscription();
  const {
    state,
    result,
    waveformData,
    audioBlob,
    startListening,
    stopListening,
    processCommand,
    dismiss,
  } = useVoiceCommands(onNavigate);

  // Process audio when blob is ready
  useEffect(() => {
    if (audioBlob && state === 'processing') {
      processCommand(audioBlob);
    }
  }, [audioBlob, state, processCommand]);

  const isActive = state !== 'idle';

  // Hide on Log screen (has its own dedicated mic)
  if (currentTab === 'log') return null;

  return (
    <>
      {/* Floating Voice FAB */}
      <motion.button
        onClick={() => {
          if (state === 'idle') startListening();
          else if (state === 'listening') stopListening();
          else dismiss();
        }}
        whileTap={{ scale: 0.9 }}
        className={cn(
          "fixed z-40 w-14 h-14 rounded-full flex items-center justify-center",
          "shadow-lg transition-all duration-200",
          state === 'listening'
            ? "bg-destructive shadow-destructive/30"
            : state === 'processing'
            ? "bg-primary/80 shadow-primary/20"
            : "bg-primary shadow-primary/30 hover:shadow-xl hover:shadow-primary/40",
          // Position: bottom-right, above bottom nav
          "bottom-24 right-4 md:bottom-8 md:right-8",
          className
        )}
      >
        {state === 'processing' ? (
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        ) : state === 'listening' ? (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Mic className="w-6 h-6 text-white" />
          </motion.div>
        ) : (
          <Mic className="w-6 h-6 text-primary-foreground" />
        )}

        {/* Pulsing ring when listening */}
        {state === 'listening' && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-destructive"
            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        )}
      </motion.button>

      {/* Voice Command Overlay */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-40 md:bottom-24 left-4 right-4 md:left-auto md:right-8 md:w-80 z-30"
          >
            <div className="bg-background-elevated border border-border rounded-2xl p-4 shadow-xl">
              {/* Listening state */}
              {state === 'listening' && (
                <div className="text-center">
                  <p className="text-body-bold text-foreground mb-3">Listening...</p>
                  {/* Mini waveform */}
                  <div className="flex items-end justify-center gap-0.5 h-8 mb-2">
                    {waveformData.slice(0, 12).map((value, i) => (
                      <motion.div
                        key={i}
                        className="w-1 rounded-full bg-primary"
                        animate={{ height: `${Math.max(value * 100, 12)}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    ))}
                  </div>
                  <p className="text-caption text-foreground-muted">
                    Try: "How's my revenue?" or "Show stale deals"
                  </p>
                </div>
              )}

              {/* Processing state */}
              {state === 'processing' && (
                <div className="text-center py-2">
                  <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
                  <p className="text-caption text-foreground-secondary">Processing command...</p>
                </div>
              )}

              {/* Response state */}
              {state === 'responding' && result && (
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-body text-foreground flex-1">{result.response}</p>
                    <button
                      onClick={() => { dismiss(); haptics.tap(); }}
                      className="p-1 rounded-lg hover:bg-secondary/50 ml-2 flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5 text-foreground-muted" />
                    </button>
                  </div>
                  {result.navigate_to && (
                    <p className="text-caption text-primary mt-1">
                      Navigating to {result.navigate_to}...
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

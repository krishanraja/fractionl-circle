import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBannerProps {
  show: boolean;
  title: string;
  message?: string;
  onDismiss?: () => void;
  onRetry?: () => void;
  variant?: 'error' | 'warning' | 'info';
}

export const ErrorBanner = ({ 
  show, 
  title, 
  message, 
  onDismiss, 
  onRetry,
  variant = 'error' 
}: ErrorBannerProps) => {
  const variants = {
    error: {
      bg: 'bg-destructive/10 border-destructive/20',
      text: 'text-destructive',
      icon: 'text-destructive'
    },
    warning: {
      bg: 'bg-warning/10 border-warning/20',
      text: 'text-warning',
      icon: 'text-warning'
    },
    info: {
      bg: 'bg-primary/10 border-primary/20',
      text: 'text-primary',
      icon: 'text-primary'
    }
  };

  const style = variants[variant];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          transition={{ duration: 0.2 }}
          className={`rounded-lg border p-3 ${style.bg}`}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${style.icon}`} />
            <div className="flex-1 min-w-0">
              <p className={`font-medium text-sm ${style.text}`}>{title}</p>
              {message && (
                <p className="text-sm text-muted-foreground mt-0.5">{message}</p>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {onRetry && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRetry}
                  className="h-11 px-3"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Retry
                </Button>
              )}
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="h-11 w-11 p-0"
                  aria-label="Dismiss message"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Inline error for form fields
interface InlineErrorProps {
  message: string | null;
}

export const InlineError = ({ message }: InlineErrorProps) => {
  return (
    <AnimatePresence>
      {message && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="text-sm text-destructive mt-1"
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
};

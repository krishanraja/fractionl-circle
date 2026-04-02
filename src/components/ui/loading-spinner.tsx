import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

export const LoadingSpinner = ({ size = 'md', className, label }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
    xl: 'w-16 h-16 border-4'
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div
        className={cn(
          "rounded-full border-primary/30 border-t-primary animate-spin",
          sizeClasses[size]
        )}
      />
      {label && (
        <p className="text-sm text-muted-foreground animate-pulse">{label}</p>
      )}
    </div>
  );
};

// Full page loading state
export const PageLoader = ({ message = 'Loading...' }: { message?: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <img
        src="/lovable-uploads/30f9efde-5245-4c24-b26e-1e368f4a5a1b.png"
        alt="Fractionl"
        className="h-8 mb-2"
      />
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
        <div className="absolute inset-0 rounded-2xl bg-primary/20 animate-ping" />
      </div>
      <p className="text-muted-foreground font-medium">{message}</p>
    </div>
  </div>
);

// Inline loading state
export const InlineLoader = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
    <LoadingSpinner size="sm" />
    <span className="text-sm">Loading...</span>
  </div>
);

// Button loading state
export const ButtonLoader = () => (
  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
);

// Overlay loading state
export const LoadingOverlay = ({ message }: { message?: string }) => (
  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-inherit">
    <div className="flex flex-col items-center gap-3">
      <LoadingSpinner size="lg" />
      {message && (
        <p className="text-sm text-muted-foreground font-medium">{message}</p>
      )}
    </div>
  </div>
);

// Pulse dots loader
export const PulseLoader = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center gap-1", className)}>
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="w-2 h-2 rounded-full bg-primary animate-pulse"
        style={{ animationDelay: `${i * 150}ms` }}
      />
    ))}
  </div>
);

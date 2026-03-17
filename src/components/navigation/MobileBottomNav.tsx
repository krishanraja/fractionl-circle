import { Home, Target, BarChart3, Sparkles, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

type DashboardView = 'pipeline' | 'planning' | 'ai-strategy' | 'sheets' | 'customer-analytics';

interface MobileBottomNavProps {
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
}

const navItems = [
  { id: 'pipeline' as const, label: 'Home', icon: Home },
  { id: 'planning' as const, label: 'Goals', icon: Target },
  { id: 'customer-analytics' as const, label: 'Analytics', icon: BarChart3 },
  { id: 'ai-strategy' as const, label: 'AI', icon: Sparkles },
  { id: 'sheets' as const, label: 'Settings', icon: Settings },
];

export const MobileBottomNav = ({ currentView, onViewChange }: MobileBottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border safe-bottom">
      <div className="flex items-center justify-around px-2 h-16">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-2 px-1 touch-target relative",
                "transition-colors duration-200",
                isActive ? "text-primary" : "text-foreground-muted"
              )}
            >
              <div className="relative">
                <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </div>
              <span className={cn(
                "text-[11px] mt-1 font-medium",
                isActive ? "text-primary" : "text-foreground-muted"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

import { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';
import { haptics } from '@/utils/haptics';

interface SwipeAction {
  label: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  rightActions?: SwipeAction[];
  leftActions?: SwipeAction[];
  threshold?: number;
  className?: string;
}

export const SwipeableRow = ({
  children,
  rightActions = [],
  leftActions = [],
  threshold = 80,
  className,
}: SwipeableRowProps) => {
  const x = useMotionValue(0);
  const [swiped, setSwiped] = useState<'left' | 'right' | null>(null);
  const hasTriggeredHaptic = useRef(false);

  const rightActionsWidth = rightActions.length * 72;
  const leftActionsWidth = leftActions.length * 72;

  // Background opacity based on swipe distance
  const rightBgOpacity = useTransform(x, [-rightActionsWidth, 0], [1, 0]);
  const leftBgOpacity = useTransform(x, [0, leftActionsWidth], [0, 1]);

  const handleDrag = (_: any, info: PanInfo) => {
    const offset = info.offset.x;
    if (Math.abs(offset) > threshold && !hasTriggeredHaptic.current) {
      haptics.light();
      hasTriggeredHaptic.current = true;
    }
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    hasTriggeredHaptic.current = false;
    const offset = info.offset.x;

    if (offset < -threshold && rightActions.length > 0) {
      setSwiped('left');
    } else if (offset > threshold && leftActions.length > 0) {
      setSwiped('right');
    } else {
      setSwiped(null);
    }
  };

  const close = () => setSwiped(null);

  return (
    <div className={cn("relative overflow-hidden rounded-2xl", className)}>
      {/* Right actions (swipe left to reveal) */}
      {rightActions.length > 0 && (
        <motion.div
          className="absolute right-0 top-0 bottom-0 flex items-stretch"
          style={{ opacity: rightBgOpacity }}
        >
          {rightActions.map((action, i) => (
            <button
              key={i}
              onClick={() => { action.onClick(); close(); haptics.medium(); }}
              className="w-[72px] flex flex-col items-center justify-center gap-1 text-white text-[10px] font-medium"
              style={{ backgroundColor: action.color }}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </motion.div>
      )}

      {/* Left actions (swipe right to reveal) */}
      {leftActions.length > 0 && (
        <motion.div
          className="absolute left-0 top-0 bottom-0 flex items-stretch"
          style={{ opacity: leftBgOpacity }}
        >
          {leftActions.map((action, i) => (
            <button
              key={i}
              onClick={() => { action.onClick(); close(); haptics.medium(); }}
              className="w-[72px] flex flex-col items-center justify-center gap-1 text-white text-[10px] font-medium"
              style={{ backgroundColor: action.color }}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </motion.div>
      )}

      {/* Main content */}
      <motion.div
        drag="x"
        dragConstraints={{
          left: rightActions.length > 0 ? -rightActionsWidth : 0,
          right: leftActions.length > 0 ? leftActionsWidth : 0,
        }}
        dragElastic={0.1}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={{
          x: swiped === 'left' ? -rightActionsWidth : swiped === 'right' ? leftActionsWidth : 0,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        style={{ x }}
        className="relative z-10 bg-background cursor-grab active:cursor-grabbing"
      >
        {children}
      </motion.div>
    </div>
  );
};

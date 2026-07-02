import { useRef, useState, useEffect } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  useMotionValueEvent,
  PanInfo,
} from 'framer-motion';
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
  /** Distance (px) to reveal the action tray on release. */
  threshold?: number;
  /** Fraction of row width past which releasing fires the trailing action directly. */
  fullSwipeThreshold?: number;
  /** Disable iOS-Mail style full-swipe-to-commit. */
  disableFullSwipe?: boolean;
  className?: string;
}

const ACTION_WIDTH = 72;

export const SwipeableRow = ({
  children,
  rightActions = [],
  leftActions = [],
  threshold = 70,
  fullSwipeThreshold = 0.55,
  disableFullSwipe = false,
  className,
}: SwipeableRowProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [swiped, setSwiped] = useState<'left' | 'right' | null>(null);
  const [committing, setCommitting] = useState<'left' | 'right' | null>(null);
  const [width, setWidth] = useState(0);

  const revealHaptic = useRef(false);
  const commitHaptic = useRef(false);

  const rightW = rightActions.length * ACTION_WIDTH;
  const leftW = leftActions.length * ACTION_WIDTH;
  const commitPx =
    width > 0
      ? Math.max(width * fullSwipeThreshold, (rightW || leftW) * 1.5)
      : 220;

  // Measure container so commit threshold scales with row width.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth(el.offsetWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The trailing action stretches as the user drags past the reveal distance,
  // mirroring iOS Mail's swipe-to-delete affordance.
  const rightLeadWidth = useTransform(x, (v) => {
    const total = v < 0 ? -v : 0;
    const rest = ACTION_WIDTH * Math.max(0, rightActions.length - 1);
    return Math.max(ACTION_WIDTH, total - rest);
  });
  const leftLeadWidth = useTransform(x, (v) => {
    const total = v > 0 ? v : 0;
    const rest = ACTION_WIDTH * Math.max(0, leftActions.length - 1);
    return Math.max(ACTION_WIDTH, total - rest);
  });

  // Icon on the trailing action grows as the user approaches the commit zone.
  const rightLeadScale = useTransform(x, (v) => {
    const p = Math.min(1, Math.max(0, (-v - threshold) / Math.max(1, commitPx - threshold)));
    return 0.85 + p * 0.4;
  });
  const leftLeadScale = useTransform(x, (v) => {
    const p = Math.min(1, Math.max(0, (v - threshold) / Math.max(1, commitPx - threshold)));
    return 0.85 + p * 0.4;
  });

  // Fade the tray in quickly so buttons look solid as soon as they're visible.
  const rightBgOpacity = useTransform(x, (v) => {
    if (v >= 0) return 0;
    return Math.min(1, -v / Math.max(30, rightW * 0.4));
  });
  const leftBgOpacity = useTransform(x, (v) => {
    if (v <= 0) return 0;
    return Math.min(1, v / Math.max(30, leftW * 0.4));
  });

  useMotionValueEvent(x, 'change', (v) => {
    // Reveal tick when the tray first unlocks.
    if (!revealHaptic.current && Math.abs(v) > threshold) {
      haptics.light();
      revealHaptic.current = true;
    } else if (revealHaptic.current && Math.abs(v) < threshold * 0.5) {
      revealHaptic.current = false;
    }

    if (disableFullSwipe) return;

    const inLeftCommit = v <= -commitPx && rightActions.length > 0;
    const inRightCommit = v >= commitPx && leftActions.length > 0;
    const zone: 'left' | 'right' | null = inLeftCommit
      ? 'left'
      : inRightCommit
      ? 'right'
      : null;

    if (zone && !commitHaptic.current) {
      haptics.medium();
      commitHaptic.current = true;
      setCommitting(zone);
    } else if (!zone && commitHaptic.current) {
      commitHaptic.current = false;
      setCommitting(null);
    }
  });

  const fireFullSwipe = (action: SwipeAction, dir: 'left' | 'right') => {
    haptics.swipeAction();
    setCommitting(dir);
    // Allow the content to animate off-screen briefly before the parent mutates state.
    window.setTimeout(() => {
      action.onClick();
      setCommitting(null);
      setSwiped(null);
    }, 180);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    revealHaptic.current = false;
    commitHaptic.current = false;

    const offset = info.offset.x;
    const velocity = info.velocity.x;
    // Velocity-weighted projection so a quick flick lands in the right state.
    const projected = offset + velocity * 0.15;

    if (!disableFullSwipe) {
      if (offset <= -commitPx && rightActions.length > 0) {
        fireFullSwipe(rightActions[rightActions.length - 1], 'left');
        return;
      }
      if (offset >= commitPx && leftActions.length > 0) {
        fireFullSwipe(leftActions[leftActions.length - 1], 'right');
        return;
      }
    }

    setCommitting(null);
    if (projected < -threshold && rightActions.length > 0) setSwiped('left');
    else if (projected > threshold && leftActions.length > 0) setSwiped('right');
    else setSwiped(null);
  };

  const close = () => {
    setSwiped(null);
    setCommitting(null);
  };

  // Tapping anywhere outside the open row snaps it shut (iOS behaviour).
  useEffect(() => {
    if (!swiped) return;
    const onDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [swiped]);

  const targetX =
    committing === 'left'
      ? -Math.max(width, rightW + 1)
      : committing === 'right'
      ? Math.max(width, leftW + 1)
      : swiped === 'left'
      ? -rightW
      : swiped === 'right'
      ? leftW
      : 0;

  const renderAction = (
    action: SwipeAction,
    i: number,
    list: SwipeAction[],
    side: 'left' | 'right',
  ) => {
    const isLead = i === list.length - 1;
    const leadWidth = side === 'right' ? rightLeadWidth : leftLeadWidth;
    const leadScale = side === 'right' ? rightLeadScale : leftLeadScale;

    return (
      <motion.button
        key={i}
        type="button"
        aria-label={action.label}
        onClick={(e) => {
          e.stopPropagation();
          action.onClick();
          close();
          haptics.medium();
        }}
        className="flex flex-col items-center justify-center gap-1 text-white text-[10px] font-medium flex-shrink-0 overflow-hidden active:brightness-90"
        style={{
          backgroundColor: action.color,
          width: isLead ? leadWidth : ACTION_WIDTH,
        }}
      >
        <motion.span
          className="flex items-center justify-center"
          style={{ scale: isLead ? leadScale : 1 }}
        >
          {action.icon}
        </motion.span>
        <span className="whitespace-nowrap">{action.label}</span>
      </motion.button>
    );
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden rounded-2xl select-none touch-pan-y',
        className,
      )}
    >
      {/* Right actions tray - revealed by swiping LEFT */}
      {rightActions.length > 0 && (
        <motion.div
          className="absolute right-0 top-0 bottom-0 flex items-stretch"
          style={{ opacity: rightBgOpacity }}
          aria-hidden={swiped !== 'left' && committing !== 'left'}
        >
          {rightActions.map((a, i) => renderAction(a, i, rightActions, 'right'))}
        </motion.div>
      )}

      {/* Left actions tray - revealed by swiping RIGHT */}
      {leftActions.length > 0 && (
        <motion.div
          className="absolute left-0 top-0 bottom-0 flex items-stretch"
          style={{ opacity: leftBgOpacity }}
          aria-hidden={swiped !== 'right' && committing !== 'right'}
        >
          {leftActions.map((a, i) => renderAction(a, i, leftActions, 'left'))}
        </motion.div>
      )}

      {/* Main content */}
      <motion.div
        drag="x"
        dragConstraints={{
          left: rightActions.length > 0 ? -Math.max(rightW, width || rightW) : 0,
          right: leftActions.length > 0 ? Math.max(leftW, width || leftW) : 0,
        }}
        dragElastic={{ left: 0.15, right: 0.15 }}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        animate={{ x: targetX }}
        transition={
          committing
            ? { type: 'tween', duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }
            : { type: 'spring', stiffness: 420, damping: 38, mass: 0.6 }
        }
        style={{ x }}
        className="relative z-10 bg-background"
      >
        {children}
      </motion.div>
    </div>
  );
};

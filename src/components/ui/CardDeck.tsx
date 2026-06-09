import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { haptics } from '@/utils/haptics';

interface CardDeckProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  getKey: (item: T, index: number) => string;
  /** Optional element pinned above the deck (e.g. a section label + counter). */
  className?: string;
  /** Reset to the first card when this value changes (e.g. a new data load). */
  resetKey?: string | number;
  ariaLabel?: string;
}

const SWIPE_DISTANCE = 56; // px of travel that commits a swipe
const SWIPE_VELOCITY = 320; // or a fast flick

/**
 * A zero-scroll, one-card-at-a-time deck. The list never grows the page: only
 * one item is visible, advanced by swipe, arrow keys, the chevron buttons, or
 * the dots. Fills whatever bounded height its parent gives it.
 */
export function CardDeck<T>({
  items,
  renderItem,
  getKey,
  className,
  resetKey,
  ariaLabel = 'Card deck',
}: CardDeckProps<T>) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(0); // -1 back, 1 forward (for slide direction)
  const containerRef = useRef<HTMLDivElement>(null);

  const count = items.length;
  // Keep index in range when the list shrinks; reset on a fresh load.
  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, count - 1)));
  }, [count]);
  useEffect(() => {
    setIndex(0);
    setDir(0);
  }, [resetKey]);

  const go = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(count - 1, next));
      if (clamped === index) return;
      setDir(clamped > index ? 1 : -1);
      setIndex(clamped);
      haptics.navSwitch();
    },
    [count, index],
  );

  const onDragEnd = useCallback(
    (_e: unknown, info: PanInfo) => {
      const { offset, velocity } = info;
      if (offset.x < -SWIPE_DISTANCE || velocity.x < -SWIPE_VELOCITY) go(index + 1);
      else if (offset.x > SWIPE_DISTANCE || velocity.x > SWIPE_VELOCITY) go(index - 1);
    },
    [go, index],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(index + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(index - 1);
      }
    },
    [go, index],
  );

  if (count === 0) return null;

  const current = items[Math.min(index, count - 1)];
  const atStart = index <= 0;
  const atEnd = index >= count - 1;

  return (
    <div
      ref={containerRef}
      className={cn('flex min-h-0 flex-1 flex-col', className)}
      role="group"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {/* Card stage — the only flexible area; one card fills it. */}
      <div className="relative min-h-0 flex-1">
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={getKey(current, index)}
            custom={dir}
            drag={count > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={onDragEnd}
            initial={{ opacity: 0, x: dir === 0 ? 0 : dir > 0 ? 64 : -64 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir > 0 ? -64 : 64, position: 'absolute' }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex min-h-0 flex-col touch-pan-y"
          >
            <div className="fit-scroll flex-1">{renderItem(current, index)}</div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls — dots + chevrons. Hidden entirely for a single card. */}
      {count > 1 && (
        <div className="mt-3 flex shrink-0 items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={atStart}
            aria-label="Previous"
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-card/60 backdrop-blur transition-opacity active:scale-95',
              atStart && 'pointer-events-none opacity-30',
            )}
          >
            <ChevronLeft className="h-4 w-4 text-foreground-secondary" />
          </button>

          <div className="flex flex-1 items-center justify-center gap-1.5" aria-hidden>
            {items.map((it, i) => (
              <button
                key={getKey(it, i)}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to card ${i + 1}`}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-200',
                  i === index ? 'w-5 bg-primary' : 'w-1.5 bg-border',
                )}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={atEnd}
            aria-label="Next"
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-card/60 backdrop-blur transition-opacity active:scale-95',
              atEnd && 'pointer-events-none opacity-30',
            )}
          >
            <ChevronRight className="h-4 w-4 text-foreground-secondary" />
          </button>
        </div>
      )}
    </div>
  );
}

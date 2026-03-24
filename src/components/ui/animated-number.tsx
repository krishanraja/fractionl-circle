import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedNumberProps {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}

export const AnimatedNumber = ({
  value,
  format = (n) => n.toLocaleString(),
  duration = 0.8,
  className,
}: AnimatedNumberProps) => {
  const spring = useSpring(0, {
    stiffness: 100,
    damping: 30,
    duration: duration * 1000,
  });

  const display = useTransform(spring, (current) => format(Math.round(current)));
  const [displayValue, setDisplayValue] = useState(format(0));

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    const unsubscribe = display.on('change', (v) => setDisplayValue(v));
    return unsubscribe;
  }, [display]);

  return (
    <motion.span
      className={cn("tabular-nums", className)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {displayValue}
    </motion.span>
  );
};

interface AnimatedCurrencyProps {
  value: number;
  duration?: number;
  className?: string;
}

export const AnimatedCurrency = ({ value, duration, className }: AnimatedCurrencyProps) => (
  <AnimatedNumber
    value={value}
    format={(n) => new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n)}
    duration={duration}
    className={className}
  />
);

interface AnimatedPercentProps {
  value: number;
  duration?: number;
  className?: string;
}

export const AnimatedPercent = ({ value, duration, className }: AnimatedPercentProps) => (
  <AnimatedNumber
    value={value}
    format={(n) => `${n}%`}
    duration={duration}
    className={className}
  />
);

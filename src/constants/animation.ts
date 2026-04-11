// PULSE Animation Constants
// Consistent timing and easing for smooth, native-feeling animations

export const timing = {
  fast: 150,    // Micro-interactions, button presses
  normal: 250,  // Standard transitions, page changes
  slow: 400,    // Emphasis animations, modals
  spring: 600,  // Bouncy spring animations
} as const;

export const easing = {
  // Standard easing
  default: [0.4, 0, 0.2, 1],
  // Entering elements
  easeOut: [0, 0, 0.2, 1],
  // Exiting elements  
  easeIn: [0.4, 0, 1, 1],
  // iOS-style spring
  spring: [0.16, 1, 0.3, 1],
  // Bouncy spring
  bounce: [0.34, 1.56, 0.64, 1],
} as const;

// Framer Motion variants
export const fadeInUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: timing.normal / 1000, ease: easing.easeOut },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: timing.fast / 1000 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: timing.fast / 1000, ease: easing.easeOut },
};

export const slideUp = {
  initial: { y: '100%' },
  animate: { y: 0 },
  exit: { y: '100%' },
  transition: { duration: timing.normal / 1000, ease: easing.spring },
};

export const slideIn = {
  initial: { x: '100%' },
  animate: { x: 0 },
  exit: { x: '100%' },
  transition: { duration: timing.normal / 1000, ease: easing.spring },
};

// Stagger children animation
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: timing.normal / 1000, ease: easing.easeOut },
};

// Page transition variants
export const pageTransition = {
  initial: { opacity: 0, x: 20 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: { duration: timing.normal / 1000, ease: easing.easeOut }
  },
  exit: { 
    opacity: 0, 
    x: -20,
    transition: { duration: timing.fast / 1000, ease: easing.easeIn }
  },
};

// Tab switch animation
export const tabContent = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: timing.fast / 1000 },
};

// Voice recording pulse
export const recordingPulse = {
  animate: {
    scale: [1, 1.1, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Waveform bar animation
export const waveformBar = (index: number) => ({
  animate: {
    scaleY: [0.3, 1, 0.3],
    transition: {
      duration: 0.8,
      repeat: Infinity,
      ease: 'easeInOut',
      delay: index * 0.1,
    },
  },
});

// Success checkmark
export const checkmark = {
  initial: { pathLength: 0 },
  animate: { pathLength: 1 },
  transition: { duration: 0.3, ease: easing.easeOut },
};

// Modal/drawer backdrop
export const backdrop = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: timing.fast / 1000 },
};

// Card hover effect
export const cardHover = {
  whileHover: { 
    y: -2, 
    transition: { duration: timing.fast / 1000 } 
  },
  whileTap: { 
    scale: 0.98,
    transition: { duration: 0.1 }
  },
};

// Button press effect
export const buttonPress = {
  whileTap: {
    scale: 0.97,
    transition: { duration: 0.1 }
  },
};

// Progress bar animation
export const progressBar = (value: number) => ({
  initial: { width: 0 },
  animate: { width: `${value}%` },
  transition: { duration: timing.slow / 1000, ease: easing.easeOut },
});

// Circle hero section entrance
export const heroSection = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  transition: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 25,
  },
};

// Contact card with warmth-aware stagger
export const contactCardStagger = {
  animate: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.08,
    },
  },
};

export const contactCardItem = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.25, ease: easing.easeOut },
  },
  exit: {
    opacity: 0,
    x: -30,
    transition: { duration: 0.15, ease: easing.easeIn },
  },
};

// FAB morph animation for contextual state changes
export const fabMorph = {
  layout: true,
  transition: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 30,
  },
};

// Pull-to-refresh spring
export const pullRefresh = {
  type: 'spring' as const,
  stiffness: 200,
  damping: 20,
};

// Stat pill entrance
export const statPill = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
};

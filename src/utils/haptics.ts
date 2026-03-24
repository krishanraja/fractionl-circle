/**
 * Haptic feedback utilities for mobile-first interactions.
 * Uses the Vibration API (supported on Android Chrome, some other mobile browsers).
 * Falls back silently on unsupported platforms.
 */
export const haptics = {
  /** Ultra-light tap feedback for tab switches, selections */
  tap: () => navigator.vibrate?.(5),

  /** Light feedback for button presses, toggles */
  light: () => navigator.vibrate?.(10),

  /** Medium feedback for significant actions (voice start, confirm) */
  medium: () => navigator.vibrate?.(25),

  /** Heavy feedback for destructive or major actions */
  heavy: () => navigator.vibrate?.(50),

  /** Success pattern - quick double tap */
  success: () => navigator.vibrate?.([10, 50, 20]),

  /** Error pattern - sharp buzz */
  error: () => navigator.vibrate?.([50, 30, 50]),

  /** Warning pattern - gentle reminder */
  warning: () => navigator.vibrate?.([15, 40, 15]),

  /** Recording pulse - rhythmic */
  recording: () => navigator.vibrate?.([20, 100, 20, 100, 20]),
};

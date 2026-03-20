import { useState, useEffect } from 'react';

/**
 * Detects when the mobile virtual keyboard is visible by monitoring
 * the visual viewport height vs the window inner height.
 */
export const useKeyboardVisible = () => {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const onResize = () => {
      const heightDiff = window.innerHeight - viewport.height;
      const visible = heightDiff > 100; // threshold to avoid false positives
      setIsKeyboardVisible(visible);
      setKeyboardHeight(visible ? heightDiff : 0);
    };

    viewport.addEventListener('resize', onResize);
    viewport.addEventListener('scroll', onResize);

    return () => {
      viewport.removeEventListener('resize', onResize);
      viewport.removeEventListener('scroll', onResize);
    };
  }, []);

  return { isKeyboardVisible, keyboardHeight };
};

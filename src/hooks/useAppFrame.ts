import { useEffect } from 'react';

/**
 * Locks the page into a fixed, zero-scroll app frame for the duration that the
 * calling surface is mounted. Two jobs:
 *
 *  1. Measures the real visible viewport height and publishes it as the
 *     `--app-height` CSS variable. We prefer `window.visualViewport.height`
 *     (which excludes browser chrome AND shrinks when the keyboard opens) and
 *     fall back to `innerHeight`. This is the belt-and-braces value behind the
 *     `.app-frame` height stack - correct even on old iOS Safari where `vh`
 *     over-reports and `dvh` is unsupported.
 *
 *  2. Adds `app-locked` to <html>, which pins <body> (position:fixed) and kills
 *     overflow + overscroll so the page itself can never scroll or rubber-band.
 *
 * Only mount this on surfaces that own the whole viewport (the mobile app
 * shell, onboarding, auth). Marketing/legal pages must keep normal scrolling,
 * so they simply don't call it.
 */
export function useAppFrame(active: boolean = true): void {
  useEffect(() => {
    if (!active) return;

    const root = document.documentElement;
    const vv = window.visualViewport;

    const setHeight = () => {
      const h = vv?.height ?? window.innerHeight;
      root.style.setProperty('--app-height', `${Math.round(h)}px`);
      // Visual-viewport top offset: how far the visible area is pushed down by
      // dynamic browser chrome (e.g. Android Chrome's address bar). The locked
      // body anchors to this so the pinned bottom tab bar can't be shoved below
      // the visible fold.
      root.style.setProperty('--app-top', `${Math.round(vv?.offsetTop ?? 0)}px`);
    };

    setHeight();
    root.classList.add('app-locked');

    window.addEventListener('resize', setHeight);
    window.addEventListener('orientationchange', setHeight);
    vv?.addEventListener('resize', setHeight);
    vv?.addEventListener('scroll', setHeight);

    return () => {
      window.removeEventListener('resize', setHeight);
      window.removeEventListener('orientationchange', setHeight);
      vv?.removeEventListener('resize', setHeight);
      vv?.removeEventListener('scroll', setHeight);
      root.classList.remove('app-locked');
      root.style.removeProperty('--app-height');
      root.style.removeProperty('--app-top');
    };
  }, [active]);
}

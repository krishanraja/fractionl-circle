import { useEffect, useState } from 'react';

// Chrome / Edge / Android fire `beforeinstallprompt` when the PWA is installable.
// We capture the event so we can trigger the native install prompt on demand.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

// Start listening at module load so we don't miss the event if it fires before
// any component mounts the hook.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
  });
}

/**
 * Exposes the deferred PWA install prompt (Chrome / Edge / Android).
 * Returns `{ canInstall, install }`. `install()` shows the native prompt and
 * clears the deferred event once the user accepts or dismisses.
 */
export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(() => deferredPrompt !== null);

  useEffect(() => {
    const onBeforeInstall = () => setCanInstall(true);
    const onInstalled = () => setCanInstall(false);
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    setCanInstall(false);
  };

  return { canInstall, install };
}

/** True on iPhone / iPad / iPod (Safari or in-app browsers). */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

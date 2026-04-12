/**
 * Register the PWA service worker. Safe to call multiple times;
 * does nothing in dev when the SW file isn't served.
 */
export function registerServiceWorker() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  // Only register in production builds or when explicitly served.
  if (location.hostname === 'localhost' && !import.meta.env.PROD) {
    return;
  }
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('SW registration failed:', err);
    });
  });
}

/**
 * Read a screenshot that was POSTed via Web Share Target.
 * Returns null if nothing was shared.
 */
export async function readSharedScreenshot(): Promise<{
  blob: Blob | null;
  meta: { text?: string; url?: string; title?: string } | null;
}> {
  if (!('serviceWorker' in navigator)) return { blob: null, meta: null };
  const reg = await navigator.serviceWorker.ready;
  if (!reg.active) return { blob: null, meta: null };

  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => {
      resolve(event.data || { blob: null, meta: null });
    };
    reg.active!.postMessage({ type: 'READ_SHARED' }, [channel.port2]);
    // Fallback in case the SW doesn't respond
    setTimeout(() => resolve({ blob: null, meta: null }), 3000);
  });
}

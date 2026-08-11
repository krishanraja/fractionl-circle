/**
 * Register the PWA service worker. Safe to call multiple times;
 * does nothing in dev when the SW file isn't served.
 */
export function registerServiceWorker() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  // Only register in production builds or when explicitly served.
  const loopback = ['localhost', '127.0.0.1', '::1'].includes(location.hostname);
  if (loopback && !import.meta.env.PROD) {
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
  const reg = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 1200)),
  ]);
  if (!reg) return { blob: null, meta: null };
  if (!reg.active) return { blob: null, meta: null };

  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(
      () => resolve({ blob: null, meta: null }),
      3000,
    );
    channel.port1.onmessage = (event) => {
      window.clearTimeout(timeout);
      resolve(event.data || { blob: null, meta: null });
    };
    reg.active!.postMessage({ type: 'READ_SHARED' }, [channel.port2]);
  });
}

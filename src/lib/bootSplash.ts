// Fades out the index.html boot splash once the app has applied the resolved
// theme, so the dark→light settle is never visible. Done entirely from the
// bundle (CSP `script-src 'self'` forbids inline scripts), so it manipulates the
// DOM directly rather than calling an inline helper. Idempotent.
export function hideBootSplash(): void {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('boot-splash');
  if (!el || el.classList.contains('hide')) return;
  el.classList.add('hide');
  window.setTimeout(() => el.remove(), 320);
}

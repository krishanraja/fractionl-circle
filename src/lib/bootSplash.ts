// Fades out the index.html boot splash once the app has applied the resolved
// theme, so the dark→light theme settle is never visible. Idempotent — a no-op
// if the splash is already gone. The implementation lives in index.html so it's
// available before the bundle loads; this is just the typed entry point.
export function hideBootSplash(): void {
  (window as unknown as { __hideBootSplash?: () => void }).__hideBootSplash?.();
}

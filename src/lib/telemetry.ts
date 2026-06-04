// Single sink for client-side errors. Every global error handler and
// ErrorBoundary routes through here. Today it logs to the console; when
// Sentry (or equivalent) is wired, only this file needs to change.
//
// Why this shape:
//   - One reportError() signature — no divergent call sites when the
//     telemetry provider lands.
//   - Context is a plain object so it can be serialised.
//   - The function never throws; telemetry failures must never cascade
//     into a user-facing error.

type ErrorContext = Record<string, unknown>;

export function reportError(error: unknown, context: ErrorContext = {}): void {
  try {
    const payload = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context,
      ts: new Date().toISOString(),
    };

    console.error('[telemetry]', payload);

    // Sentry hook point — install @sentry/react and call
    // Sentry.captureException(error, { extra: context }) here when ready.
  } catch {
    // Swallow — never let the reporter break the app.
  }
}

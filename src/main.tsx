import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerServiceWorker } from './utils/registerServiceWorker'
import { reportError } from './lib/telemetry'
import { captureAttribution, flushAttribution, emitLifecycle, emitLanded } from './lib/attribution'
import { supabase } from './integrations/supabase/client'

registerServiceWorker();

// First-touch acquisition attribution (5c): capture on load, flush once the
// user authenticates. Both are best-effort and never block the app.
captureAttribution();
// Top of funnel: record the anonymous landing server-side, once per session,
// reusing the context captureAttribution() just stored. Fire and forget.
emitLanded();
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session?.user?.id) {
    void flushAttribution(session.user.id);
    // Server-side lifecycle emit (5d). Guarded to once per session; fire-and-forget.
    emitLifecycle('signed_up');
  }
});

window.addEventListener('error', (event) => {
  reportError(event.error ?? event.message, { source: 'window.error' });
});

window.addEventListener('unhandledrejection', (event) => {
  reportError(event.reason, { source: 'unhandledrejection' });
});

createRoot(document.getElementById("root")!).render(<App />);

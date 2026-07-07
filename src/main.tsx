import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerServiceWorker } from './utils/registerServiceWorker'
import { reportError } from './lib/telemetry'
import { captureAttribution, flushAttribution, emitLifecycle } from './lib/attribution'
import { supabase, isSupabaseConfigured } from './integrations/supabase/client'
import { ConfigError } from './components/ConfigError'

const root = createRoot(document.getElementById("root")!);

// The whole app depends on Supabase. If the build is missing its credentials,
// render a clear configuration screen instead of wiring up an app that can only
// fail - and never leave the user staring at a blank page once the boot-splash
// safety-net fades.
if (!isSupabaseConfigured) {
  root.render(<ConfigError />);
} else {
  registerServiceWorker();

  // First-touch acquisition attribution (5c): capture on load, flush once the
  // user authenticates. Both are best-effort and never block the app.
  captureAttribution();
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

  root.render(<App />);
}

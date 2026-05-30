import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerServiceWorker } from './utils/registerServiceWorker'
import { reportError } from './lib/telemetry'
import { captureAttribution, flushAttribution } from './lib/attribution'
import { supabase } from './integrations/supabase/client'

registerServiceWorker();

// First-touch acquisition attribution (5c): capture on load, flush once the
// user authenticates. Both are best-effort and never block the app.
captureAttribution();
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session?.user?.id) {
    void flushAttribution(session.user.id);
  }
});

window.addEventListener('error', (event) => {
  reportError(event.error ?? event.message, { source: 'window.error' });
});

window.addEventListener('unhandledrejection', (event) => {
  reportError(event.reason, { source: 'unhandledrejection' });
});

createRoot(document.getElementById("root")!).render(<App />);

import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerServiceWorker } from './utils/registerServiceWorker'

registerServiceWorker();

// Global error handlers — catch unhandled errors that would otherwise go unnoticed
window.addEventListener('error', (event) => {
  console.error('[GlobalError]', event.error ?? event.message);
  // TODO: Send to error reporting service (e.g. Sentry) when integrated
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[UnhandledRejection]', event.reason);
  // TODO: Send to error reporting service (e.g. Sentry) when integrated
});

createRoot(document.getElementById("root")!).render(<App />);

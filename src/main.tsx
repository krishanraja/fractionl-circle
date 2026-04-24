import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerServiceWorker } from './utils/registerServiceWorker'
import { reportError } from './lib/telemetry'

registerServiceWorker();

window.addEventListener('error', (event) => {
  reportError(event.error ?? event.message, { source: 'window.error' });
});

window.addEventListener('unhandledrejection', (event) => {
  reportError(event.reason, { source: 'unhandledrejection' });
});

createRoot(document.getElementById("root")!).render(<App />);

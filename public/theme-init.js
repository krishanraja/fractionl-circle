// Loaded as a render-blocking same-origin <script> from index.html. The CSP is
// `script-src 'self'`, so this can't be inline. Two jobs, both bundle-independent
// (they still run even if the main app bundle fails to load/execute):
//
//   1. Pre-paint theme: apply the saved theme to <html> before first paint so
//      there's no dark→light flash. Dark-first - anything but 'light' is dark.
//   2. Splash safety net: if the app hasn't revealed itself in time (normally the
//      bundle hides the splash once the theme is applied - see PreferencesApplier
//      / BootSplashGate), drop the splash anyway so it can never get stuck.
(function () {
  try {
    var t = localStorage.getItem('circle-theme');
    if (t === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  } catch (e) { /* ignore */ }

  setTimeout(function () {
    var el = document.getElementById('boot-splash');
    if (!el || el.classList.contains('hide')) return;
    el.classList.add('hide');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 320);
  }, 4000);
})();

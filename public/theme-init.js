// Loaded as a render-blocking same-origin <script> from index.html. The CSP is
// `script-src 'self'`, so this can't be inline. Three jobs, all bundle-independent
// (they still run even if the main app bundle fails to load/execute):
//
//   1. Pre-paint theme: apply the saved theme to <html> before first paint so
//      there's no dark→light flash. Dark-first - anything but 'light' is dark.
//   2. Splash safety net: if the app mounted but forgot to reveal itself in time
//      (normally the bundle hides the splash once the theme is applied - see
//      PreferencesApplier / BootSplashGate), drop the splash so it can't get stuck.
//   3. Boot-failure recovery net: if the app never mounts at all (e.g. a stale
//      cached index.html requesting /assets hashes that a later deploy deleted, so
//      the module 404s), keep showing the loading orb instead of a blank page, then
//      offer a cache-busting reload rather than leaving the user stranded.
(function () {
  try {
    var t = localStorage.getItem('circle-theme');
    if (t === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  } catch (e) { /* ignore */ }

  // The app mounts React into #root; once it does, #root has child nodes (even a
  // loader or the config screen). Empty #root after boot => the bundle never ran.
  function appMounted() {
    var root = document.getElementById('root');
    return !!(root && root.childElementCount > 0);
  }

  function hideSplash() {
    var el = document.getElementById('boot-splash');
    if (!el || el.classList.contains('hide')) return;
    el.classList.add('hide');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 320);
  }

  function maybeRecover() {
    if (appMounted() || document.getElementById('boot-recovery')) return;
    showRecovery();
  }

  // (3, primary trigger) The precise signal for the failure we actually hit: a
  // stale cached index.html asks for an /assets hash a later deploy deleted, so the
  // module script 404s. A failed resource load fires 'error' on the element, caught
  // here in the capture phase. Runtime JS errors (target === window, no tagName) are
  // the ErrorBoundary's job, so we ignore them. Give a brief grace for a late mount.
  window.addEventListener('error', function (e) {
    var t = e && e.target;
    if (!t || t.tagName !== 'SCRIPT') return;                 // only failed <script> loads
    if (String(t.src || '').indexOf('/assets/') === -1) return; // only the app bundle/chunks
    setTimeout(maybeRecover, 1000);
  }, true);

  // (2) Splash backstop. Only drop the splash here if the app HAS mounted but
  // hasn't hidden it yet - a stuck splash over a working app. If nothing mounted,
  // leave the orb pulsing (reads as "loading") and let the recovery net decide.
  setTimeout(function () {
    if (appMounted()) hideSplash();
  }, 4000);

  // (3, backstop) If the app still hasn't mounted long after even a slow-but-working
  // load would have (bundle hung / threw without a resource error), recover anyway.
  // Set well clear of realistic load times so a slow connection never sees a false
  // "new version" prompt while the app is still on its way up.
  setTimeout(maybeRecover, 20000);

  function showRecovery() {
    hideSplash();

    // Best-effort: a stale service worker / cache is the usual culprit, so clear
    // both before the reload. All guarded - never throw out of the boot script.
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
        navigator.serviceWorker.getRegistrations()
          .then(function (regs) { regs.forEach(function (r) { r.unregister(); }); })
          .catch(function () {});
      }
      if (window.caches && caches.keys) {
        caches.keys()
          .then(function (keys) { keys.forEach(function (k) { caches.delete(k); }); })
          .catch(function () {});
      }
    } catch (e) { /* ignore */ }

    var dark = document.documentElement.classList.contains('dark');
    var bg = dark ? '#0A0A0B' : '#F8F6F2';
    var fg = dark ? '#F5F3EF' : '#1A1714';
    var muted = dark ? 'rgba(245,243,239,0.62)' : 'rgba(26,23,20,0.62)';
    var border = dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)';

    var wrap = document.createElement('div');
    wrap.id = 'boot-recovery';
    wrap.setAttribute('role', 'alert');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:100000;display:flex;' +
      'align-items:center;justify-content:center;padding:24px;text-align:center;' +
      'background:' + bg + ';color:' + fg + ';' +
      "font-family:'Satoshi',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;";

    var card = document.createElement('div');
    card.style.cssText = 'max-width:400px;width:100%;';

    var orb = document.createElement('div');
    orb.style.cssText = 'width:56px;height:56px;margin:0 auto 20px;border-radius:50%;' +
      'background:radial-gradient(circle, rgba(224,162,60,0.95), rgba(224,162,60,0.22) 48%, transparent 70%);';

    var h = document.createElement('h1');
    h.textContent = 'A new version is available';
    h.style.cssText = 'font-size:20px;font-weight:700;margin:0 0 10px;';

    var p = document.createElement('p');
    p.textContent = 'We could not finish loading - usually a cached older version. Reload to get the latest.';
    p.style.cssText = 'font-size:15px;line-height:1.55;margin:0 0 20px;color:' + muted + ';';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Reload';
    btn.style.cssText = 'appearance:none;cursor:pointer;font-size:14px;font-weight:600;' +
      'padding:10px 20px;border-radius:10px;background:transparent;color:' + fg + ';' +
      'border:1px solid ' + border + ';';
    btn.onclick = function () {
      try {
        var url = new URL(location.href);
        url.searchParams.set('v', String(new Date().getTime())); // cache-bust; preserves hash
        location.replace(url.toString());
      } catch (e) {
        location.reload();
      }
    };

    card.appendChild(orb);
    card.appendChild(h);
    card.appendChild(p);
    card.appendChild(btn);
    wrap.appendChild(card);
    (document.body || document.documentElement).appendChild(wrap);
  }
})();

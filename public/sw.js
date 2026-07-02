// Circle PWA service worker.
//
// Primary responsibility: accept shared screenshots from the OS share sheet
// (Android Chrome Web Share Target) and stash them so the client-side
// /share-contact route can read them.
//
// The POST from the share sheet is intercepted here, the file is copied into
// a named Cache entry, and the user is redirected to the React route which
// pulls it out, parses it, and shows the confirm card.

const SHARE_CACHE = 'circle-shared-v1';
const SHARE_KEY = '/__shared_screenshot__';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Intercept POSTs to /share-contact - these come from the OS share sheet.
  if (event.request.method === 'POST' && url.pathname === '/share-contact') {
    event.respondWith(handleShareTarget(event.request));
    return;
  }
  // Everything else passes through.
});

async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('screenshot');
    const text = formData.get('text') || '';
    const shareUrl = formData.get('url') || '';
    const title = formData.get('title') || '';

    const cache = await caches.open(SHARE_CACHE);

    if (file && typeof file !== 'string') {
      await cache.put(
        SHARE_KEY,
        new Response(file, {
          headers: {
            'content-type': file.type || 'application/octet-stream',
            'x-shared-name': file.name || 'screenshot',
          },
        })
      );
    }

    // Also stash any text/url so the client can use it as a hint.
    await cache.put(
      `${SHARE_KEY}_meta`,
      new Response(JSON.stringify({ text, url: shareUrl, title }), {
        headers: { 'content-type': 'application/json' },
      })
    );

    // Redirect the user into the React app.
    return Response.redirect('/share-contact?pending=1', 303);
  } catch (err) {
    return Response.redirect('/share-contact?error=1', 303);
  }
}

// ── Web Push ────────────────────────────────────────────────────────────
// Inert unless the server (send-push) actually delivers a push. Parses the
// payload defensively and shows a notification that deep-links into the app.

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_err) {
    // Fallback: treat any non-JSON body as the notification body text.
    try {
      payload = { body: event.data ? event.data.text() : '' };
    } catch (_err2) {
      payload = {};
    }
  }

  const title = payload.title || 'Circle';
  const options = {
    body: payload.body || 'Your moves are ready.',
    data: { url: payload.url || '/' },
    icon: '/android-chrome-192x192.png',
    badge: '/android-chrome-192x192.png',
  };

  event.waitUntil(
    self.registration.showNotification(title, options).catch(() => {})
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    (async () => {
      try {
        const allClients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });
        // Focus an existing tab if one is open, otherwise open a new window.
        for (const client of allClients) {
          if ('focus' in client) {
            try {
              if ('navigate' in client) await client.navigate(targetUrl);
            } catch (_err) {
              /* navigation can fail cross-origin; just focus */
            }
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      } catch (_err) {
        /* never throw out of the SW */
      }
    })()
  );
});

// Expose the cached blob to the client via a message channel.
self.addEventListener('message', async (event) => {
  if (event.data?.type === 'READ_SHARED') {
    const cache = await caches.open(SHARE_CACHE);
    const fileRes = await cache.match(SHARE_KEY);
    const metaRes = await cache.match(`${SHARE_KEY}_meta`);

    const blob = fileRes ? await fileRes.blob() : null;
    const meta = metaRes ? await metaRes.json() : null;

    event.ports[0]?.postMessage({ blob, meta });

    // Clear after read - one-shot.
    if (fileRes) await cache.delete(SHARE_KEY);
    if (metaRes) await cache.delete(`${SHARE_KEY}_meta`);
  }
});

// Circle — LinkedIn Capture: background service worker.
//
// Responsibilities:
//  1. Hold the user's pairing credentials (Supabase access + refresh tokens)
//     in chrome.storage.local, refreshing the access token as needed.
//  2. Receive profile captures from the content script and forward them to
//     our `extension-ingest` edge function.
//  3. Expose light RPC to the popup: get/set pairing, sign out, run a
//     manual capture relay.

const SUPABASE_URL = 'https://ksyuwacuigshvcyptlhe.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzeXV3YWN1aWdzaHZjeXB0bGhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM4NjEwMDAsImV4cCI6MjA0OTQzNzAwMH0.PLACEHOLDER';
// NOTE: the real anon key is injected at load time from the pairing token;
// we read it from storage before making any API calls. The constant above is
// a placeholder that gets overridden immediately.

const STORAGE_KEY = 'circle_pairing';

// ---------------------------------------------------------------------------
// Pairing token: { url, anon_key, access_token, refresh_token, expires_at }
// ---------------------------------------------------------------------------

async function getPairing() {
  const { [STORAGE_KEY]: pairing } = await chrome.storage.local.get(STORAGE_KEY);
  return pairing ?? null;
}

async function setPairing(pairing) {
  await chrome.storage.local.set({ [STORAGE_KEY]: pairing });
}

async function clearPairing() {
  await chrome.storage.local.remove(STORAGE_KEY);
}

function parsePairingString(raw) {
  try {
    const json = atob(raw.trim());
    const parsed = JSON.parse(json);
    if (!parsed.url || !parsed.anon_key || !parsed.access_token || !parsed.refresh_token) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Token refresh against Supabase GoTrue.
// ---------------------------------------------------------------------------

async function refreshIfNeeded(pairing) {
  const now = Date.now();
  const expiresAt = pairing.expires_at ? new Date(pairing.expires_at).getTime() : 0;
  const skew = 60_000;
  if (expiresAt - now > skew) return pairing;

  const resp = await fetch(`${pairing.url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      apikey: pairing.anon_key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: pairing.refresh_token }),
  });
  if (!resp.ok) {
    throw new Error(`refresh failed: ${resp.status}`);
  }
  const data = await resp.json();
  const next = {
    ...pairing,
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? pairing.refresh_token,
    expires_at: new Date(now + (data.expires_in ?? 3600) * 1000).toISOString(),
  };
  await setPairing(next);
  return next;
}

// ---------------------------------------------------------------------------
// Profile capture relay.
// ---------------------------------------------------------------------------

async function ingestProfile(profile) {
  let pairing = await getPairing();
  if (!pairing) throw new Error('not_paired');
  pairing = await refreshIfNeeded(pairing);

  const resp = await fetch(`${pairing.url}/functions/v1/extension-ingest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pairing.access_token}`,
      apikey: pairing.anon_key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ profile }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`ingest ${resp.status}: ${text.slice(0, 200)}`);
  }
  return await resp.json();
}

// ---------------------------------------------------------------------------
// Messaging surface.
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((msg, _sender, send) => {
  (async () => {
    try {
      if (msg?.type === 'get_pairing') {
        const pairing = await getPairing();
        send({
          ok: true,
          connected: !!pairing,
          email: pairing?.email ?? null,
        });
        return;
      }
      if (msg?.type === 'set_pairing') {
        const parsed = parsePairingString(msg.raw);
        if (!parsed) {
          send({ ok: false, error: 'Invalid pairing token' });
          return;
        }
        await setPairing(parsed);
        send({ ok: true, email: parsed.email ?? null });
        return;
      }
      if (msg?.type === 'sign_out') {
        await clearPairing();
        send({ ok: true });
        return;
      }
      if (msg?.type === 'ingest_profile') {
        const result = await ingestProfile(msg.profile);
        send({ ok: true, result });
        return;
      }
      send({ ok: false, error: 'unknown_message' });
    } catch (e) {
      send({ ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  })();
  return true; // async response
});

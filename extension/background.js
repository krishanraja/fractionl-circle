// Circle — LinkedIn Capture: background service worker.
//
// Responsibilities:
//  1. Hold the user's pairing credentials (Supabase URL + anon key + access
//     + refresh tokens) in chrome.storage.local, refreshing the access
//     token as needed.
//  2. Receive profile captures from the content script and forward them to
//     our `extension-ingest` edge function.
//  3. Keep a rolling log of the last captures so the popup can show what
//     actually happened.
//  4. Light RPC to the popup: pair, sign out, read state.

const STORAGE_PAIRING = 'circle_pairing';
const STORAGE_RECENT = 'circle_recent_captures';
const RECENT_CAP = 8;
const BADGE_RESET_MS = 2_500;

// ---------------------------------------------------------------------------
// Pairing bundle: { url, anon_key, access_token, refresh_token, expires_at, email }
// ---------------------------------------------------------------------------

async function getPairing() {
  const { [STORAGE_PAIRING]: pairing } = await chrome.storage.local.get(STORAGE_PAIRING);
  return pairing ?? null;
}

async function setPairing(pairing) {
  await chrome.storage.local.set({ [STORAGE_PAIRING]: pairing });
}

async function clearPairing() {
  await chrome.storage.local.remove(STORAGE_PAIRING);
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
// Recent captures log (rolling, last N).
// ---------------------------------------------------------------------------

async function getRecent() {
  const { [STORAGE_RECENT]: recent } = await chrome.storage.local.get(STORAGE_RECENT);
  return Array.isArray(recent) ? recent : [];
}

async function pushRecent(entry) {
  const current = await getRecent();
  const next = [entry, ...current].slice(0, RECENT_CAP);
  await chrome.storage.local.set({ [STORAGE_RECENT]: next });
  return next;
}

// ---------------------------------------------------------------------------
// Badge feedback. The MV3 service worker can be torn down between events,
// so the setTimeout still works as long as Chrome keeps the worker alive
// during the capture; if it dies early the badge stays until next set.
// Acceptable for a transient feedback indicator.
// ---------------------------------------------------------------------------

let badgeResetTimer = null;

async function flashBadge(kind) {
  try {
    if (kind === 'ok') {
      await chrome.action.setBadgeText({ text: '•' });
      await chrome.action.setBadgeBackgroundColor({ color: '#7C3AED' });
    } else {
      await chrome.action.setBadgeText({ text: '!' });
      await chrome.action.setBadgeBackgroundColor({ color: '#B91C1C' });
    }
    if (badgeResetTimer) clearTimeout(badgeResetTimer);
    badgeResetTimer = setTimeout(() => {
      chrome.action.setBadgeText({ text: '' }).catch(() => {});
    }, BADGE_RESET_MS);
  } catch {
    // setBadgeText isn't available in every MV3 host (e.g., tests).
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

async function handleCapture(profile) {
  try {
    const result = await ingestProfile(profile);
    const captured = {
      name: profile.display_name ?? '(unknown)',
      linkedin_url: profile.linkedin_url ?? null,
      circle_person_id: result?.circle_person_id ?? null,
      status: result?.circle_new ? 'new' : 'merged',
      at: new Date().toISOString(),
    };
    await pushRecent(captured);
    await flashBadge('ok');
    return { ok: true, result };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await pushRecent({
      name: profile.display_name ?? '(unknown)',
      linkedin_url: profile.linkedin_url ?? null,
      circle_person_id: null,
      status: 'error',
      at: new Date().toISOString(),
      error: msg.slice(0, 200),
    });
    if (msg !== 'not_paired') {
      await flashBadge('err');
    }
    return { ok: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Messaging surface.
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((msg, _sender, send) => {
  (async () => {
    try {
      if (msg?.type === 'get_state') {
        const pairing = await getPairing();
        const recent = await getRecent();
        send({
          ok: true,
          connected: !!pairing,
          email: pairing?.email ?? null,
          recent,
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
        await chrome.storage.local.remove(STORAGE_RECENT);
        await chrome.action.setBadgeText({ text: '' }).catch(() => {});
        send({ ok: true });
        return;
      }
      if (msg?.type === 'ingest_profile') {
        send(await handleCapture(msg.profile));
        return;
      }
      if (msg?.type === 'clear_recent') {
        await chrome.storage.local.remove(STORAGE_RECENT);
        send({ ok: true });
        return;
      }
      send({ ok: false, error: 'unknown_message' });
    } catch (e) {
      send({ ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  })();
  return true; // async response
});

const connectedSection = document.getElementById('connected');
const disconnectedSection = document.getElementById('disconnected');
const identityEl = document.getElementById('identity');
const pairBtn = document.getElementById('pair');
const pairInput = document.getElementById('pairing-input');
const pairError = document.getElementById('pair-error');
const signOutBtn = document.getElementById('sign-out');
const recentEl = document.getElementById('recent');
const recentEmptyEl = document.getElementById('recent-empty');
const clearRecentBtn = document.getElementById('clear-recent');

// ---------------------------------------------------------------------------
// Render.
// ---------------------------------------------------------------------------

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function statusLabel(status) {
  if (status === 'new') return 'New';
  if (status === 'merged') return 'Merged';
  if (status === 'error') return 'Failed';
  return status;
}

function renderRecent(recent) {
  recentEl.innerHTML = '';
  if (!recent?.length) {
    recentEmptyEl.hidden = false;
    clearRecentBtn.hidden = true;
    return;
  }
  recentEmptyEl.hidden = true;
  clearRecentBtn.hidden = false;
  for (const entry of recent) {
    const li = document.createElement('li');
    li.className = entry.status ?? '';

    const who = document.createElement('div');
    who.className = 'who';
    who.textContent = entry.name || '(unknown)';
    li.appendChild(who);

    const meta = document.createElement('div');
    meta.className = 'meta';
    const chip = document.createElement('span');
    chip.className = 'status-chip';
    chip.textContent = statusLabel(entry.status);
    const when = document.createElement('span');
    when.textContent = relativeTime(entry.at);
    meta.appendChild(chip);
    meta.appendChild(when);
    li.appendChild(meta);

    if (entry.status === 'error' && entry.error) {
      const err = document.createElement('div');
      err.className = 'error-msg';
      err.textContent = entry.error;
      li.appendChild(err);
    }
    recentEl.appendChild(li);
  }
}

function render(state) {
  const { connected, email, recent } = state;
  connectedSection.hidden = !connected;
  disconnectedSection.hidden = connected;
  if (connected) {
    identityEl.textContent = email ?? 'Signed in';
    renderRecent(recent ?? []);
  }
}

async function refresh() {
  const res = await chrome.runtime.sendMessage({ type: 'get_state' });
  render(res ?? { connected: false });
}

// ---------------------------------------------------------------------------
// Events.
// ---------------------------------------------------------------------------

pairBtn.addEventListener('click', async () => {
  pairError.hidden = true;
  pairError.textContent = '';
  const raw = pairInput.value.trim();
  if (!raw) {
    pairError.hidden = false;
    pairError.textContent = 'Paste a pairing token first.';
    return;
  }
  pairBtn.disabled = true;
  pairBtn.textContent = 'Connecting…';
  const res = await chrome.runtime.sendMessage({ type: 'set_pairing', raw });
  pairBtn.disabled = false;
  pairBtn.textContent = 'Connect';
  if (!res?.ok) {
    pairError.hidden = false;
    pairError.textContent = res?.error ?? 'Could not pair.';
    return;
  }
  pairInput.value = '';
  await refresh();
});

signOutBtn.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'sign_out' });
  await refresh();
});

clearRecentBtn.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'clear_recent' });
  await refresh();
});

// Re-render if the background updates recent while the popup is open.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.circle_recent_captures || changes.circle_pairing) {
    void refresh();
  }
});

refresh();

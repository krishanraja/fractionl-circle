const connectedSection = document.getElementById('connected');
const disconnectedSection = document.getElementById('disconnected');
const identityEl = document.getElementById('identity');
const pairBtn = document.getElementById('pair');
const pairInput = document.getElementById('pairing-input');
const pairError = document.getElementById('pair-error');
const signOutBtn = document.getElementById('sign-out');

function render(state) {
  const { connected, email } = state;
  connectedSection.hidden = !connected;
  disconnectedSection.hidden = connected;
  if (connected) {
    identityEl.textContent = email ?? 'Signed in';
  }
}

async function refresh() {
  const res = await chrome.runtime.sendMessage({ type: 'get_pairing' });
  render(res ?? { connected: false });
}

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

refresh();

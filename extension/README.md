# Circle - LinkedIn Capture

Chrome / Arc browser extension that captures LinkedIn profiles into your
Circle as you browse them. Runs client-side in your own authenticated
LinkedIn session - no server-side scraping, no background crawling, only
pages you actively visit.

## What it does

- When you open `https://www.linkedin.com/in/<anyone>`, the content script
  reads name / title / company / headline / location from the page DOM (plus
  any JSON-LD LinkedIn embeds).
- The background service worker forwards that profile to the
  `extension-ingest` edge function with your Supabase JWT.
- The edge function upserts a `linkedin_extension` source row for your
  account and runs the same fingerprint dedupe as the other ingestion paths
  (LinkedIn CSV, Google Contacts, Microsoft Contacts).
- On re-visit, `last_interaction_at` is refreshed so the circle's warmth score
  (`recompute_circle_warmth()`) and network search ranking favour people you're
  actively looking at.

## What it does **not** do

- No scraping of pages you're not viewing.
- No harvesting of anyone else's data - the extension has zero server-side
  access beyond the edge function.
- No mail / inbox / body scanning.
- No auto-browsing, auto-following, auto-anything.

## Install (load unpacked)

1. Open Chrome or Arc.
2. Visit `chrome://extensions`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked**.
5. Pick this `extension/` folder.
6. Pin the Circle extension icon from the toolbar's puzzle menu.

Icons are committed to `extension/icons/`. If you ever need to regenerate
them (or want a different colour), run:

```
node scripts/build-extension-icons.mjs
```

This writes `16.png`, `48.png`, and `128.png` in pure Node (no deps).

## Pair it with your Circle account

1. Open the Circle web app → **Circle** tab → **Add a source** → **Connect
   browser extension**.
2. Copy the pairing token (a long base64 string).
3. Click the Circle extension icon in your toolbar.
4. Paste the token into the popup. Hit **Connect**.

The popup will flip to "Connected" with your email. Pairing tokens carry an
access token (~1 hour life) plus a refresh token; the extension rotates
them as needed.

## Use it

Open any LinkedIn profile. The extension captures in the background. You'll
see:

- A brief **purple dot** on the extension toolbar badge when a capture
  succeeds (red `!` if it failed).
- The last 8 captures - with name, "new" / "merged" chip, and relative time
  - inside the popup.

Check your Circle on the web: the person appears with
`source = linkedin_extension` on the raw record; the fingerprint pipeline
merges them with any existing entry from your LinkedIn CSV, Google
Contacts, or Microsoft.

## Troubleshooting

- **Popup shows "Not connected"** - the pairing token is missing or
  expired. Repeat the pair flow.
- **Profile doesn't show up in Circle** - check the service worker console
  (`chrome://extensions` → **Service worker** link under the extension).
- **403 / 401 from extension-ingest** - your session expired. Re-pair.
- **LinkedIn changed the DOM** - extraction is intentionally permissive
  (tries multiple selectors, falls back to null). If `display_name` goes
  missing across the board, update `content-linkedin.js` selectors.

## Files

```
manifest.json        MV3 manifest, host_permissions for linkedin.com + supabase.co
background.js        service worker: pairing, token refresh, profile relay
content-linkedin.js  profile extractor, runs on linkedin.com/in/*
popup.html           pairing UI
popup.js             popup state machine
popup.css
```

## Publishing

For now: load unpacked. Chrome Web Store submission is a follow-up - the
listing needs screenshots, a privacy policy URL, and a 128x128 icon.

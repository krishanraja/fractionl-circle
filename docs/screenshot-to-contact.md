# Screenshot → Contact

**Last updated:** 2026-07-12 - corrected to describe what's actually shipped; see "Status" below.

## Status (read this first)

**Live today:** in-app photo capture. From **Circle → Add a source → Add from photo**,
`QuickAddImage.tsx` opens a file picker, sends the image to the `parse-contact-image`
edge function (OpenAI vision, no Claude fallback), shows a confirm card, and on save
runs it through `ingestQuickAdd` (`src/lib/circleIngest.ts`) - the same fingerprint-dedupe
pipeline every Circle ingest path uses. No OS share sheet, no PWA-install requirement, no
Apple Shortcut - it's a manual "pick a photo" flow inside the app.

**Not live - backend built, frontend never wired up:** the one-gesture OS-share-sheet /
Apple-Shortcut flow described in the rest of this document. `public/site.webmanifest`'s
`share_target` and `public/sw.js`'s intercept logic still point at `/share-contact`, and
the `parse-screenshot` edge function (Claude Haiku 4.5 → GPT-4o vision fallback) still
exists and works - but **`src/pages/ShareContact.tsx` does not exist, no `/share-contact`
route is registered in `src/App.tsx`, and nothing in `src/` calls `parse-screenshot`,
`readSharedScreenshot()`, or `ingestSharedContact()`.** A user who shares a screenshot into
the installed PWA today lands on a 404. Sections below describe the intended design for
this - useful if it's picked back up, but do not claim it as live.

---

## How the live flow works (in-app photo picker)

1. User taps **Add from photo** in the Circle "Add a source" sheet.
2. `QuickAddImage.tsx` opens the device file picker (no OS share integration required).
3. The image is sent to `parse-contact-image` (vision LLM, OpenAI) which extracts name /
   headline / company / title / location / handle / profile_url / email / phone.
4. Parsed payload goes through `ingestQuickAdd` → the standard fingerprint-dedupe pipeline,
   same as every other Circle ingest source.
5. User reviews the parsed fields in a confirm card and taps Save.

No copying, no pasting, no typing unless correction is needed - just no OS share-sheet
gesture (that part is the unshipped design below).

---

## Planned / not wired up: Android Web Share Target

The plumbing exists but the destination page doesn't:

- `public/site.webmanifest` declares `share_target` with `action: "/share-contact"` and accepts image files.
- `public/sw.js` intercepts the POST, stashes the file in the Cache API, and redirects to `/share-contact?pending=1`.
- **Missing:** a `/share-contact` route and page that reads the cached file via `readSharedScreenshot()`, calls `parse-screenshot`, shows a confirm card, and calls `ingestSharedContact()` on save. None of this exists in `src/` today.

**To ship this:** add the route to `src/App.tsx`, build the page (`readSharedScreenshot()` and `ingestSharedContact()` are already written and ready to call), and wire it to `parse-screenshot`.

---

## Planned / not wired up: iOS Apple Shortcut

iOS Safari does not honor `share_target` reliably, so the design calls for a one-tap
Apple Shortcut instead. Nothing in this section is built - there is no "Set up iOS
Shortcut" button anywhere in `ProfileSettingsSheet.tsx` today, and no `.shortcut` file
in the repo.

### Shortcut actions (install once, run forever)

Design: users would add the Shortcut from a setup button inside Circle's Profile & Settings drawer (gated on iOS by `useInstallPrompt` / userAgent check) - not yet built.

The Shortcut performs:

1. **Get Input From** → Share Sheet (Images only).
2. **Base64 Encode** the input image.
3. **Get Contents of URL** → POST to `https://<supabase-url>/functions/v1/parse-screenshot`
   - Header: `Authorization: Bearer <user_access_token>` (stored as a Text variable in the Shortcut at install time)
   - Header: `Content-Type: application/json`
   - Body (JSON):
     ```json
     {
       "image": "<base64 of shortcut input>",
       "mime": "image/jpeg"
     }
     ```
4. **Open URL** → `https://circle.fractionl.ai/share-contact?prefill=<urlencoded-JSON-of-response.parsed>`

`ShareContact.tsx` reads the `prefill` query param, JSON-parses it, and jumps straight to the `confirm` state - no DB round-trip needed.

### Distributing the Shortcut

Two options:

- **Simplest:** host an iCloud Shortcut link (`icloud.com/shortcuts/<uuid>`) and deep-link from Circle's settings. Slight downside: iCloud occasionally deprecates links.
- **Recommended:** export the `.shortcut` file, commit it to `public/shortcuts/add-from-circle.shortcut`, and serve it from `https://circle.fractionl.ai/shortcuts/add-from-circle.shortcut`. Stable URL, fully owned.

### One-time auth dance

The Shortcut needs the user's Supabase access token to POST on their behalf. Flow:

- Circle's settings exposes a "Set up iOS Shortcut" button that:
  1. Generates a long-lived PAT (or reuses the current access token).
  2. Renders a Shortcut install URL that includes the token as a Text variable (only accessible on-device).
- If the token expires, the Shortcut shows an error and the user re-installs.

### Fallback for users without the Shortcut

If the user shares a text URL on iOS (e.g. LinkedIn profile URL via Safari's share sheet), they can paste it into the existing LinkedIn lookup flow on the Circle tab. No Shortcut required, but slower.

---

## Desktop / manual testing

`POST /functions/v1/parse-screenshot` works from any client with a Supabase access token. Useful for testing without going through a share sheet:

```bash
curl -X POST https://<project>.supabase.co/functions/v1/parse-screenshot \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"image\":\"$(base64 -w0 screenshot.png)\",\"mime\":\"image/png\"}"
```

---

## Required secrets

Set one of the following on the Supabase project (Edge Functions → Secrets):

| Secret | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | **Preferred.** Claude Haiku 4.5 vision (`claude-haiku-4-5-20251001`). |
| `OPENAI_API_KEY` | Fallback. GPT-4o vision. |

If neither is set, `/share-contact` shows a clean error state ("No vision model API key configured"). The rest of the app is unaffected.

Existing secrets used by `contact-enrich` (Apollo / Clearbit / Twilio) and `linkedin-search` (Google CSE) are independent.

---

## Privacy

- Screenshots only leave the device when the user explicitly shares (Android) or runs the Shortcut (iOS).
- `parse-screenshot` does not persist the raw image. The parsed JSON is returned inline; no image is stored.
- EXIF is not read.
- Same Supabase RLS rules apply - the resulting `circle_person` is only readable by the user who created it.
- Upstream LLM error bodies are **not** echoed into edge logs (audit H7 posture). Status + request-id only.

---

## Reliability

- All three vision call sites (`parse-screenshot:109` Claude, `parse-screenshot:142` GPT-4o fallback, `parse-contact-image:56` GPT-4o) wrap their fetch with explicit `AbortSignal.timeout(20_000)` since PR #46.
- Per-user rate limits enforced via the durable `rate_limits` table (`_shared/compliance.ts`).

---

## Troubleshooting

- **"The share didn't come through"** on `/share-contact?error=...` - Android share-target wrote nothing into the cache, usually because the PWA is not installed or the service worker is stale. Reinstall, hard-refresh.
- **iOS Shortcut returns 401** - the access token in the Shortcut expired. Re-install via Circle's settings.
- **"No vision model API key configured"** - set either `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` on the Supabase project.
- **Parsed fields are empty** - the screenshot may be too low-res or the platform layout has changed. Edit fields manually and save; the contact still goes through dedupe.

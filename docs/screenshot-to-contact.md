# Screenshot → Contact

One-gesture contact capture. The user takes a screenshot of a profile (LinkedIn, Instagram, Contacts, business card), shares it into Circle, and the parsed person flows through the standard Phase-1 ingestion pipeline — same fingerprint dedupe as LinkedIn CSV, Google Contacts, browser extension.

Three transports: Android (Web Share Target), iOS (Apple Shortcut), and a manual desktop curl path for testing.

---

## How it works

1. User takes a screenshot of a profile on their phone.
2. Screenshot is shared into Circle via the OS share sheet (Android) or an Apple Shortcut (iOS).
3. `parse-screenshot` edge function runs vision LLM on the image (Claude Haiku 4.5 → GPT-4o fallback) and extracts name / headline / company / title / location / handle / profile_url / email / phone.
4. Parsed payload is handed to `ingestSharedContact` in `src/lib/circleIngest.ts` — the same function every Circle ingest path uses. A `person_raw` row is written; fingerprint dedupe collapses it into a canonical `circle_person` row (or merges into an existing one).
5. User lands on `/share-contact` (`src/pages/ShareContact.tsx`), confirms / edits, taps Save.

No copying. No pasting. No typing unless correction is needed.

**Source kind on the resulting `sources` row:**
- Android share-target captures → `source_kind = 'share_sheet'`
- iOS Shortcut captures → `source_kind = 'ios_shortcut'`
- Business-card photos via the same vision pipeline → `source_kind = 'business_card_photo'`

---

## Android / PWA (Web Share Target)

Already wired up — nothing further to ship.

- `public/site.webmanifest` declares `share_target` with `action: "/share-contact"` and accepts image files.
- `public/sw.js` intercepts the POST, stashes the file in the Cache API, and redirects to `/share-contact?pending=1`.
- `src/pages/ShareContact.tsx` reads from the cache via `readSharedScreenshot()`, calls `parse-screenshot`, shows the confirm card, and on save calls `ingestSharedContact()`.
- Requires the PWA to be installed (Add to Home Screen). Not installed → Circle does not appear in the OS share sheet.

**Test flow:**
1. On Android Chrome, install Circle as a PWA.
2. Take a screenshot of a LinkedIn profile.
3. Open the screenshot → Share → Circle.
4. You should land on `/share-contact` with the parsed fields pre-filled.

---

## iOS (Apple Shortcut)

iOS Safari does not honor `share_target` reliably, so iOS ships a one-tap Apple Shortcut.

### Shortcut actions (install once, run forever)

Users add the Shortcut from a setup button inside Circle's Profile & Settings drawer (gated on iOS by `useInstallPrompt` / userAgent check).

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

`ShareContact.tsx` reads the `prefill` query param, JSON-parses it, and jumps straight to the `confirm` state — no DB round-trip needed.

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
- Same Supabase RLS rules apply — the resulting `circle_person` is only readable by the user who created it.
- Upstream LLM error bodies are **not** echoed into edge logs (audit H7 posture). Status + request-id only.

---

## Reliability

- All vision call sites wrap their fetch with explicit `AbortSignal.timeout(20_000)` since PR #46.
- Per-user rate limits enforced via the durable `rate_limits` table (`_shared/compliance.ts`).

---

## Troubleshooting

- **"The share didn't come through"** on `/share-contact?error=...` — Android share-target wrote nothing into the cache, usually because the PWA is not installed or the service worker is stale. Reinstall, hard-refresh.
- **iOS Shortcut returns 401** — the access token in the Shortcut expired. Re-install via Circle's settings.
- **"No vision model API key configured"** — set either `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` on the Supabase project.
- **Parsed fields are empty** — the screenshot may be too low-res or the platform layout has changed. Edit fields manually and save; the contact still goes through dedupe.

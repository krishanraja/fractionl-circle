# Screenshot → Contact

One-gesture contact capture: user takes a screenshot of a LinkedIn / Instagram / Contacts profile, shares it into Circle, and the parsed contact drops into their Circle with dedup already run.

This doc covers the three transports (Android, iOS, desktop) plus the secrets required to run the feature.

---

## How it works

1. User takes a screenshot of a profile on their phone.
2. Screenshot is shared into Circle via the OS share sheet (Android) or an Apple Shortcut (iOS).
3. `parse-screenshot` edge function detects the platform and extracts name/headline/company/title/location.
4. Parsed data goes through the standard `useContactIntake` pipeline — same dedup, same merge flow, same enrichment warning system as every other entry point.
5. User lands on `/share-contact` confirming the contact, edits anything, taps Save.

No copying. No pasting. No typing unless correction is needed.

---

## Android / PWA (Web Share Target)

Already wired up — nothing further to ship.

- `public/site.webmanifest` declares `share_target` with `action: "/share-contact"` and accepts image files.
- `public/sw.js` intercepts the POST, stashes the file in the Cache API, and redirects to `/share-contact?pending=1`.
- `src/pages/ShareContact.tsx` reads from the cache via `readSharedScreenshot()`, calls `parse-screenshot`, shows the confirm card.
- Requires the PWA to be installed (Add to Home Screen). Not installed → Circle doesn't appear in the share sheet.

Test flow:
1. On Android Chrome, install Circle as a PWA.
2. Take a screenshot of a LinkedIn profile.
3. Open the screenshot → Share → Circle.
4. You should land on `/share-contact` with the parsed fields pre-filled.

---

## iOS (Apple Shortcut)

Safari doesn't yet honor `share_target` reliably, so iOS ships a one-tap **Apple Shortcut**.

### Shortcut actions (install once, run forever)

Users add the Shortcut from a setup button inside Circle. The Shortcut does this:

1. **Get Input From**: Share Sheet (accepts Images)
2. **Get Contents of URL**: POST the image to `https://<supabase-url>/functions/v1/parse-screenshot`
   - Headers:
     - `Authorization: Bearer <user_access_token>` (stored in the Shortcut from first install)
     - `Content-Type: application/json`
   - Body (JSON):
     ```json
     {
       "image": "<base64 of shortcut input>",
       "mime": "image/jpeg"
     }
     ```
3. **Get Dictionary Value** `parsed` from the response
4. **Open URL**: `https://circle.fractionl.ai/share-contact?parse_id=<id>&prefill=<urlencoded-json>`
   - The `prefill` query string contains the parsed dict; `ShareContact.tsx` hydrates from it.

> Currently `parse_id` is a placeholder — the Shortcut passes parsed JSON inline via `prefill`. A future iteration stores parses server-side (`screenshot_parses` table) and only sends `parse_id` in the URL.

### Distributing the Shortcut

Host an `.shortcut` file at `https://circle.fractionl.ai/shortcuts/add-from-screenshot.shortcut` and deep-link with `https://www.icloud.com/shortcuts/<uuid>`. A "Set up on iPhone" button in Circle settings opens this URL — iOS prompts to add to the user's library.

To build the Shortcut:
1. On a Mac/iPhone, open Shortcuts → new Shortcut.
2. Configure the four steps above. Use "When run → Use as Action Extension" so it shows up in the share sheet.
3. Share → "iCloud Link" → save the URL. Use that URL in Circle's settings page.

### One-time auth dance

The Shortcut needs the user's Supabase access token to POST on their behalf. Simplest flow:
- Circle exposes a button **"Set up iOS Shortcut"** that:
  1. Generates a long-lived PAT (or re-uses the current access token).
  2. Renders a Shortcut install URL that includes the token as a Text variable (only accessible on-device).
- If the token expires, the Shortcut shows an error and the user re-installs.

### Fallback for users without the Shortcut

If the user shares a text URL on iOS (e.g. LinkedIn profile URL via Safari's share sheet → Mail to themselves), they can paste it into the existing `LinkedInImportSheet` URL flow. No Shortcut required, but slower.

---

## Desktop / manual testing

`POST /functions/v1/parse-screenshot` works from any client with a Supabase auth token. Useful for testing without going through the share sheet:

```bash
curl -X POST https://<project>.supabase.co/functions/v1/parse-screenshot \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"image\":\"$(base64 -w0 screenshot.png)\",\"mime\":\"image/png\"}"
```

---

## Required secrets

Set one of the following in Supabase project settings (Edge Functions → Secrets):

| Secret | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | **Preferred.** Claude Haiku vision for screenshot parsing. |
| `OPENAI_API_KEY` | Fallback. GPT-4o-mini vision. |

If neither is set, `/share-contact` will show an error state ("No vision model API key configured"). Set at least one.

Existing secrets already used by `contact-enrich` (Apollo / Clearbit / Twilio) are unchanged.

---

## Privacy note

- Screenshots only leave the user's device when they explicitly tap Share → Circle (Android) or run the Shortcut (iOS).
- The `parse-screenshot` function does not persist the raw image. Parsed JSON is returned inline and discarded.
- EXIF is not read and not forwarded.
- Same Supabase RLS rules apply — the resulting contact is only readable by the user who created it.

---

## Source tracking

Contacts created via this flow have `source` set to one of:
- `screenshot_linkedin`
- `screenshot_instagram`
- `screenshot_contacts`

Filter on these to measure adoption once the feature is live.

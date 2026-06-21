# Screenshot to contact

One-gesture contact capture for the thesis engine's circle. The user takes a screenshot of a LinkedIn or Instagram profile or a business card, uploads it from within the app, and the parsed person is added to `circle_person` to power the warm-reach score on the next read.

*Last updated: 2026-06-21.*

---

## How it works (current product)

1. From the **journey map**, tap "Add people to light up your warm reach" to reach the circle screen (`ThesisCircle.tsx`).
2. Tap **"Screenshot a profile to add them"** — this opens a native file picker (camera or photo library on mobile).
3. The image is sent to the `extract-contact` edge function (Gemini vision), which reads name, title, and company.
4. The parsed person is inserted directly into `circle_person` with `source = 'screenshot'` and displayed in the circle list immediately.
5. No confirm step: if the image is unreadable, an inline error message explains why and prompts for a sharper screenshot.

**What it reads:** A LinkedIn or Instagram profile screenshot, or a business card. The function extracts name, title, and company. It does not store the raw image.

---

## Edge function

`extract-contact` (in `supabase/functions/extract-contact/`) — Gemini vision reads the image and returns a `circle_person` row. Writes directly to the database.

**Required secret:** `GOOGLE_API_KEY` (Gemini).

---

## CSV import (full network)

For adding the full LinkedIn network, the circle screen also accepts the LinkedIn Connections CSV export:

1. Tap **"Open LinkedIn export →"** (deep-links to `linkedin.com/mypreferences/d/download-my-data`).
2. Request the Connections.csv export. LinkedIn takes 24 to 48 hours.
3. Upload the file via **"Upload Connections.csv"**.
4. The client-side parser (`thesisData.ts::importConnectionsCsv`) reads the CSV, maps First Name / Last Name / Company / Position columns, and bulk-inserts into `circle_person` with `source = 'linkedin_csv'`.

This is the recommended path for populating the circle with enough people to produce a real warm-reach score.

---

## Privacy

- Images are sent to the Gemini API only when the user explicitly taps to add a contact. The raw image is not persisted.
- The resulting `circle_person` rows are RLS-isolated to the user's account.
- The circle is used to score warm reach in the thesis read; it is not visible to other users and is not shared.

---

## Troubleshooting

- **"Could not read that image"** — try a sharper screenshot with the profile name and title clearly visible.
- **Empty name/title extracted** — the platform layout may have changed (especially Instagram). Fill in manually after adding.
- **GOOGLE_API_KEY not set** — `extract-contact` will return an error. Set the secret on the Supabase project and redeploy the function.

---

## Note on the retired Android share-target / iOS Shortcut flow

The previous Circle CRM product used an Android Web Share Target (`/share-contact`) and an Apple Shortcut to pipe screenshots into the app from the OS share sheet. Those flows used the `parse-screenshot` edge function. They were retired when the thesis-validation product replaced Circle in PR #85 (June 2026). The `parse-screenshot` function and `ShareContact.tsx` page remain in the codebase as dead code; the active path is the file input in `ThesisCircle.tsx` described above.

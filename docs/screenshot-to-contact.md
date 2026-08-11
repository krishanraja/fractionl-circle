# Share a contact into Circle

Circle can accept a person from the phone share sheet, then use the same contact-ingestion and dedupe path as every other capture method.

## Android PWA share target

The Android PWA share target shipped with release pull request `#142`.

1. `public/site.webmanifest` registers `/share-contact` for shared images, text, titles, and links.
2. `public/sw.js` keeps the one-shot share payload in the Cache API and opens `/share-contact?pending=1`.
3. `src/pages/ShareContact.tsx` waits for sign-in without consuming the share, then reads the payload.
4. A photo is sent to `parse-screenshot`. Shared text or a link uses the local shortcut parser first, then `parse-voice-contact` when needed.
5. The user checks simple editable fields, optionally adds where they met, and taps `Save person` once.
6. `ingestSharedContact` writes through the existing raw-person and fingerprint-dedupe pipeline.

If parsing fails, Circle keeps the raw clue and opens the same editable form. A name is the only required field.

## Android test

On the live product:

1. Install Circle from Android Chrome.
2. Take a screenshot of a profile or open a contact link.
3. Choose Share, then Circle.
4. Confirm `/share-contact` opens with the available details.
5. Edit anything uncertain, optionally add where you met, then keep the clue.
6. Return to Circle and find the saved person by exact name.

The PWA must be installed before Circle can appear in the Android share sheet.

## iPhone and iPad

An Apple Shortcut is not shipped in this release. Do not create or embed a long-lived Supabase token in a Shortcut.

Current safe paths on iOS are:

- paste a name, link, email, or note into Circle;
- use the microphone inside Circle;
- add a profile or business-card photo inside Circle;
- use a supported device-contact picker when the browser exposes it.

A future iOS Shortcut should use a short-lived, revocable handoff created by Circle, never a user access token placed in a public URL or Shortcut variable.

## Data and privacy

- A shared image leaves the device only after the user chooses Circle.
- `parse-screenshot` returns parsed fields and does not intentionally persist the raw image.
- The user sees and can edit the fields before saving.
- The raw clue is preserved for recovery and provenance.
- Existing Supabase row-level security limits saved people to the signed-in user.
- Circle does not send a message or contact the person automatically.

## Recovery

- Share missing: open `/share-contact` and add the name manually.
- Photo unclear: correct the fields or keep only the name and raw clue.
- Meeting context fails after the person saves: Circle says the person is safe and reports only the missing detail.
- Microphone unavailable: type or paste instead.
- Stale PWA service worker: update or reinstall the PWA, then share again.

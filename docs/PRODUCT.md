# Circle by Fractionl: product truth

Last updated: 2026-08-10. This is the canonical product and implementation description. When an older document disagrees, this file and the rendered `main` deployment win.

## Promise

> One clue now. The right person later.

Circle lets a busy independent operator keep whatever they know about a person in the moment. It handles the joining, dedupe, enrichment, and recovery work quietly, then brings back a grounded person when the user asks for someone or describes an idea they are testing.

## Primary user

A fractional executive or independent operator who meets useful people across calls, events, social profiles, introductions, inboxes, and phone contacts, but does not want to maintain a CRM.

They need to:

- capture a person in seconds while context is fresh;
- add where or why they met without filling a record;
- trust that sparse or messy clues are not lost;
- retrieve a named or described person without learning product vocabulary;
- see why a person matched before acting.

## Non-goals

Circle is not a sales-team CRM, bulk data grid, automated outreach engine, or place to maintain deal stages. It does not send messages automatically. It does not invent interest, availability, relationship strength, or public facts.

## Active experience

### Public front door

The signed-out root shows one concrete loop: a clue is saved, details join quietly, and the person returns for a real question. A visitor can type one clue before joining. The clue remains in session storage through the account handoff and appears in the signed-in capture field.

Voice, photo, and device-contact actions explain that joining comes first. They do not request microphone or contact permission on the public page.

### Keep a clue

The signed-in root is one adaptive working plane, not a dashboard. Its default read is `Looks like a new person`, with a visible correction to `Find someone instead`.

Accepted inputs:

- free text, including a name plus anything remembered;
- LinkedIn URLs and Instagram handles;
- email addresses and phone numbers inside a clue;
- voice transcription through the shared Whisper control;
- profile or business-card photos;
- supported device contacts;
- Android PWA share-target images, text, titles, and URLs.

A name is the minimum save requirement. Circle preserves the raw clue. Where the user met the person is optional and stored as a lightweight tag after the person is safe.

### Share a contact

`/share-contact` is the Android PWA share-target landing. The service worker keeps the one-shot payload until an authenticated user reaches the route. A photo uses `parse-screenshot`; text and URLs use deterministic shortcut parsing first, then `parse-voice-contact` when needed.

The user sees editable fields and taps `Keep clue` once. If parsing fails, Circle keeps the raw clue and asks only for the missing name. If meeting context fails after the person saves, the interface says the person is safe and reports only the unsaved detail.

iOS does not yet ship an Apple Shortcut. Current iOS paths are paste, voice, in-app photo, and a supported device-contact picker. Never place a long-lived Supabase token in a Shortcut or URL.

### Find someone

The same working plane accepts either a person request or an idea statement.

- A directly named saved person resolves locally by exact normalized name before any paid or LLM search.
- A described person uses provider-backed network search when available and a grounded keyword search over saved evidence on failure.
- A clear first-person idea statement uses the current read/rank functions when available and a grounded local rank on provider failure.

Results show the saved person, role/company when known, why they matched, confidence language, and provenance. Contact actions appear only when the saved record contains a usable channel.

## Language and interaction rules

- Use words a 12-year-old can understand.
- One consequential action per state.
- Keep uncertainty and correction visible.
- Say when nothing is saved, when a person is safe, and which optional detail failed.
- Never expose internal modes, function names, plan gates, or provider mechanics to the user.
- Every standalone interaction target is at least 44px.
- No reachable surface may create horizontal overflow, clipped controls, nested component scrollbars, or a stranded one-word hero line from 320px through 1440px.
- Respect reduced motion and visible keyboard focus.

## Voice

The shared `WhisperButton` belongs on free-form fields where speaking is useful: contact clue, person ask, meeting context, and profile positioning. Email, password, consent, file, and other structured or sensitive inputs stay typed or native.

Microphone permission is requested only after a tap. While permission is open the control says `Opening...`. It stops waiting after 12 seconds, releases a stream that arrives late, and gives a clear type-instead path. Recording uses the deployed `transcribe` function and OpenAI Whisper.

## Data and trust

All ingest paths feed the existing raw-person and fingerprint-dedupe pipeline. The user-visible person is stored in `circle_person`; raw provenance stays separate. Supabase row-level security scopes records to the signed-in user.

Core trust rules:

- keep the raw clue before optional enrichment;
- dedupe conservatively;
- never silently claim a relationship fact;
- ground every match in stored fields;
- degrade to deterministic local recall when remote providers fail;
- never duplicate a person save merely because an optional tag failed.

## Routes and entry points

| Route | Access | Purpose |
|---|---|---|
| `/` | Public or authenticated | Front door when signed out; Hinge capture/recall surface when signed in |
| `/auth` | Public | Email and Google account handoff |
| `/share-contact` | Auth-gated after payload preservation | PWA share intake and manual recovery |
| `/privacy` | Public gate, authenticated controls | Consent, export, and deletion controls |
| `/terms` | Public | Terms of use |
| `/preview/*` | Unlinked | Historical design fixtures, never product navigation |

## Architecture

- `src/App.tsx` owns public routes, auth gates, consent, and session management.
- `src/components/AuthPage.tsx` owns the front door and account handoff.
- `src/pathroom/CircleApp.tsx` mounts the active authenticated product.
- `src/pathroom/HingeCircle.tsx` owns capture, meeting context, ask, and result states.
- `src/pages/ShareContact.tsx` owns OS-share review and save.
- `src/lib/circleIngest.ts` owns the shared ingestion path.
- `src/lib/theRead.ts` owns intent routing, provider calls, exact-name recall, and grounded recovery.
- `src/components/circle/WhisperButton.tsx` owns the reusable voice interaction.
- `src/pathroom/circle-system.css`, `src/pathroom/hinge.css`, and route-specific CSS own the approved visual system.

The repository still contains older Plan and thesis components for historical continuity and potential future reuse. They are not mounted by the active authenticated shell and must not be described as current navigation.

## Commercial catalogue

`src/lib/tiers.ts` remains the code source for Free and Pro billing labels. The active Circle surface keeps exact saved-name recall available without a paid or LLM dependency. A plan gate may limit wider network search, but it cannot block the basic promise of finding a person the user already saved.

Do not advertise a trial, a $30 plan, a $79 plan, or an automatic outreach service. Those belong to retired product generations.

## Verification contract

Before release:

1. run unit/component tests, TypeScript, lint, and production build;
2. scan changed and new files for secret patterns without printing values;
3. exercise public comprehension, clue-to-join handoff, authenticated save, refresh persistence, exact-name recall, idea recovery, validation, provider failure, and microphone denial/timeout;
4. test 320px through 1440px for overflow, clipping, focus, and target size;
5. verify the Vercel deployment source revision and retain a known-good rollback deployment;
6. merge only the verified head to `main`, then repeat live route and runtime-error readback.

Current evidence and rollback details live in `docs/DELIVERY_STATE.md`. Approved design history and artifact hashes live in `docs/DESIGN_DECISIONS.md`.

## Known gaps

- Native iOS share-sheet intake is not shipped.
- Real-device voice transcription needs one final hardware check after production because the controlled browser cannot grant microphone hardware.
- Provider-backed semantic search and idea ranking have shown runtime failures; the core user outcome remains available through grounded local recovery while those providers are repaired separately.
- Large-bundle, stale Browserslist, and dependency-option warnings are maintenance work, not current interaction blockers.

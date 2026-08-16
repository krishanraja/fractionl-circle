# Circle by Fractionl: product truth

Last updated: 2026-08-16. This is the canonical product and implementation description. When an older document disagrees, this file and the rendered `main` deployment win.

## Promise

> Remember anyone. Find the right person when they can help.

Circle lets a busy independent operator remember people without maintaining a CRM. It handles joining, dedupe, enrichment, and recovery quietly. The same workspace lets the user browse everyone, ask who could help, think through a business idea, and bring the right people into that idea at the right moment.

## Primary user

A fractional executive or independent operator who meets useful people across calls, events, social profiles, introductions, inboxes, and phone contacts, but does not want to maintain a CRM.

They need to:

- capture a person in seconds while context is fresh;
- add where or why they met without filling a record;
- trust that sparse or messy notes are not lost;
- retrieve a named or described person without learning product vocabulary;
- see why a person matched before acting;
- revisit and strengthen earlier business ideas without starting over;
- reach profile, connections, reminders, privacy, and account settings without leaving the product.

## Non-goals

Circle is not a sales-team CRM, bulk data grid, automated outreach engine, or place to maintain deal stages. It does not send messages automatically. It does not invent interest, availability, relationship strength, or public facts.

## Active experience

### Public front door

The signed-out root shows one concrete loop: a person is added, details join quietly, and that person returns for a real question. A visitor can type what they remember before joining. The note remains in session storage through the account handoff and appears in the signed-in add flow.

Voice, photo, and device-contact actions explain that joining comes first. They do not request microphone or contact permission on the public page.

The public and account surfaces show the full Fractionl wordmark as the parent identity. Inside the signed-in workspace, Circle remains primary and the Fractionl icon becomes a quiet ownership seal. Browser, installed-app, and notification icons use the same Fractionl favicon artwork. A Fractionl-derived bronze is reserved for that ownership signature; violet remains Circle's only action signal.

### People

The signed-in root is a three-destination workspace. **People** is the default and daily home. It keeps ask-by-meaning, quick add, source import, and the complete contact list on one calm surface. Users can browse and search everyone at any time.

Accepted inputs:

- free text, including a name plus anything remembered;
- LinkedIn URLs and Instagram handles;
- email addresses and phone numbers inside a note;
- voice transcription through the shared Whisper control;
- profile or business-card photos;
- supported device contacts;
- Android PWA share-target images, text, titles, and URLs.

A name is the minimum save requirement. Circle preserves the raw input. Where the user met the person is optional and stored as a lightweight tag after the person is saved.

The **Add someone** flow reuses the existing screenshot/photo, paste, voice, and typed ingestion paths. **Bring in contacts** reuses the existing LinkedIn CSV, CRM/sheet, Google, and Microsoft paths. All inputs continue through the same raw-person, fingerprint, dedupe, and enrichment pipeline.

### Ideas

**Ideas** is a first-class destination, not a hidden mode inside person search. It shows recent saved ideas, starts a new idea from one rough sentence, and reopens a specific earlier run. The existing validation, market read, strengthen, journey, warm-reach, and decision-memory systems remain the engine.

The interface says `idea`, `plan`, `people`, and `details`; database and function names may retain `thesis` internally. A user never needs to learn that internal term.

### You

**You** is the stable home for identity and settings. It shows the current profile summary and provides direct entry to connected contacts, reminders, appearance, AI preferences, privacy, export/erasure, account controls, and sign out through the existing settings sheet.

### Share a contact

`/share-contact` is the Android PWA share-target landing. The service worker keeps the one-shot payload until an authenticated user reaches the route. A photo uses `parse-screenshot`; text and URLs use deterministic shortcut parsing first, then `parse-voice-contact` when needed.

The user sees editable fields and taps `Save person` once. If parsing fails, Circle keeps the raw input and asks only for the missing name. If meeting context fails after the person saves, the interface says the person is saved and reports only the unsaved detail.

iOS does not yet ship an Apple Shortcut. Current iOS paths are paste, voice, and in-app photo. A device-contact picker appears only when the browser exposes the required API. Never place a long-lived Supabase token in a Shortcut or URL.

### Find someone

The People command accepts either a person request or a statement about what the user is working on.

- A directly named saved person resolves locally by exact normalized name before any paid or LLM search.
- A described person uses provider-backed network search when available and a grounded keyword search over saved evidence on failure.
- A clear first-person idea statement uses the current read/rank functions when available and a grounded local rank on provider failure.

Results show the saved person, role/company when known, why they matched, confidence language, and provenance. Contact actions appear only when the saved record contains a usable channel.

## Language and interaction rules

- Use words a 12-year-old can understand.
- One consequential action per state.
- Keep uncertainty and correction visible.
- Say when nothing is saved, when a person is saved, and which optional detail failed.
- Never expose internal modes, function names, plan gates, or provider mechanics to the user.
- Every standalone interaction target is at least 44px.
- No reachable surface may create horizontal overflow, clipped controls, nested component scrollbars, or a stranded one-word hero line from 320px through 1440px.
- Respect reduced motion and visible keyboard focus.

## Voice

The shared `WhisperButton` belongs on free-form fields where speaking is useful: contact notes, person ask, meeting context, idea capture/strengthening, and profile positioning. Email, password, consent, file, and other structured or sensitive inputs stay typed or native.

Microphone permission is requested only after a tap. While permission is open the control says `Opening...`. It stops waiting after 12 seconds, releases a stream that arrives late, and gives a clear type-instead path. Recording uses the deployed `transcribe` function and OpenAI Whisper.

## Data and trust

All ingest paths feed the existing raw-person and fingerprint-dedupe pipeline. The user-visible person is stored in `circle_person`; raw provenance stays separate. Supabase row-level security scopes records to the signed-in user.

Core trust rules:

- keep the raw input before optional enrichment;
- dedupe conservatively;
- never silently claim a relationship fact;
- ground every match in stored fields;
- degrade to deterministic local recall when remote providers fail;
- never duplicate a person save merely because an optional tag failed.

## Routes and entry points

| Route | Access | Purpose |
|---|---|---|
| `/` | Public or authenticated | Front door when signed out; People, Ideas, and You workspace when signed in |
| `/auth` | Public | Email and Google account handoff |
| `/share-contact` | Auth-gated after payload preservation | PWA share intake and manual recovery |
| `/privacy` | Public gate, authenticated controls | Consent, export, and deletion controls |
| `/terms` | Public | Terms of use |
| `/preview/*` | Unlinked | Historical design fixtures, never product navigation |

## Architecture

- `src/App.tsx` owns public routes, auth gates, consent, and session management.
- `src/components/AuthPage.tsx` owns the front door and account handoff.
- `src/pathroom/CircleApp.tsx` mounts the active authenticated product.
- `src/pathroom/CircleWorkspace.tsx` owns the People, Ideas, and You shell plus add/import/settings overlays.
- `src/pathroom/WorkingOnInput.tsx` and `src/components/circle/CirclePeopleList.tsx` own semantic ask and browse/search.
- `src/pathroom/ThesisApp.tsx` owns the existing idea engine; `thesisData.ts` supports latest, recent, and exact-run reads.
- `src/components/profile/ProfileSettingsSheet.tsx` remains the profile/settings implementation.
- `src/pages/ShareContact.tsx` owns OS-share review and save.
- `src/lib/circleIngest.ts` owns the shared ingestion path.
- `src/lib/theRead.ts` owns intent routing, provider calls, exact-name recall, and grounded recovery.
- `src/components/circle/WhisperButton.tsx` owns the reusable voice interaction.
- `src/components/circle/CircleBrand.tsx` owns the responsive Circle and Fractionl lockups; `public/brand/` owns the approved wordmark and icon artwork.
- `src/pathroom/circle-system.css` owns the shared visual tokens. `circle-workspace.css` owns only workspace layout. Existing deep-flow styles read the same tokens.

`HingeCircle.tsx`, its test, and historical mocks remain for traceability but are not mounted. Do not delete or rebuild the existing ingestion, idea, settings, connector, or data-pipeline systems merely because the shell changed.

## Commercial catalogue

`src/lib/tiers.ts` remains the code source for Free and Pro billing labels. The active Circle surface keeps exact saved-name recall available without a paid or LLM dependency. A plan gate may limit wider network search, but it cannot block the basic promise of finding a person the user already saved.

The existing subscription backend gives a newly created account a 14-day internal `trialing` status and treats an active trial as Pro for feature gates. The current public catalogue does not advertise that trial. Do not promise a trial, a $30 plan, a $79 plan, or an automatic outreach service. The price catalogue and the live checkout must agree before public pricing changes.

Buyer definition, positioning, sales language, objection handling, and public claim evidence live in [MARKETING_AND_SALES.md](MARKETING_AND_SALES.md). That guide labels the primary audience and pain as commercial hypotheses. Do not turn them into measured market facts without new evidence.

## Verification contract

Before release:

1. run unit/component tests, TypeScript, lint, and production build;
2. scan changed and new files for secret patterns without printing values;
3. exercise public comprehension, person-to-join handoff, People browse/add/import, Ideas recent/new/reopen, You/settings, authenticated save, refresh persistence, exact-name recall, provider failure, and microphone denial/timeout;
4. test 320px through 1440px for overflow, clipping, focus, and target size;
5. verify the Vercel deployment source revision and retain a known-good rollback deployment;
6. merge only the verified head to `main`, then repeat live route and runtime-error readback.

Current evidence and rollback details live in `docs/DELIVERY_STATE.md`. Approved design history and artifact hashes live in `docs/DESIGN_DECISIONS.md`.

## Known gaps

- Native iOS share-sheet intake is not shipped.
- Real-device voice transcription needs one final hardware check after production because the controlled browser cannot grant microphone hardware.
- Provider-backed semantic search and idea ranking have shown runtime failures; the core user outcome remains available through grounded local recovery while those providers are repaired separately.
- Large-bundle, stale Browserslist, and dependency-option warnings are maintenance work, not current interaction blockers.

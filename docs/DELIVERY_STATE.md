# Fractionl Circle delivery state

Last verified: 2026-08-10

## Product contract

- Promise: keep any clue about a person now, then bring that person back when they can help.
- Primary flow: add a name, link, email, photo, device contact, shared item, or voice clue; optionally add where you met; save once; ask for a person or test an idea later.
- Interface rule: use short words a 12-year-old can understand. Dedupe, enrichment, routing, provider recovery, and edge cases stay behind the scenes.
- Safety rule: never invent relationship facts, silently send a message, or hide uncertainty.
- Fit rule: no horizontal overflow, clipped control, nested component scrollbar, target below 44px, or stranded one-word hero line from 320px through 1440px.

## Release truth

- Repository: `krishanraja/fractionl-circle`
- Branch: `codex/circle-hinge-release`
- Verified product commit: `86cf62e`
- Production URL: `https://circle.fractionl.ai`
- Current production deployment: `dpl_9jK4JKvqpjrT1Kngg6quprX6aaN5`
- Current production commit: `70817d2d51a070f9dee48e91deab9daafcbc8ac2`
- Rollback point: the current production deployment above remains untouched until the candidate is promoted and remains available for immediate rollback.
- Supabase project: `ksyuwacuigshvcyptlhe`
- Backend release: no Supabase function or database change is required for this UI release. Deployed function source was compared with local source; observed provider failures are handled by deterministic client recovery.

## What is complete

- Approved Hinge surface: one adaptive plane for keeping a clue or finding one person.
- Front door and account handoff: one clear visual story, one pending clue carried through sign-in, and consistent Circle styling.
- Contact intake: text, link, email, voice, photo, supported device contacts, and Android PWA share-target input.
- Meeting context: one optional plain-language field with voice input.
- Recall: exact saved-name lookup works without an LLM or paid search. Described-person and idea flows recover with grounded local evidence when remote ranking is unavailable.
- Whole-app consistency: shared brand, colour, type, spacing, focus, and control sizing across home, auth, settings, privacy, terms, and share intake.
- Voice: shared Whisper input on all free-form clue, ask, meeting, and positioning fields. Structured and sensitive fields remain typed or native.
- PWA repair: `/share-contact` now exists, the service worker preserves the one-shot share payload, and direct or failed shares fall back to an editable manual form.

## Verification evidence

- Unit and component tests: 74 passed across 12 files.
- TypeScript: passed with `tsc --noEmit`.
- Lint: passed with 0 errors and 15 pre-existing warnings.
- Production build: passed with Vite 5.4.21.
- Diff quality: `git diff --check` passed.
- Secret scan: no GitHub, Supabase, or Vercel access-token pattern exists in tracked or new repository files.
- Responsive browser range: 320, 360, 390, 430, 600, 720, 820, 1024, 1280, and 1440 widths across public, auth, capture, saved, ask, result, share, privacy, and terms states.
- Mobile legal/privacy readback: zero horizontal overflow at 390px; standalone controls meet the 44px floor.
- Authenticated persistence: synthetic contact `Circle E2e Aug10 2034z` and meeting context `Codex E2E Lab` survived refresh and exact-name retrieval.
- Idea recovery: when remote ranking failed, the app surfaced a saved person using only stored title, company, tags, notes, and dossier evidence.
- Microphone recovery: a stalled permission prompt changes to `Opening...`, times out after 12 seconds, releases any late stream, and returns a clear type-instead path.

## Known non-blockers

- The production bundle reports a large-chunk warning. It does not block this interaction release; route-level code splitting is a separate performance task.
- Browserslist data is stale and Vite reports two dependency-option deprecations during tests. Both are build-maintenance tasks, not runtime blockers.
- The iOS Shortcut transport described in `docs/screenshot-to-contact.md` is not shipped. iOS users can still paste, type, speak, or add a photo inside Circle.
- A real microphone transcription could not run inside the controlled browser because it cannot grant hardware access. The permission, recording, transcription, and error states are covered by component tests; final hardware proof should use one real phone after production promotion.

## External state and cleanup

- The synthetic contact and meeting-context tag remain in the authorised test account. Deleting them is destructive and requires a separate exact approval.
- Existing authenticated provider sessions were used. Access tokens pasted into chat were not used, copied, logged, or stored and should be revoked and replaced.
- Local provider configuration remains git-ignored. No secret value was read into release evidence.

## Next release action

Push `codex/circle-hinge-release`, open a draft pull request, wait for the Vercel preview for the exact commit, run preview readback, then promote that exact verified deployment to production. Keep `dpl_9jK4JKvqpjrT1Kngg6quprX6aaN5` as the rollback target.

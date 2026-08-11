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
- Product release: pull request `#142` merged to `main` as `d9ca79cbee2482984ac87f9f3c1ade449bd91cb8`.
- Installed-app copy correction: pull request `#143` merged to `main` as `0540073a4086f49277647dec5deb79045eeafa4d`.
- Verified production deployment: `dpl_GquLpN47xnJTLBSmRy59dcZ4uUxF`, READY and serving the `circle.fractionl.ai` alias from commit `0540073a4086f49277647dec5deb79045eeafa4d`.
- Production URL: `https://circle.fractionl.ai`
- Pre-release production baseline: `dpl_9jK4JKvqpjrT1Kngg6quprX6aaN5`
- Rollback result: not used. The pre-release baseline remains the known-good recovery target for this release.
- Supabase project: `ksyuwacuigshvcyptlhe`
- Backend release: migration `20260811014533_extend_dsar_coverage.sql` is applied; a post-release dry run reports the remote database is up to date. `cron-reengage` is ACTIVE at version 11 and `send-push` is ACTIVE at version 17. No function was invoked manually and no notification was sent during release verification.

## What is complete

- Approved Hinge surface: one adaptive plane for keeping a clue or finding one person.
- Front door and account handoff: one clear visual story, one pending clue carried through sign-in, and consistent Circle styling.
- Contact intake: text, link, email, voice, photo, supported device contacts, and Android PWA share-target input.
- Meeting context: one optional plain-language field with voice input.
- Recall: exact saved-name lookup works without an LLM or paid search. Described-person and idea flows recover with grounded local evidence when remote ranking is unavailable.
- Whole-app consistency: shared brand, colour, type, spacing, focus, and control sizing across home, auth, settings, privacy, terms, and share intake.
- Voice: shared Whisper input on all free-form clue, ask, meeting, and positioning fields. Structured and sensitive fields remain typed or native.
- PWA repair: `/share-contact` now exists, the service worker preserves the one-shot share payload, and direct or failed shares fall back to an editable manual form.
- Privacy repair: export and erasure discover the live erasable `user_id` surface, with only the three documented legal-hold tables retained separately.
- Re-engagement repair: the weekly sweep no longer reads or describes retired Plan decisions. It contacts no one unless the existing cron runs and a saved person qualifies as quiet.

## Verification evidence

- Unit and component tests: 74 passed across 12 files.
- TypeScript: passed with `tsc --noEmit`.
- Lint: passed with 0 errors and 15 pre-existing warnings.
- Production build: passed with Vite 5.4.21.
- Diff quality: `git diff --check` passed.
- Secret scan: no GitHub, Supabase, or Vercel access-token pattern exists in tracked or new repository files.
- DSAR schema comparison: every current local erasable `user_id` table is discoverable by the catalog rule; the release also tolerates production schema-history drift instead of naming missing tables.
- Background function comparison: the pre-release production source was downloaded before changes; no production notification was invoked during verification.
- Responsive browser range: 320, 360, 390, 430, 600, 720, 820, 1024, 1280, and 1440 widths across public, auth, capture, saved, ask, result, share, privacy, and terms states.
- Mobile legal/privacy readback: zero horizontal overflow at 390px; standalone controls meet the 44px floor.
- Authenticated persistence: synthetic contact `Circle E2e Aug10 2034z` and meeting context `Codex E2E Lab` survived refresh and exact-name retrieval.
- Idea recovery: when remote ranking failed, the app surfaced a saved person using only stored title, company, tags, notes, and dossier evidence.
- Microphone recovery: a stalled permission prompt changes to `Opening...`, times out after 12 seconds, releases any late stream, and returns a clear type-instead path.
- Post-merge route readback: `/`, `/share-contact`, `/privacy`, and `/terms` passed on the final production deployment at mobile and desktop widths with no horizontal overflow, console errors, or interactive target below 44px.
- Post-merge recall readback: exact-name recall returned `Circle E2e Aug10 2034z`; the idea prompt `Who could help me with a Codex E2E Lab idea?` returned the same person with the stored `met:Codex E2E Lab` tag as its reason.
- Production asset readback: `sw.js`, `site.webmanifest`, `llms.txt`, and `agent.json` returned HTTP 200. The installed-app push fallback uses current Circle language.
- Production observability: Vercel reported no error or fatal logs and no runtime error clusters for the final application deployment during the verification window.

## Known non-blockers

- The production bundle reports a large-chunk warning. It does not block this interaction release; route-level code splitting is a separate performance task.
- Browserslist data is stale and Vite reports two dependency-option deprecations during tests. Both are build-maintenance tasks, not runtime blockers.
- The iOS Shortcut transport described in `docs/screenshot-to-contact.md` is not shipped. iOS users can still paste, type, speak, or add a photo inside Circle.
- A real microphone transcription could not run inside the controlled browser because it cannot grant hardware access. The permission, recording, transcription, and error states are covered by component tests; final hardware proof should use one real phone after production promotion.
- Post-migration schema lint is clean for the repaired export and erasure functions. It still reports three pre-existing orphaned Google Sheets token functions that reference the intentionally removed `sheets_integrations` table; active Circle source does not call them, and their cleanup is recorded in `SECURITY.md` rather than folded into this release.

## External state and cleanup

- The synthetic contact and meeting-context tag remain in the authorised test account. Deleting them is destructive and requires a separate exact approval.
- Existing authenticated provider sessions were used. Access tokens pasted into chat were not used, copied, logged, or stored and should be revoked and replaced.
- Local provider configuration remains git-ignored. No secret value was read into release evidence.

## Release procedure

The release head must pass local checks and an exact-SHA Vercel preview before it moves to `main`. After `main` deploys, verify the live source revision, public routes, authenticated primary task, PWA assets, and runtime errors. If a primary or adjacent route fails, restore `dpl_9jK4JKvqpjrT1Kngg6quprX6aaN5` and diagnose from the failed production revision.

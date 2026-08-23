# Fractionl Circle delivery state

Last verified: 2026-08-11 (release evidence below). Documentation reconciled against source: 2026-08-23.

## Product contract

- Promise: remember anyone, work through an idea, and bring back the right person when they can help.
- Primary flow: People for add/import/browse/ask, Ideas for new/recent/reopen/validate, and You for profile/connections/reminders/privacy/account.
- Interface rule: use short words a 12-year-old can understand. Dedupe, enrichment, routing, provider recovery, and edge cases stay behind the scenes.
- Safety rule: never invent relationship facts, silently send a message, or hide uncertainty.
- Fit rule: no horizontal overflow, clipped control, nested component scrollbar, target below 44px, or stranded one-word hero line from 320px through 1440px.

## Release truth

- Current unified-workspace release: pull request `#146` merged to `main` as `13ef88277d7a2bc149745ebf2e944e84367148c6`; public-language and typography closeout pull request `#147` merged as `8959f49d18685993af352da4c3738ad063b90dfe`.

- Repository: `krishanraja/fractionl-circle`
- Product release: pull request `#142` merged to `main` as `d9ca79cbee2482984ac87f9f3c1ade449bd91cb8`.
- Installed-app copy correction: pull request `#143` merged to `main` as `0540073a4086f49277647dec5deb79045eeafa4d`.
- Verified application release deployment: `dpl_GquLpN47xnJTLBSmRy59dcZ4uUxF`, READY and verified from application commit `0540073a4086f49277647dec5deb79045eeafa4d`.
- Documentation closeout: pull request `#144` merged as `90ccad37af37278a8858f058253d387b421f88c0`. Resolve the current production deployment live before any future release action; a static deployment ID is evidence for this release, not a permanent pointer.
- Unified workspace release: pull request `#146`; exact-head preview `dpl_C6MreARrms4nQe4yhuiNbwaaEozG` was READY, authenticated readback passed, and every required GitHub check passed.
- Public consistency closeout: pull request `#147`; exact-head preview `dpl_84kJWFVRDcVQDeYWgRGTAqvzKAzU` was READY, authenticated metadata readback passed, and every required GitHub check passed.
- Verified unified-workspace production deployment: `dpl_Ewz4aZPeCHaQ5je9g7CPM6c3KQot`, READY and live from application commit `8959f49d18685993af352da4c3738ad063b90dfe`.
- Release documentation closeout: pull request `#148`.
- Documentation baseline before the agent-training release: `dpl_8JopYirGxDULcxR4vVYe9eQs8pS8`, READY, from pull request `#148` on `main` at `3e0c920bfcddeeb4ded40c7af735aa9833c5666f`.
- Agent-ready documentation release: pull request `#149` merged to `main` as `92f11e549cf3452c84efde35a3ce6c0a66d32dac`; production deployment `dpl_DwBjYGzsANsGPm83t6khYrjEw4hw` was READY and live from that exact revision. Resolve the active production deployment live before future release work rather than treating this dated evidence as a permanent pointer.
- Documentation follow-up: pull request `#150` merged to `main` as `a20ec96074760ab0e9a6a471530f0834b1655b51`, recording the `#149` evidence above. No separate deployment.
- **Fractionl brand identity: pull request `#151` merged to `main` as `509ed94092c829eb3e4a5811ab795774e38fc1f2`.** This shipped real product changes (wordmark/icon across auth, favicon, and social surfaces; see `docs/PRODUCT.md` and the "Fractionl ownership signature" entry in `docs/DESIGN_DECISIONS.md`). No production deployment ID, preview readback, or post-merge route verification for this release is recorded anywhere in this repository. Treat `#151` as released-but-unverified until someone resolves the live Vercel deployment and repeats the readback in the Release procedure below.
- Design-mock archive: pull request `#152` merged to `main` as `474d4939dad770b7eeb307a9ca63cc9761950b8d`. Docs-only; adds `docs/mocks/circle-restored-r1.html` as a historical artifact. No release verification required.
- Documentation reconciliation: pull request `#153` merged to `main` as `7cdf4c5bd9f2fdec371731ddedd832224c39b962`, recording the `#150`-`#152` evidence above and bumping review dates across the canonical, compliance, and integration docs. Docs-only; no release verification required.
- **Front door layout fixes: pull request `#154` merged to `main` as `55f2d5aa90a86ed82177e639a3d0aca53a17ae16`.** Restores the existing fit rule above (no clipped control, overlapping headline, or overflowing button from 320px through 1440px) rather than changing any product claim, route, or price; no product doc needed an edit. `e2e/front-door.spec.ts` and a 22-viewport scripted audit (320-1920px, entry and join states) passed pre-merge. No production deployment ID, preview readback, or post-merge route verification for this release is recorded anywhere in this repository. Treat `#154` as released-but-unverified until someone resolves the live Vercel deployment and repeats the readback in the Release procedure below.
- Production URL: `https://circle.fractionl.ai`
- Previous release baseline: `dpl_9jK4JKvqpjrT1Kngg6quprX6aaN5`
- Production baseline before the unified workspace: `dpl_FTV9maqNCp7yBayZQFSiWCWWBLnB` (READY on 2026-08-11).
- Rollback result: not used. Both production promotions passed live verification; resolve the active production deployment again before any future release.
- Supabase project: `ksyuwacuigshvcyptlhe`
- Backend release: migration `20260811014533_extend_dsar_coverage.sql` is applied. Read-only verification on 2026-08-11 confirmed `cron-reengage` ACTIVE at version 11, `send-push` ACTIVE at version 17, and the target migration present in both histories. The wider migration histories are not identical: several older local migrations have no remote history row. Do not describe the whole remote database as up to date until that historical drift is reconciled. No function was invoked manually and no notification was sent during release verification.

## Current unified workspace release

- Unified workspace: People, Ideas, and You are always one tap away on desktop and mobile.
- People: plain-English ask, complete contact browse/search, one-person add, LinkedIn/CRM file import, and Google/Microsoft connection entry points.
- Ideas: recent saved ideas, new idea capture, exact-run reopen, and the existing validation/journey/warm-reach engine.
- You: profile summary and direct entry to connections, reminders, appearance, AI preferences, privacy, account, and sign out.
- Front door and account handoff: one clear visual story in plain language with the pending person note carried through sign-in.
- Contact intake: text, link, email, voice, photo, Android PWA share, bulk files, Google, and Microsoft. (A device-contact-picker path exists in `src/pathroom/hinge.ts` but was never mounted in the active add flow; earlier release evidence that listed it as live was inaccurate.)
- Meeting context: one optional plain-language field with voice input.
- Recall: exact saved-name lookup works without an LLM or paid search. Described-person and idea flows recover with grounded local evidence when remote ranking is unavailable.
- Whole-app consistency: the approved Circle tokens govern the workspace, overlays, deep idea flow, auth, settings, privacy, terms, and share intake. The existing data and feature systems were reused rather than duplicated.
- Voice: shared Whisper input on free-form person, ask, meeting, idea, and positioning fields. Structured and sensitive fields remain typed or native.
- PWA repair: `/share-contact` now exists, the service worker preserves the one-shot share payload, and direct or failed shares fall back to an editable manual form.
- Privacy repair: export and erasure discover the live erasable `user_id` surface, with only the three documented legal-hold tables retained separately.
- Re-engagement repair: the weekly sweep no longer reads or describes retired Plan decisions. It contacts no one unless the existing cron runs and a saved person qualifies as quiet.

## Verification evidence

- Unit and component tests: 77 passed across 13 files.
- Browser E2E: public front door, signed-in People → Ideas → You, and front-door handoff stories passed on desktop Chrome and Pixel 7 emulation (6 project/spec cases).
- TypeScript: passed with `tsc --noEmit`.
- Lint: passed with 0 errors and 15 pre-existing warnings.
- Production build: passed with Vite 5.4.21.
- Diff quality: `git diff --check` passed.
- Secret scan: no GitHub, Supabase, or Vercel access-token pattern exists in tracked or new repository files.
- DSAR schema comparison: every current local erasable `user_id` table is discoverable by the catalog rule; the release also tolerates production schema-history drift instead of naming missing tables.
- Background function comparison: the pre-release production source was downloaded before changes; no production notification was invoked during verification.
- Responsive browser evidence: the current release passed 1440×960 desktop and Pixel 7 emulation for public, People, add-person overlay, Ideas, new-idea entry, and You, with automated horizontal-overflow assertions. The preceding release retains the broader 320–1440 route matrix below.
- Mobile legal/privacy readback: zero horizontal overflow at 390px; standalone controls meet the 44px floor.
- Authenticated persistence: synthetic contact `Circle E2e Aug10 2034z` and meeting context `Codex E2E Lab` survived refresh and exact-name retrieval.
- Idea recovery: when remote ranking failed, the app surfaced a saved person using only stored title, company, tags, notes, and dossier evidence.
- Microphone recovery: a stalled permission prompt changes to `Opening...`, times out after 12 seconds, releases any late stream, and returns a clear type-instead path.
- Post-merge route readback: `/`, `/share-contact`, `/privacy`, and `/terms` passed on the final production deployment at mobile and desktop widths with no horizontal overflow, console errors, or interactive target below 44px.
- Post-merge recall readback: exact-name recall returned `Circle E2e Aug10 2034z`; the idea prompt `Who could help me with a Codex E2E Lab idea?` returned the same person with the stored `met:Codex E2E Lab` tag as its reason.
- Production metadata and typography: desktop and Pixel 7 E2E confirmed the plain-English title and description, zero external font stylesheets, and no visible `clue` language on the public front door.
- Production asset readback: `sw.js`, `site.webmanifest`, `llms.txt`, `agent.json`, and `og-image.png` returned HTTP 200. The installed-app and social assets use current Circle language.
- Production observability: Vercel reported no error or fatal logs and no runtime error clusters for the final application deployment during the verification window.

## Known non-blockers

- The production bundle reports a large-chunk warning. It does not block this interaction release; route-level code splitting is a separate performance task.
- Browserslist data is stale and Vite reports two dependency-option deprecations during tests. Both are build-maintenance tasks, not runtime blockers.
- The iOS Shortcut transport described in `docs/screenshot-to-contact.md` is not shipped. iOS users can still paste, type, speak, or add a photo inside Circle.
- A real microphone transcription could not run inside the controlled browser because it cannot grant hardware access. The permission, recording, transcription, and error states are covered by component tests; final hardware proof should use one real phone after production promotion.
- Post-migration schema lint is clean for the repaired export and erasure functions. It still reports three pre-existing orphaned Google Sheets token functions that reference the intentionally removed `sheets_integrations` table; active Circle source does not call them, and their cleanup is recorded in `SECURITY.md` rather than folded into this release.
- Supabase migration history contains several older local-only rows even though the approved DSAR migration is present remotely. Treat each future migration as an exact, reviewed target and reconcile history separately before relying on a global `up to date` claim.
- The front-door H1 (`src/components/AuthPage.tsx`) reads "Find the right person later.", while the canonical Promise in `docs/PRODUCT.md` and `AGENT_BRIEFING.md` reads "Find the right person when they can help." This wording gap predates this review; resolve it by aligning the front-door copy or updating the canonical Promise, whichever reflects current intent, rather than leaving the two to disagree.

## External state and cleanup

- The synthetic contact and meeting-context tag remain in the authorised test account. Deleting them is destructive and requires a separate exact approval.
- Existing authenticated provider sessions were used. Access tokens pasted into chat were not used, copied, logged, or stored and should be revoked and replaced.
- Local provider configuration remains git-ignored. No secret value was read into release evidence.

## Release procedure

The release head must pass local checks and an exact-head Vercel preview before it moves to `main`. When preview protection is enabled, use authenticated Vercel readback without weakening protection and pair it with the exact-head local browser matrix. Before merging, resolve and record the active production deployment as the rollback target. After `main` deploys, verify the live revision, public routes, authenticated primary task, PWA and social assets, metadata, and runtime errors. If a primary or adjacent route fails, restore the recorded active deployment and diagnose from the failed production revision.

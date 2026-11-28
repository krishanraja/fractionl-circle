# History log

Newest first. Entries are written by the docs steward (see the steward link in
NOW.md) and by humans doing the same job by hand. Nothing in this file
describes current behaviour; NOW.md and the state doc do. This repo's archive
is `docs/_archive/`; this log indexes it. `docs/history/` holds only this file.

## 2026-11-28

- rolled from NOW.md: 2026-10-28 **Closeout hook and canon block refreshed, no product change** (PRs #166 and #171, `9e24f5d`, `749fd5e`). The canon block in `AGENTS.md` moved to release v2026.10.27.2, and the repository-administration publisher updated `.claude/hooks/harness-closeout.mjs` and `.github/workflows/harness-repository-context.yml`. `src/`, Supabase and pricing did not change; the lifecycle stays `dormant`.
- stamped at `2b59b06`: no non-steward commits since. `NOW.md` `as_of` moved to 2026-11-28. The North Star check (2026-10-23) is 36 days old against a limit of 7; the steward never writes `holds`, so it stays for a session that re-reads the North Star.

## 2026-11-25

- rolled from NOW.md: 2026-10-23 **The North Star now has a number, a weekly ladder and an urgency rating, so every session knows how far behind it is and how hard to push.** Ruling (Krish, 2026-10-23): every repository chases one aggressive number on a weekly ladder, and urgency U1 to U5 sets its intensity. The number and ladder are in `docs/NORTH_STAR.md`; where it stands is the first line under "Where it is right now". Contract: ai-harness `contract/north-star-metric.md`.
- reconciled at `2b59b06`: #179 changed the canon block and #180 stopped the Monday brief in `supabase/`. `NOW.md` head and `as_of` moved, two bullets added, the lifecycle bullet corrected. The North Star check (2026-10-23) is 33 days old against a limit of 7; the steward never writes `holds`, so it stays for a session that re-reads the North Star.

## 2026-11-19

- rolled from NOW.md: 2026-10-19 **Operating companies named on every public surface.** Ruling (Krish, 2026-10-19): every business site names Mindmaker LLC (USA) and Mindmaker Ltd (UK) in a subtle footer note and in its terms and privacy. The front-door footer and the legal pages now carry "Circle is a Mindmaker LLC company. Mindmaker Ltd in the UK."; `/terms` and `/privacy` (both the signed-out prompt and the signed-in settings) carry a "Who we are" operator statement, the responsibility line, a contact address and "Last updated: 19 October 2026"; the legal pages gained a Privacy and Terms footer; `public/sitemap.xml` lastmod moved to 2026-10-19. The strings live once in `src/components/legal/company.ts`. No company number, address or jurisdiction was added, and `docs/privacy-policy.md` stays an unpublished draft.
- reconciled at `bf60227`: PR #177 changed only the canon block in `AGENTS.md`. `NOW.md` head and `as_of` moved and one bullet was added. The North Star check (2026-10-23) is 27 days old against a limit of 7; the steward never writes `holds`, so it stays for a session that re-reads the North Star.

## 2026-11-18

- rolled from NOW.md: 2026-10-18 **Device-contact import removed from every public claim** (PR #165, `5e0c037`). Docs, `public/llms.txt` and `public/agent.json` had listed a "supported device contact" input as live; the cleanup traced it to `src/pathroom/hinge.ts`, which is not mounted in the active add flow in `src/components/circle/AddToCircleSheet.tsx`, and the delivery state now says earlier documentation "overstated current source". The same pass corrected `docs/microsoft-oauth-setup.md`, which told readers not to add `Mail.*` scopes while source still requests them. Superseded audit histories were kept without restoring retired product claims.
- rolled from NOW.md: 2026-10-18 **North Star added** (`c04e881`, `9a548be`). `docs/NORTH_STAR.md` gained a Horizon: Circle is dormant, and if it wakes the aim is a thousand operators getting a useful recall every week within three months. Ruling (Krish, 2026-10-18): "every repository has a North Star, and every session anchors to it"; timeframes assume agents do the work. Set by Krish, not reached.
- stamped at `ec83f57`: no non-steward commits since. `NOW.md` `as_of` moved to 2026-11-18. The North Star check (2026-10-23) is 26 days old against a limit of 7; the steward never writes `holds`, so it is left for the next session that re-reads the North Star.

## 2026-11-17

- rolled from NOW.md: 2026-10-17 **Repository administration added** (PR #163, `eddcbde`; canon block to v2026.10.17.1, `461f020`). Adds `docs/HARNESS_CONTEXT.md`, `CLAUDE.md` thinned to `@AGENTS.md` and a hash and budget check workflow. No product, Supabase or pricing change.
- rolled from NOW.md: 2026-10-16 **Canon block resynced in `AGENTS.md`** (PR #161, `b50f6a7`). The block moved to canon release v2026.10.15.2. Only the text between the krish-canon markers changed. No product, Supabase or pricing change; the lifecycle stays `dormant`.
- stamped at `ec83f57`: PR #176 changed only the canon block in `AGENTS.md`. `NOW.md` head and `as_of` moved and one bullet was added. The North Star check (2026-10-23) is 25 days old against a limit of 7; the steward never writes `holds`, so it stays for a session that re-reads the North Star.

## 2026-11-15

- rolled from NOW.md: 2026-10-15 Docs steward now called from `krishanraja/ai-harness` (PR #162, `8aa317a`). The commit body gives the reason: "control-center goes private on 2026-10-15, and a public repository cannot call a reusable workflow in a private one." The steward's workflow, runbook, schema, fleet manifest and scripts moved unchanged. No product, Supabase or pricing change.
- stamped at `fb489e0`: no non-steward commits since. `NOW.md` `as_of` moved to 2026-11-15. The North Star check (2026-10-23) is 23 days old against a limit of 7; the steward never writes `holds`, so it is left for the next session that re-reads the North Star.

## 2026-11-11

- stamped at `287f0c7`: no non-steward commits since. `NOW.md` `as_of` moved to 2026-11-11. The North Star check (2026-10-23) is 19 days old against a limit of 7; the steward never writes `holds`, so it is left for the next session that re-reads the North Star.

## 2026-11-06

- rolled from NOW.md: 2026-10-06 Canon block resynced in `AGENTS.md` (PR #160, `fbc2e36`); the block moved through five canon releases in one PR, up to v2026.10.05.1, and only the text between the krish-canon markers changed. No product, Supabase or pricing change.
- stamped at `287f0c7`: no non-steward commits since. `NOW.md` `as_of` moved to 2026-11-06. The North Star check (2026-10-23) is 14 days old against a limit of 7; only a session that re-reads the North Star can re-date it, so it is left for the next session.

## 2026-10-31

- stamped at `287f0c7`: PRs #172 to #174 changed only the canon block in `AGENTS.md`. `NOW.md` head and `as_of` moved and one bullet was added. No product, Supabase or pricing change.

## 2026-10-29

- reconciled at `749fd5e`: `NOW.md` head moved to `749fd5e` and `as_of` to 2026-10-29; the dormant lifecycle line was cut from a long commit-by-commit history to a short summary (audit rule max_line_chars), a "What changed recently" bullet added for PRs #166 and #171, and a single "- Next" line added (audit rule next_step). The cut text named PRs #155 to #162, #165, #169 and #170 and their commit ids, all recorded in git history and the bullets above.

## 2026-10-23

- stamped at `423f872`: PR #170 changed only the repository-administration closeout hook and its workflow, and the North Star number commit was already closed out in `NOW.md` by its session. `NOW.md` head moved and its commit summary extended; no other document changed.

## 2026-10-22

- stamped at `d12b40a`: PR #169 added only the repository-administration closeout hook, its settings entry and its workflow change. No product, Supabase, pricing or documentation consequence; `NOW.md` head and date moved, no other document changed.

## 2026-10-19

- reconciled at `3967fe3`: PRs #167 and #168 named Mindmaker LLC and Mindmaker Ltd on the public footer, terms and privacy pages. The same PRs already updated the `NOW.md` prose, `docs/PRODUCT.md`, `CHANGELOG.md` and `public/llms.txt`, so only the `NOW.md` head (from `a86a0ad`) and the "as of" heading date needed the stamp.

## 2026-10-18

- reconciled at `a86a0ad`: removed the unmounted device-contact picker from the two remaining live claims (`docs/PRODUCT.md` iOS paragraph, `docs/MARKETING_AND_SALES.md` iPhone paragraph) to match PR #165 and the truth files; `NOW.md` head moved to `a86a0ad`, `as_of` to 2026-10-18, three bullets added. Stamps bumped on those two files only.

## 2026-10-16

- reconciled at `1ce09e5`: only the `AGENTS.md` canon block moved (PR #161, v2026.10.15.2); `NOW.md` head moved to `1ce09e5`, `as_of` to 2026-10-16, one bullet added. No other document needed change.

## 2026-10-10

- rolled from NOW.md: 2026-09-08 canon block adopted in `AGENTS.md` (PRs #155, #156, #158, #159, one same-day header fix). Why: "Every AGENTS.md in the fleet now reads off one canon, rendered from krishanraja/ai-harness. Before this, the canon was well governed and had never reached a product repository: this repo referenced it zero times." The header's freshness claim outside the markers was corrected the same day: "the push half was never true: claude-code-action refuses the push event."
- rolled from NOW.md: 2026-09-07 docs steward adopted (`NOW.md`, `docs/history/LOG.md`, `.github/workflows/docs-steward.yml`). Why: the repo had been silent for 19 days with two root audit reports carrying no status header, an archive README naming a superseded product as the one that shipped, and no single file saying the repo was dormant. The audits moved to `docs/_archive/`; nothing was deleted.
- reconciled at `fbc2e36`: no commits to the product or docs since 2026-10-06; `NOW.md` `as_of` moved to 2026-10-10 and the two bullets above rolled once they passed 30 days.

## 2026-09-22

- rolled from NOW.md: 2026-08-19 front door fit repair (PR #154, `55f2d5a`). Why: five layout faults on the public front door, "all reproduced in a browser from 320px through 1920px". The add-a-person field was a fixed 56px box with `overflow: hidden`, so the two-line prompt "was sliced in half by the underline"; the headline at up to 84px needed about 892px in a 760px column and ran over the paragraph beside it, "worst at 1024px"; in the join state a 172px action column held a Google button whose own minimum is 217px. The fit rule in `docs/DELIVERY_STATE.md` forbids every one of these, and the previous release's responsive evidence had passed.
- rolled from NOW.md: 2026-08-16 documentation reconciled with PRs #150 to #152 (PR #153, `21510c1`). Why: `DELIVERY_STATE.md` and `CHANGELOG.md` had stopped at #149 while the brand release #151 had shipped real product changes with no deployment id anywhere in the repo. It was flagged released-but-unverified "rather than backfilled with invented evidence".

## 2026-09-14

- rolled from NOW.md: 2026-08-12 `.vercel.run` hosts allowed on the Vite dev server (`7c6a5b7`). Why: Vite's dev-server Host header check, a DNS-rebinding guard, rejects anything outside its allowlist, and cloud preview sandboxes serve the app through a per-session `sb-<id>.vercel.run` hostname that can never be listed, so every preview failed with "Blocked request". The `.vercel.run` wildcard was allowed rather than setting `allowedHosts: true`, so the check keeps protecting every other host.

## 2026-09-11

- rolled from NOW.md: 2026-08-11 Fractionl brand identity (PR #151) and restored workspace mock archived (PR #152); wordmark on public and account surfaces, bronze reserved for the ownership seal, violet kept as Circle's only action colour.
- rolled from NOW.md: 2026-08-11 unified People, Ideas and You workspace (PRs #146 to #150), restoring contact browsing, add and import paths, idea reopen and a first-class profile after the 2026-08-10 release had collapsed Circle to one adaptive surface; #149 shipped the agent training pack and taught `scripts/check-docs.mjs` to catch promise, route and pricing drift.
- rolled from NOW.md: 2026-08-10 one clue, one useful person (PRs #142 to #145), replacing the dashboard-led experience with one adaptive surface; added shared voice input, the Android share-target route, and DSAR export and erasure over the live user-owned schema.

## 2026-09-09

- reconciled at `b2ba929`: five commits since `5ac840e` (2026-09-08, PRs #155, #156, #158, #159, and a header wording fix) added and synced the shared canon block inside `AGENTS.md`, marker-delimited and rendered from `krishanraja/ai-harness`. Canon markers are never edited here; the file's own header (outside the markers) already carried the corrected freshness wording, so nothing there needed a fix.
- reconciled at `b2ba929`: `DOCS.md` and `README.md` did not list the new `AGENTS.md` in their documentation maps. Both gained one line naming it; no other content in either file needed a check, so only these two files moved.
- reconciled at `b2ba929`: `NOW.md` head moved to `b2ba929`, `as_of` to 2026-09-09; the dormant lifecycle line now names the five AGENTS.md-only commits instead of reading "no commits since".

## 2026-09-07

- decision: docs steward adopted for this repo, Krish, 2026-09-07. The history log lives here; superseded files keep moving to the existing `docs/_archive/` (DOCS.md: "Their directory or dated filename is the warning label"), never to a second archive directory.
- moved `AUDIT_2026-04-24.md` to `docs/_archive/AUDIT_2026-04-24.md`, superseded by `docs/DELIVERY_STATE.md`, because it audited the repo at `da6a235` (April 2026) and sat at the repo root with no status header; last touched 2026-07-02. Body verbatim below the banner.
- moved `NON_FUNCTIONAL_AUDIT_REPORT.md` to `docs/_archive/2026-07-02-NON_FUNCTIONAL_AUDIT_REPORT.md`, superseded by `docs/DELIVERY_STATE.md`, because it was a browser audit against commit `e788ac4` (May 2026) at the repo root with no status header. The date prefix is its last commit, 2026-07-02. Body verbatim below the banner.
- archived `docs/_archive/UX_REBUILD_VISION_2026-06-03.md`: the ground-up "chief of staff" vision for a relationship-to-revenue CRM (June 2026), superseded by the June pivots and the 2026-08-11 workspace.
- archived `docs/_archive/PRODUCT_DIAGNOSIS_2026-06-16.md`: the 14-finding diagnosis at `9625e21` that opened the June 2026 rebuild.
- archived `docs/_archive/DREAM_STATE_VISION_2026-06-17.md`, `docs/_archive/DESIGN_LANGUAGE_2026-06-17.md` and `docs/_archive/BUILD_PLAN_2026-06-17.md`: the Path Room, the intermediate direction before the thesis-validation engine, with its design language and build plan.
- archived `docs/_archive/roadmap.md`: the old Circle roadmap (the 90-day plan, Phases 1 to 11, and the April 2026 audit follow-ups). The only roadmap in the repo; no current one exists.
- archived `docs/_archive/README.md`: the archive's own index; its product line corrected today, see the reconciled line below.
- archived `_upgrade/fractionl-circle/OS-HANDOFF.md`, `_upgrade/fractionl-circle/PHASE-0.md` and `_upgrade/fractionl-circle/PHASE-1.md`: the 2026-05-30 Mindmaker OS attribution handoff and the phase 0 recon and phase 1 vision. Classed historical by DOCS.md; the tiers and prices in them are not current.
- archived `docs/VALUE_SHARPENING_2026-07-03.md` (stays in place; historical by DOCS.md's classification and its own banner): the July 2026 "chief of staff that remembers" sharpening pass. The Plan and thesis surfaces it describes are not in current navigation.
- archived `docs/icp-archetype.md` (stays in place; historical by DOCS.md's classification and its own banner): the fractional-executive archetype research; market figures not reverified for the current release.
- reconciled at `5ac840e`: `docs/_archive/README.md` said the product that shipped was the thesis-validation engine. The code mounts a People, Ideas and You workspace (`src/pathroom/CircleWorkspace.tsx`, via `src/pathroom/CircleApp.tsx` from `src/App.tsx`) with the thesis engine (`ThesisApp.tsx`) as the Ideas destination. Sentence corrected; the two moved audits added to its index.
- reconciled at `5ac840e`: `docs/DELIVERY_STATE.md` gained a Release truth line for PR #154 (2026-08-19), which had updated `CHANGELOG.md` but not the state doc, and a 2026-09-07 read-only readback showing the deployed bundle carries #151 and #154. Its reconciliation date moved to 2026-09-07; its release verification date stays 2026-08-11 because no full Release-procedure readback was run.
- reconciled at `5ac840e`: `public/agent.json` and `public/llms.txt` checked against `src/App.tsx` routes, `src/lib/tiers.ts` and the workspace destinations; product content unchanged and accurate. Each gained a pointer to `NOW.md` and a 2026-09-07 date.
- reconciled at `5ac840e`: `README.md` and `DOCS.md` now list `NOW.md` and `docs/history/LOG.md`; DOCS.md's Historical section names the two archived audits by path instead of "dated root audit reports".
- reconciled at `5ac840e`: `NOW.md` written for the first time, lifecycle `dormant` (no commit to `main` since 2026-08-19).
- reconciled at `fb489e0` (2026-11-14): `NOW.md` re-stamped after canon sync #175; no product change. The North Star check line stays dated 2026-10-23 because only a session that re-reads the North Star can re-date it.
- reconciled at `3aab15e` (2026-11-20): `NOW.md` re-stamped after canon sync #178; no product change. The North Star check line stays dated 2026-10-23 because only a session that re-reads the North Star can re-date it; the audit finding is left for that session.
- reconciled at `2b59b06` (2026-11-27): `NOW.md` re-stamped; no product change since #180. The North Star check line stays dated 2026-10-23 because only a session that re-reads the North Star can re-date it; the audit finding is left for that session.

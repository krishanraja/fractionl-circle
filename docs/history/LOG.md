# History log

Newest first. Entries are written by the docs steward (see the steward link in
NOW.md) and by humans doing the same job by hand. Nothing in this file
describes current behaviour; NOW.md and the state doc do. This repo's archive
is `docs/_archive/`; this log indexes it. `docs/history/` holds only this file.

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

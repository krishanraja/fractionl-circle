---
repo: krishanraja/fractionl-circle
product: Circle by Fractionl
as_of: 2026-10-19
head: a86a0ad
lifecycle: dormant
production_url: https://circle.fractionl.ai
state_doc: docs/DELIVERY_STATE.md
history_log: docs/history/LOG.md
truth_files: [public/agent.json, public/llms.txt]
authority_order: [rendered production behaviour and the deployed source revision, docs/PRODUCT.md, docs/NORTH_STAR.md, current source and tests, docs/MARKETING_AND_SALES.md, AGENT_BRIEFING.md, dated decision and compliance records, docs/_archive/ and _upgrade/ for history only]
steward: https://github.com/krishanraja/ai-harness/blob/main/docs/steward/RUNBOOK.md
never_publish: [the product name and its domain, any user or contact data including the synthetic test account and its saved people, OAuth client details, the Supabase project id, any credential or secret name, any price or entitlement that does not match src/lib/tiers.ts and the live checkout]
---
# Circle by Fractionl: where it is right now

## What it is

Circle is personal contact memory for independent operators: add a person from whatever you have, remember why they mattered, and get the right saved person back when they can help. A React and TypeScript app on Vercel with Supabase behind it, live at `circle.fractionl.ai`, with one signed-in workspace of three destinations: People, Ideas and You. The promise in `docs/PRODUCT.md` is "Remember anyone. Find the right person when they can help." Circle never sends a message on its own and never invents a relationship fact. Built by Krish Raja under the Fractionl name. Circle sits under the Mindmaker LLC (United States) and Mindmaker Ltd (United Kingdom) umbrella with the other businesses, which the footer, terms and privacy pages say.

## Who it is for and why it matters for Mindmake

Circle's own buyer hypothesis is the fractional executive or independent operator who meets useful people and does not want to run a CRM (`docs/MARKETING_AND_SALES.md`; the repo marks this a hypothesis, not proven market evidence). For Mindmake it is proof, not product. The room_face buyer (control-center `docs/ICP.md`: a senior leader at a PE or VC backed media, adtech, publishing or data business, running on relationships, quietly behind on what is coming) is being asked to believe that one person can build real software with AI and stay honest about what it is. Circle proves four things:

- **One person and AI shipped a whole product.** Auth, row-level security, edge functions, voice transcription, contact ingestion with dedupe, an Android share target, DSAR export and erasure, and a public training pack for agents. `docs/DELIVERY_STATE.md` shows how each release was verified, with the gaps left in.
- **The docs refuse to lie.** Two releases (#151, #154) shipped without a recorded deployment id and the state doc says so rather than backfilling. The training pack separates verified fact from commercial hypothesis from retired claim (`public/agent.json`, `claim_classes`). A buyer who has been sold AI certainty can see what honesty looks like in a build.
- **Direction changed in the open.** `docs/_archive/` holds a relationship-to-revenue CRM vision (June 2026), the Path Room decisioning surface, the thesis-validation engine, and then the People, Ideas and You workspace that mounted the engine as one destination. Each pivot has a dated diagnosis. The story is what to build, what to stop, and how to tell the difference.
- **The "dormant" label is itself the lesson.** Nothing has landed since 19 August 2026 and this file says so, next to the last verified state. A senior leader who runs on relationships knows the difference between a parked thing with its evidence intact and a live thing nobody can describe. Parked and honest beats live and vague.

Angle a writer can use: "the network tool I built for myself, and what it taught me about stopping": a personal-network product, built solo with AI, verified in production, left honestly parked. Objection it answers: "AI-built software is a demo that falls over." Here is one that ran, was verified route by route, and is still serving.

## Where it is right now (as of 2026-10-18)

- **Lifecycle: dormant.** The last commit that touched the product is `5ac840e` on 2026-08-19 (PR #154). Five commits landed since, on 2026-09-08, and every one of them only added or synced the canon block in `AGENTS.md` (PRs #155, #156, #158, #159, and a header wording fix); none touched `src/`, Supabase, or pricing. One more landed on 2026-10-06 (`fbc2e36`, PR #160) and touched only `AGENTS.md`. A last one on 2026-10-15 (`8aa317a`, PR #162) touched only the docs steward workflow in `.github/workflows/`. The canon block was resynced again on 2026-10-16 (`b50f6a7`, PR #161), touching only `AGENTS.md`. Between 2026-10-17 and 2026-10-18 only documentation, the repository-administration workflow and the canon block moved (see below); `src/`, Supabase and pricing did not. On 2026-10-19 the public footer, `/terms`, `/privacy` and `public/sitemap.xml` changed to name the operating companies (see below); no product behaviour, Supabase or pricing changed. There is no active roadmap. Nobody has said the product is retired; nobody has shipped to it either.
- **Live.** `https://circle.fractionl.ai` answered 200 on 2026-09-07 for `/`, `/llms.txt` and `/agent.json`. The deployed CSS bundle carries the #154 front-door rules and the #151 brand asset references, so `main` at `5ac840e` is what is serving. Read-only readback; no Vercel deployment id was resolved.
- **Last fully verified release:** PRs #146 and #147 (the unified People, Ideas and You workspace, 2026-08-11), with a production deployment id and route, recall, PWA and metadata readback recorded in `docs/DELIVERY_STATE.md`. #151 (brand) and #154 (front-door fit) are live by bundle readback but have no deployment id or full Release-procedure readback recorded.
- **Built and live per code:** People (add from text, link, email or phone in a note, voice, photo, Android PWA share (the device-contact picker in `src/pathroom/hinge.ts` is not mounted); LinkedIn or CRM file import; Google and Microsoft connection entry points; browse, search and plain-English ask), Ideas (saved ideas, new idea, exact-run reopen, relevant saved people), You (profile, connections, reminders, appearance, privacy, account). Routes `/`, `/auth`, `/share-contact`, `/privacy`, `/terms` in `src/App.tsx`; `/preview/*` are unlinked fixtures. Detail: `docs/PRODUCT.md`.
- **Pricing in code:** Free and Pro, Pro at $39 per month in `src/lib/tiers.ts`. The live checkout was not re-verified here. No trial is advertised, although the backend gives a new account a 14-day internal trialing status (`docs/PRODUCT.md`, Commercial catalogue).
- **Known gaps, unchanged since 2026-08-16:** no native iOS share intake; provider-backed search and idea ranking have failed at runtime and fall back to grounded local recall; the Supabase migration history has older local-only rows; #154's own checks recorded 27 pre-existing TypeScript errors and 80 unit tests, against the 77 tests and clean `tsc` recorded for the #146/#147 head.
- **Known doc-versus-source gap:** `supabase/functions/_shared/microsoftOauth.ts` still requests `Mail.Read` and `Mail.Send` although the product uses neither; `docs/microsoft-oauth-setup.md` now says so and says to remove them before publishing the connector.
- **No customer evidence.** The repo's own docs say no evidence supports customer counts, conversion, time saved or revenue (`AGENT_BRIEFING.md`, Important limits). The North Star funnel is not fully instrumented.

## What changed recently

- 2026-10-19 **Operating companies named on every public surface.** Ruling (Krish, 2026-10-19): every business site names Mindmaker LLC (USA) and Mindmaker Ltd (UK) in a subtle footer note and in its terms and privacy. The front-door footer and the legal pages now carry "Circle is a Mindmaker LLC company. Mindmaker Ltd in the UK."; `/terms` and `/privacy` (both the signed-out prompt and the signed-in settings) carry a "Who we are" operator statement, the responsibility line, a contact address and "Last updated: 19 October 2026"; the legal pages gained a Privacy and Terms footer; `public/sitemap.xml` lastmod moved to 2026-10-19. The strings live once in `src/components/legal/company.ts`. No company number, address or jurisdiction was added, and `docs/privacy-policy.md` stays an unpublished draft.
- 2026-10-18 **Device-contact import removed from every public claim** (PR #165, `5e0c037`). Docs, `public/llms.txt` and `public/agent.json` had listed a "supported device contact" input as live; the cleanup traced it to `src/pathroom/hinge.ts`, which is not mounted in the active add flow in `src/components/circle/AddToCircleSheet.tsx`, and the delivery state now says earlier documentation "overstated current source". The same pass corrected `docs/microsoft-oauth-setup.md`, which told readers not to add `Mail.*` scopes while source still requests them. Superseded audit histories were kept without restoring retired product claims.
- 2026-10-18 **North Star added** (`c04e881`, `9a548be`). `docs/NORTH_STAR.md` gained a Horizon: Circle is dormant, and if it wakes the aim is a thousand operators getting a useful recall every week within three months. Ruling (Krish, 2026-10-18): "every repository has a North Star, and every session anchors to it"; timeframes assume agents do the work. Set by Krish, not reached.
- 2026-10-17 **Repository administration added** (PR #163, `eddcbde`; canon block to v2026.10.17.1, `461f020`). Adds `docs/HARNESS_CONTEXT.md`, `CLAUDE.md` thinned to `@AGENTS.md` and a hash and budget check workflow. No product, Supabase or pricing change.
- 2026-10-16 **Canon block resynced in `AGENTS.md`** (PR #161, `b50f6a7`). The block moved to canon release v2026.10.15.2. Only the text between the krish-canon markers changed. No product, Supabase or pricing change; the lifecycle stays `dormant`.
- 2026-10-15 **Docs steward now called from `krishanraja/ai-harness`** (PR #162, `8aa317a`). The commit body gives the reason: "control-center goes private on 2026-10-15, and a public repository cannot call a reusable workflow in a private one." The steward's workflow, runbook, schema, fleet manifest and scripts moved unchanged, and this repository's caller and the `steward:` link above point there. No product, Supabase or pricing change; the lifecycle stays `dormant`.
- 2026-10-06 **Canon block resynced in `AGENTS.md`** (PR #160, `fbc2e36`). The block moved through five canon releases in one PR, up to v2026.10.05.1, and the commit body says why it is safe: "Only the text between the krish-canon markers changed; everything outside them is untouched." No product, Supabase or pricing change; the lifecycle stays `dormant`.

## What is next and what is waiting on Krish

- There is no active roadmap. `docs/_archive/roadmap.md` is the only one in the repo and it is archived. This file does not invent one.
- Waiting on Krish: is Circle parked, retired, or resuming? The lifecycle stays `dormant` until he says. If retired: `lifecycle: archived` here and a line in `AGENT_BRIEFING.md` and the truth files. If resuming: the first job is the full Release-procedure readback for #151 and #154 and a fresh `tsc` baseline.
- Waiting on Krish: whether the public training pack (`public/llms.txt`, `public/agent.json`) should say the product is in maintenance. Today it describes the live product accurately and says nothing about cadence. The steward did not add that claim.
- Optional cleanup, code not docs: `scripts/check-docs.mjs` still excludes `AUDIT_` and `NON_FUNCTIONAL_AUDIT_REPORT` root paths from its placeholder scan. Harmless now the files live under `docs/_archive/`, which is already excluded.

## Read next

1. `docs/PRODUCT.md`: what the product is and does, route by route; wins over any older document.
2. `docs/DELIVERY_STATE.md`: what has been verified in production, with deployment ids, and what has not.
3. `docs/NORTH_STAR.md`: the outcome and the metric, ratified 2026-08-10.
4. `AGENT_BRIEFING.md`: approved public facts, safe copy and claim boundaries for any agent writing about Circle.
5. `docs/MARKETING_AND_SALES.md`: buyer hypothesis, objections, approved claims with evidence; the training source for commercial agents.
6. `DOCS.md`: the map, the source-of-truth order and the product map into `src/`.
7. `AGENTS.md`: entry file for coding agents; carries the shared canon block rendered from `krishanraja/ai-harness`, marker-delimited and never edited here.
8. `docs/DESIGN_DECISIONS.md`: how the design reached its current state; append-only.
9. `CHANGELOG.md`: user-visible release history.
10. `COMPLIANCE.md`, `SECURITY.md`, `SUBPROCESSORS.md`, `docs/RoPA.md`, `docs/legal/README.md`: privacy, security and legal status.
11. `docs/history/LOG.md`: what moved where, and when.

## Do not trust

- `docs/_archive/`, all of it: the June 2026 relationship-to-revenue CRM vision, the Path Room, its build plan, the old roadmap. Superseded by the 2026-08-11 workspace release; `docs/PRODUCT.md` is current. Indexed in `docs/history/LOG.md`.
- `docs/_archive/AUDIT_2026-04-24.md` and `docs/_archive/2026-07-02-NON_FUNCTIONAL_AUDIT_REPORT.md`: audits of the April and May 2026 codebase, moved from the repo root on 2026-09-07. Their findings describe surfaces that no longer exist.
- `_upgrade/fractionl-circle/`: the May 2026 Mindmaker OS handoff and phase plans, including a tier catalogue that is no longer sold. `src/lib/tiers.ts` is the price source.
- `docs/VALUE_SHARPENING_2026-07-03.md` and `docs/icp-archetype.md`: historical by DOCS.md's classification and by their own banners. The Plan and thesis surfaces they describe are not in current navigation; their market figures are unverified.
- `docs/DELIVERY_STATE.md`, "Verification evidence": the numbers (77 tests, `tsc` passed) are for the #146/#147 head; #154's commit recorded 80 tests and 27 pre-existing TypeScript errors.
- Any claim that #151 or #154 has a verified production deployment: neither has a deployment id recorded. Bundle readback on 2026-09-07 shows both are serving.

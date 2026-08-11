# Circle changelog

This file records user-visible and operator-visible releases. Product truth
lives in [docs/PRODUCT.md](docs/PRODUCT.md); detailed release evidence lives in
[docs/DELIVERY_STATE.md](docs/DELIVERY_STATE.md).

## 2026-08-11

### Agent-ready documentation

- Added one source-backed marketing and sales operating guide with a working buyer hypothesis, qualification rules, message hierarchy, objections, approved claims, evidence links, product limits, and external-action boundaries.
- Expanded `agent.json` and `llms.txt` into aligned training surfaces for autonomous agents while keeping product truth, commercial hypotheses, and retired claims distinct.
- Extended the documentation check to detect drift in the core promise, routes, pricing, required training sections, and machine-readable metadata.

### Changed

- Integrated the approved Fractionl wordmark into public and account moments, then carried the Fractionl icon through the signed-in Circle lockup, favicon, installed-app, notification, and social surfaces.
- Kept violet as Circle's action signal and used a restrained bronze only for the Fractionl ownership signature.
- Restored the existing People, idea-validation, and profile/settings capabilities through one consistent **People / Ideas / You** workspace.
- Added complete contact browsing, visible add/import paths, recent idea reopen, and a first-class profile destination without replacing the existing ingestion or idea pipelines.
- Replaced user-facing `clue`, `thesis`, and `enrichment` jargon with plain descriptions while retaining internal schema and function names.
- Reused the approved Circle tokens across the workspace, overlays, public front door, and existing deep flows.
- Removed the retired Satoshi/Archivo font layer so product, marketing, legal, settings, and recovery screens use one native system family.
- Aligned browser, social, structured-data, installed-app, consent, privacy, and credit-purchase copy with the plain-English product promise.

### Quality

- Added Playwright coverage for the public front door and the signed-in People → Ideas → You story at desktop and mobile viewports, including horizontal-overflow assertions.
- Added a deterministic `npm run generate:og` task so the social image stays visually and verbally aligned with the live front door.

### Documentation

- Added deterministic documentation checks, complete local setup, repository
  governance, legal publication gates, and explicit status for conditional
  integrations.

### Release record

- Unified workspace: [pull request #146](https://github.com/krishanraja/fractionl-circle/pull/146)
- Public language and typography closeout: [pull request #147](https://github.com/krishanraja/fractionl-circle/pull/147)
- Release documentation closeout: [pull request #148](https://github.com/krishanraja/fractionl-circle/pull/148)
- Agent-ready marketing and sales documentation: [pull request #149](https://github.com/krishanraja/fractionl-circle/pull/149)
- Verified production deployment: `dpl_Ewz4aZPeCHaQ5je9g7CPM6c3KQot`

## 2026-08-10

### Changed

- Replaced the dashboard-led experience with one adaptive surface for keeping a
  clue or finding one saved person.
- Unified the front door, account handoff, product, settings, privacy, terms,
  and share intake under the approved Circle system.
- Added shared voice input to free-form clue, ask, meeting-context, and profile
  fields.
- Added the Android PWA share-target review and recovery route.
- Preserved exact-name recall and grounded local idea matching when remote
  providers fail.
- Expanded account export and erasure coverage to the live user-owned schema.
- Removed retired Plan language from re-engagement and push copy.

### Release record

- Product release: [pull request #142](https://github.com/krishanraja/fractionl-circle/pull/142)
- Installed-app copy correction: [pull request #143](https://github.com/krishanraja/fractionl-circle/pull/143)
- Release documentation closeout: [pull request #144](https://github.com/krishanraja/fractionl-circle/pull/144)

# Circle changelog

This file records user-visible and operator-visible releases. Product truth
lives in [docs/PRODUCT.md](docs/PRODUCT.md); detailed release evidence lives in
[docs/DELIVERY_STATE.md](docs/DELIVERY_STATE.md).

## Unreleased

### Changed

- Restored the existing People, idea-validation, and profile/settings capabilities through one consistent **People / Ideas / You** workspace.
- Added complete contact browsing, visible add/import paths, recent idea reopen, and a first-class profile destination without replacing the existing ingestion or idea pipelines.
- Replaced user-facing `clue`, `thesis`, and `enrichment` jargon with plain descriptions while retaining internal schema and function names.
- Reused the approved Circle tokens across the workspace, overlays, public front door, and existing deep flows.

### Quality

- Added Playwright coverage for the public front door and the signed-in People → Ideas → You story at desktop and mobile viewports, including horizontal-overflow assertions.

### Documentation

- Added deterministic documentation checks, complete local setup, repository
  governance, legal publication gates, and explicit status for conditional
  integrations.

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

# Circle contributor and operator guide

Last reviewed: 2026-08-10.

This file is the map, not a second product specification. Use [docs/PRODUCT.md](docs/PRODUCT.md) for current product truth and [docs/DELIVERY_STATE.md](docs/DELIVERY_STATE.md) for the latest verified release evidence.

## Source-of-truth order

1. Rendered production behavior and the deployed source revision
2. `docs/PRODUCT.md`
3. `docs/NORTH_STAR.md`
4. Current source and tests
5. `AGENT_BRIEFING.md` for public-facing facts
6. Dated decision and compliance records
7. `docs/_archive/` and `_upgrade/` for history only

Historical documents can explain why a choice was made. They cannot define what the live product does.

## Product map

- Public front door and auth: `src/components/AuthPage.tsx`
- Authenticated app shell: `src/pathroom/CircleApp.tsx`
- Active capture and recall surface: `src/pathroom/HingeCircle.tsx`
- Android share intake: `src/pages/ShareContact.tsx`, `public/site.webmanifest`, `public/sw.js`
- Contact ingestion and dedupe: `src/lib/circleIngest.ts`
- Ask routing and grounded recovery: `src/lib/theRead.ts`
- Shared voice interaction: `src/components/circle/WhisperButton.tsx`
- Privacy and terms: `src/pages/Privacy.tsx`, `src/pages/Terms.tsx`
- Shared visual tokens: `src/pathroom/circle-system.css`

Older Plan, thesis, journey, and cockpit components remain in source but are not mounted by the active shell. Unlinked `/preview/*` routes are fixtures, not product features.

## Development

```powershell
npm install
npm run dev
```

Use Node.js 20 or newer. CI currently runs Node.js 20. Local Supabase and Vercel settings belong in ignored environment files or authenticated provider sessions. Never add credentials to documentation, source, screenshots, commands, or test fixtures.

## Quality gate

```powershell
npm run test:run
npm exec -- tsc --noEmit
npm run lint
npm run build
git diff --check
```

The browser gate covers:

- first-time comprehension and clue-to-account handoff;
- signed-in capture, optional meeting context, refresh persistence, and exact-name recall;
- described-person and idea recovery when provider calls fail;
- direct `/share-contact`, `/privacy`, and `/terms` routes;
- validation, retry, permission denial, and microphone timeout;
- 320px through 1440px responsive fit, visible focus, reduced motion, and 44px standalone targets.

Use only the designated test account and synthetic data. Never send a message, create a charge, toggle production consent, export private data, or delete records as incidental verification.

## Release

1. Confirm repository, branch, remote, target Vercel project, and current production revision.
2. Keep a known-good production deployment as the rollback point.
3. Push a feature branch and open a draft pull request.
4. Verify the preview at the exact head SHA.
5. Merge that verified head to `main`.
6. Wait for the production deployment sourced from `main` to become READY.
7. Read back the live source SHA, public routes, authenticated task, PWA assets, and runtime errors.
8. Roll back immediately if the primary task or adjacent public routes fail.

Vercel project and rollback identifiers are recorded in `docs/DELIVERY_STATE.md`. Supabase functions are not redeployed for a UI release unless a separately diagnosed backend change requires it.

## Documentation map

### Canonical

- `README.md` - quick developer entry
- `docs/PRODUCT.md` - product and implementation truth
- `docs/NORTH_STAR.md` - outcome and metric
- `AGENT_BRIEFING.md` - approved public-facing facts and claim boundaries
- `docs/DELIVERY_STATE.md` - verification, release, and rollback state
- `docs/DESIGN_DECISIONS.md` - approved design record

### Operations

- `docs/screenshot-to-contact.md` - Android share target and iOS status
- `docs/google-oauth-setup.md` and `docs/microsoft-oauth-setup.md` - provider setup
- `docs/google-oauth-verification.md` - Google verification pack
- `docs/supabase-custom-domain.md` - custom domain setup
- `docs/reengagement-and-push.md` - background re-engagement systems
- `extension/README.md` - optional browser extension

### Privacy and security

- `COMPLIANCE.md`
- `SECURITY.md`
- `SUBPROCESSORS.md`
- `docs/privacy-policy.md`
- `docs/RoPA.md`

### Historical

- `docs/_archive/`
- `_upgrade/`
- dated root audit reports

Historical files remain for traceability and may contain retired product language. Their directory or dated filename is the warning label.

## Documentation rules

- Write for the person who must operate or change the product next.
- Prefer one canonical explanation and link to it.
- Use exact routes, filenames, and commands.
- Mark unavailable features as not shipped.
- Separate current truth, history, and roadmap.
- Do not quote a price or entitlement unless it matches `src/lib/tiers.ts` and the live checkout.
- Do not claim a provider-backed result without a working runtime path and an honest fallback.
- Update the public `llms.txt`, `agent.json`, metadata, and social card whenever the product promise changes.

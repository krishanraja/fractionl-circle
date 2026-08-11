# Circle contributor and operator guide

Last reviewed: 2026-08-11.

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
- Active workspace: `src/pathroom/CircleWorkspace.tsx`
- People surface: `src/pathroom/WorkingOnInput.tsx`, `src/components/circle/CirclePeopleList.tsx`, and the existing ingestion components
- Ideas surface: `src/pathroom/ThesisApp.tsx` and the existing validation, journey, and warm-reach components
- Profile and settings: `src/components/profile/ProfileSettingsSheet.tsx`
- Android share intake: `src/pages/ShareContact.tsx`, `public/site.webmanifest`, `public/sw.js`
- Contact ingestion and dedupe: `src/lib/circleIngest.ts`
- Ask routing and grounded recovery: `src/lib/theRead.ts`
- Shared voice interaction: `src/components/circle/WhisperButton.tsx`
- Privacy and terms: `src/pages/Privacy.tsx`, `src/pages/Terms.tsx`
- Shared visual tokens: `src/pathroom/circle-system.css`

The existing thesis, journey, reach-out, ingestion, enrichment, profile, and connector components are mounted through the workspace rather than rebuilt. `HingeCircle.tsx` remains as historical implementation evidence but is not mounted. Unlinked `/preview/*` routes are fixtures, not product features.

## Development

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Use Node.js 20 or newer. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local` before startup. The app does not fall back to an implicit project. See [docs/local-development.md](docs/local-development.md) for the safe test boundary and troubleshooting.

CI runs Node.js 20. Local Supabase and Vercel settings belong in ignored environment files or authenticated provider sessions. Never add credentials to documentation, source, screenshots, commands, or test fixtures.

## Quality gate

```powershell
npm run docs:check
npm run test:run
npm run test:e2e
npm exec -- tsc --noEmit
npm run lint
npm run build
git diff --check
```

The browser gate covers:

- first-time comprehension and person-to-account handoff;
- signed-in People, add/import, Ideas, new-idea, You, settings, and exact-name recall paths;
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
- `docs/local-development.md` - complete local setup and environment boundary
- `docs/PRODUCT.md` - product and implementation truth
- `docs/NORTH_STAR.md` - outcome and metric
- `AGENT_BRIEFING.md` - approved public-facing facts and claim boundaries
- `docs/DELIVERY_STATE.md` - verification, release, and rollback state
- `docs/DESIGN_DECISIONS.md` - approved design record

### Active operations

- `docs/screenshot-to-contact.md` - Android share target and iOS status
- `docs/supabase-custom-domain.md` - custom domain setup
- `docs/reengagement-and-push.md` - background re-engagement systems

### Contact integrations

- `docs/google-oauth-setup.md` and `docs/microsoft-oauth-setup.md` - backend connector setup for the active **Bring in contacts** entry point
- `docs/google-oauth-verification.md` - Calendar-write verification remains separately gated; the read-only connection entry is active
- `extension/README.md` - extension source record; pairing is unavailable in the current shell

### Privacy and security

- `COMPLIANCE.md`
- `SECURITY.md`
- `SUBPROCESSORS.md`
- `docs/privacy-policy.md`
- `docs/RoPA.md`
- `docs/legal/README.md` - publication state, blockers, and owners

### Historical

- `docs/_archive/`
- `_upgrade/`
- `docs/VALUE_SHARPENING_2026-07-03.md`
- `docs/icp-archetype.md`
- dated root audit reports

Historical files remain for traceability and may contain retired product language. Their directory or dated filename is the warning label.

### Repository governance

- `CONTRIBUTING.md` - branch, test, documentation, and pull-request rules
- `LICENSE.md` - current rights status
- `CHANGELOG.md` - user-visible release history
- `.github/CODEOWNERS` and `.github/PULL_REQUEST_TEMPLATE.md` - review ownership and evidence checklist

## Documentation rules

- Write for the person who must operate or change the product next.
- Prefer one canonical explanation and link to it.
- Use exact routes, filenames, and commands.
- Mark unavailable features as not shipped.
- Separate current truth, history, and roadmap.
- Do not quote a price or entitlement unless it matches `src/lib/tiers.ts` and the live checkout.
- Do not claim a provider-backed result without a working runtime path and an honest fallback.
- Update the public `llms.txt`, `agent.json`, metadata, and social card whenever the product promise changes.
- Run `npm run docs:check` before every pull request. It verifies files, relative links, heading anchors, environment-variable coverage, governance files, and unresolved placeholder tokens.

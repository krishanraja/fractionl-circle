# Circle by Fractionl

Circle remembers the people you meet, helps you think through business ideas, and brings the right person back when they can help.

Live product: [circle.fractionl.ai](https://circle.fractionl.ai)

Last reviewed: 2026-08-11.

## The user flow

1. Open **People** and add anyone from a name, link, email, note, voice memo, photo, supported device contact, Android share, LinkedIn/CRM file, Google, or Microsoft.
2. Add where you met or any detail you remember. Circle handles joining, dedupe, and enrichment behind the scenes.
3. Browse or search everyone at any time, or ask for the kind of person you need in plain English.
4. Open **Ideas** to talk through a business idea, revisit earlier ideas, and find the people worth speaking to.
5. Open **You** for profile, connected contacts, reminders, appearance, privacy, and account settings.

Dedupe, enrichment, provider recovery, and evidence ranking stay behind the scenes. Circle never sends a message automatically and never invents relationship facts.

## Local development

Requirements: Git, Node.js 20 or newer, and npm.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Before starting the app, set these two public frontend values in `.env.local`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Get them from the designated Supabase project through an approved provider session or a maintainer. Never paste credentials into an issue, pull request, chat, screenshot, or committed file. The app stops with a clear configuration error when either required value is missing.

The terminal prints the local Vite URL. Use only a designated test account and synthetic contacts when the local app points at a shared backend. See [docs/local-development.md](docs/local-development.md) for environment boundaries, common failures, and the complete local workflow.

## Verification

```powershell
npm run docs:check
npm run test:run
npm run test:e2e
npm exec -- tsc --noEmit
npm run lint
npm run build
```

`npm run test:e2e` needs `E2E_EMAIL` and `E2E_PASSWORD` for a designated test account. It runs the public front door and the signed-in People → Ideas → You story on desktop and mobile. The release contract also includes direct-route refreshes, authenticated save and recall, microphone denial/timeout recovery, and a repository secret scan.

## Current routes

- `/` - public front door when signed out; the People, Ideas, and You workspace when signed in
- `/auth` - sign in and account creation
- `/share-contact` - Android PWA share-target landing and manual recovery
- `/privacy` - privacy controls when signed in; clear sign-in gate otherwise
- `/terms` - public terms

Routes under `/preview/*` are unlinked design fixtures. They are not product navigation.

## Stack

- React 18, TypeScript, Vite, Tailwind, Radix, and shadcn-compatible primitives
- Supabase Auth, Postgres with row-level security, and Edge Functions
- Vercel Git deployments
- OpenAI Whisper through the deployed `transcribe` function
- Existing provider-backed parsing, enrichment, and search functions with grounded local recovery for the core recall promise

## Documentation

- [docs/PRODUCT.md](docs/PRODUCT.md) - canonical product and implementation truth
- [docs/NORTH_STAR.md](docs/NORTH_STAR.md) - the outcome and metric
- [docs/DELIVERY_STATE.md](docs/DELIVERY_STATE.md) - release evidence and rollback contract
- [docs/DESIGN_DECISIONS.md](docs/DESIGN_DECISIONS.md) - approved design trace and artifact hashes
- [docs/local-development.md](docs/local-development.md) - local setup, environment boundaries, and troubleshooting
- [DOCS.md](DOCS.md) - contributor and operator index
- [AGENT_BRIEFING.md](AGENT_BRIEFING.md) - current public-facing facts and claim boundaries
- [docs/screenshot-to-contact.md](docs/screenshot-to-contact.md) - Android share intake and iOS status
- [COMPLIANCE.md](COMPLIANCE.md), [SUBPROCESSORS.md](SUBPROCESSORS.md), [docs/RoPA.md](docs/RoPA.md) - privacy and compliance records
- [docs/legal/README.md](docs/legal/README.md) - legal-document status and publication gates
- `docs/_archive/` and `_upgrade/` - historical material only; never use them as current product truth

## Release model

Feature branches create Vercel previews. A release is merged to `main` only after tests, build, responsive browser checks, preview readback, and rollback identification pass. Production is then verified by source revision and user-visible behavior, not by deployment status alone.

## Contributing and license

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. This public repository has no open-source grant; [LICENSE.md](LICENSE.md) records the current all-rights-reserved status.

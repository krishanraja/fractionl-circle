# Contributing to Circle

Circle accepts focused contributions that preserve its product promise, trust
rules, and release evidence.

## Before you start

1. Read [docs/PRODUCT.md](docs/PRODUCT.md).
2. Read [DOCS.md](DOCS.md) for the source-of-truth order and product map.
3. Read [docs/MARKETING_AND_SALES.md](docs/MARKETING_AND_SALES.md) before changing positioning, public claims, pricing copy, or agent training data.
4. Follow [docs/local-development.md](docs/local-development.md).
5. Open an issue or agree the change with the repository owner when it changes
   product behavior, data, billing, OAuth scopes, legal wording, or a provider.

Never include credentials, private user data, production exports, cookies,
headers, or session-bearing URLs in an issue, branch, fixture, screenshot, or
pull request.

## Make a change

Create a focused branch from current `main`. Codex-created branches use the
`codex/` prefix.

Keep each pull request to one product or maintenance outcome. Preserve unrelated
working-tree changes.

## Required checks

```powershell
npm run docs:check
npm run test:run
npm exec -- tsc --noEmit
npm run lint
npm run build
git diff --check
```

Run the relevant browser task when a change affects routes, interaction,
authentication, responsive behavior, permissions, or persistence. A green
build alone does not prove the user journey.

## Documentation contract

Update the smallest canonical set:

- Product behavior: `docs/PRODUCT.md`
- Primary outcome or metric: `docs/NORTH_STAR.md`
- Public claims: `AGENT_BRIEFING.md`, `public/llms.txt`, and
  `public/agent.json`
- Marketing, sales, buyer hypotheses, objections, and claim evidence:
  `docs/MARKETING_AND_SALES.md`
- Operations: the relevant runbook and `DOCS.md`
- Release evidence: `docs/DELIVERY_STATE.md`
- User-visible release history: `CHANGELOG.md`
- Privacy or provider facts: `COMPLIANCE.md`, `SUBPROCESSORS.md`,
  `docs/RoPA.md`, and the legal status index

Do not create a second product specification. Link to the canonical file.

## Pull requests

Use the pull-request template. State:

- the user or operator outcome;
- the exact revision tested;
- tests and browser evidence;
- external systems changed, if any;
- rollback and readback for any approved external mutation;
- known limits and cleanup.

Repository access never authorizes a deployment, database change, provider
configuration, external send, charge, or destructive action.

## Security reports

Do not open a public issue for a vulnerability. Follow [SECURITY.md](SECURITY.md).

## Rights

This repository is not licensed as open source. Read [LICENSE.md](LICENSE.md)
before contributing. By submitting material, you confirm that you have the
right to submit it. The repository owner may require separate written terms
before accepting a contribution.

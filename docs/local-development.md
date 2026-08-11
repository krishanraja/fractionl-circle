# Circle local development

Last verified: 2026-08-11.

This runbook gets a contributor from a clean checkout to a working Circle UI without exposing secrets or touching production operations.

## Requirements

- Git
- Node.js 20 or newer
- npm
- Access to the designated Supabase project's public frontend configuration

The Supabase CLI is optional. You do not need it to run the web app.

## Start the app

From the repository root:

```powershell
npm ci
Copy-Item .env.example .env.local
```

Set only the values needed for the frontend:

```text
VITE_SUPABASE_URL=<approved project URL>
VITE_SUPABASE_PUBLISHABLE_KEY=<approved public key>
```

Leave server-only values empty. Edge Function secrets belong in Supabase's managed secret store, never in Vite variables or committed files.

Start Vite:

```powershell
npm run dev
```

Open the URL printed in the terminal. The exact port may change when another local process already uses Vite's default.

## Safe test boundary

Local Circle may still point at a shared backend. Use only the designated test account and synthetic people.

Do not:

- send an email, SMS, push notification, or external message;
- create a charge or checkout session;
- change a production consent preference;
- export or delete account data;
- invoke a cron or re-engagement function;
- apply a migration or deploy an Edge Function.

Those actions need their own target, rollback, and approval.

## Verification

Run the same deterministic checks used by pull requests:

```powershell
npm run docs:check
npm run test:run
npm run test:e2e
npm exec -- tsc --noEmit
npm run lint
npm run build
```

For signed-in E2E, set `E2E_EMAIL` and `E2E_PASSWORD` to the designated test account in the current shell. `npm run test:e2e` runs Chromium at desktop and Pixel-sized mobile viewports. It never saves a contact, sends a message, or changes preferences. A passing build proves compilation, not the user journey.

## Environment variables

`.env.example` is the complete variable catalogue.

The web app requires:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Optional frontend behavior uses:

- `VITE_PUSH_ENABLED`
- `VITE_VAPID_PUBLIC_KEY`
- the Stripe price ID variables listed in `.env.example`

All unprefixed variables are server-side references. Do not place real server secrets in `.env.local` unless a separately approved local function workflow requires them.

## Common failures

| Symptom | Cause | Recovery |
|---|---|---|
| Startup reports missing Supabase configuration | One of the two required Vite values is empty | Set both values in `.env.local`, then restart Vite |
| Sign-in returns to the wrong host | The OAuth provider does not allow the local callback | Use an approved local redirect or test the deployed preview |
| Port differs from an old screenshot or command | Vite selected the next free port | Use the URL printed in the current terminal |
| Microphone input cannot start | Browser or operating-system permission is blocked | Grant permission on the local origin or type the clue |
| UI looks stale after an environment change | Vite variables are baked at startup | Stop and restart Vite; rebuild before judging a deployed artifact |

## Backend work

The repository contains Supabase migrations and Edge Functions, but local UI setup does not authorize backend changes. Before any backend operation:

1. confirm the project and environment;
2. inspect migration history and function state;
3. define rollback and readback;
4. obtain exact approval for the mutation;
5. verify the result independently.

Use [docs/DELIVERY_STATE.md](DELIVERY_STATE.md) for the latest completed release evidence, not as permission to repeat a production command.

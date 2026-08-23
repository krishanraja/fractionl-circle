# Microsoft contacts and calendar OAuth setup

Last verified against source: 2026-08-23.

Status: active connector runbook. The **People → Bring in contacts → Connect
Microsoft** path mounts the existing connector and Edge Functions.

Do not deploy or publish this integration from this document alone. Provider
changes still require preview verification and release approval.

## 1. Register an app

- <https://portal.azure.com/> → **Microsoft Entra ID** → **App registrations**
  → **New registration**.
- Name: `Circle by Fractionl`.
- Supported account types: **Accounts in any organizational directory and
  personal Microsoft accounts** (so both `@outlook.com` users and Azure AD
  work accounts can sign in). This corresponds to `MS_TENANT=common` in our
  edge functions.
- Redirect URI: **Web** →
  ```
  https://auth.circle.fractionl.ai/functions/v1/oauth-microsoft-callback
  ```
- Keep the raw Supabase callback only as a temporary rollback URI while the
  custom domain is active.
- Register.

Copy the **Application (client) ID**.

## 2. Client secret

- **Certificates & secrets** → **New client secret**.
- Description: `Circle edge fns`.
- Expires: 24 months (re-issue ahead of expiry).
- Copy the secret **Value** (not the ID - only shown once).

## 3. API permissions

**API permissions** → **Add a permission** → **Microsoft Graph** →
**Delegated permissions** → add **only**:

```
openid
email
profile
offline_access
User.Read
Contacts.Read
Calendars.Read
```

Current source still requests `Mail.Read` and `Mail.Send` in
`supabase/functions/_shared/microsoftOauth.ts`, although the active product
does not use mail bodies or send mail. This is a known security and
verification gap, parallel to Google's unused `gmail.readonly`/`gmail.send`
scopes documented in `docs/google-oauth-setup.md`. Remove those unused mail
scopes from `MS_SCOPES` before publishing the connector. Do not configure or
promote the OAuth app from the intended list above while runtime source
still requests a wider set.

You typically don't need admin consent for these - they're standard user
scopes.

## 4. Set edge-function secrets

```
supabase secrets set \
  MICROSOFT_CLIENT_ID=<application client id> \
  MICROSOFT_CLIENT_SECRET=<the value you copied in step 2>
```

(Optional) `MICROSOFT_TENANT` defaults to `common` (multi-tenant + personal).
Set to your tenant ID if you want to restrict to one Azure AD tenant.

The legacy `MS_CLIENT_ID` / `MS_CLIENT_SECRET` / `MS_TENANT` names still
work as a fallback; new setups should use the verbose names above.

`APP_URL` should already be set (used for the post-callback redirect).

## 5. Deploy the four functions

Deployment is a production mutation. Run these commands only for an approved
backend release with a named project, rollback source, and readback.

```
supabase functions deploy oauth-microsoft-start
supabase functions deploy oauth-microsoft-callback --no-verify-jwt
supabase functions deploy sync-microsoft
supabase functions deploy cron-sync-microsoft --no-verify-jwt
```

Same rule as Google: the callback ships with `--no-verify-jwt` because
Microsoft hits it directly. State validation in the callback is the auth.

`cron-sync-microsoft` ships `--no-verify-jwt` so pg_net can call it with
only the `x-cron-secret` header.

## 6. Availability gate and smoke test

The product entry point is active. Opening a callback directly is still not a valid test.

1. Open **People** → **Bring in contacts** → **Connect Microsoft**.
2. Microsoft consent screen lists the scopes from step 3.
3. Accept. You'll be redirected to `https://circle.fractionl.ai/?oauth=microsoft&status=ok`.
4. Toast: "Microsoft connected. Importing contacts + calendar…".
5. ~10–30s later, second toast with counts.
6. DB check:
   ```sql
   select kind, status, scope_payload from sources where kind = 'microsoft';
   select kind, count(*) from signals group by kind;
   ```

## 7. Schedule the nightly sync

The cron schedules live in `supabase/cron_setup.sql` (Phase 6 + 8b also
share that file). Run the new sections that schedule `cron-sync-google` and
`cron-sync-microsoft`. Schedules use UTC.

## Troubleshooting

- **`AADSTS500113: No reply address`** - your Redirect URI in step 1 doesn't
  match the SUPABASE_URL the edge function computed. Same project ref.
- **`AADSTS900561: The endpoint only accepts POST requests`** - happens if
  you accidentally browsed the callback URL directly. Normal during
  development.
- **`unknown_state`** after callback - the one-time state from `oauth_states`
  was consumed already or never inserted. Try again from Circle.
- **Empty results from `/me/contacts`** - the user is on a personal account
  with no Outlook contacts. Calendar may still return events.

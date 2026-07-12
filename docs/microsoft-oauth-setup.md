# Microsoft Graph OAuth setup (Phase 5b)

**Last updated:** 2026-07-12 (permissions corrected to match `_shared/microsoftOauth.ts`;
added the custom-auth-domain redirect URI note).

One-time Azure AD setup for the `Connect Microsoft` source. Mirrors the
Google setup; same token storage, same callback shape, same user UX.

## 1. Register an app

- <https://portal.azure.com/> → **Microsoft Entra ID** → **App registrations**
  → **New registration**.
- Name: `Circle by Fractionl`.
- Supported account types: **Accounts in any organizational directory and
  personal Microsoft accounts** (so both `@outlook.com` users and Azure AD
  work accounts can sign in). This corresponds to `MS_TENANT=common` in our
  edge functions.
- Redirect URI: **Web** → the callback on your active auth host. Once the Supabase
  custom auth domain is live (see `docs/supabase-custom-domain.md`), this is:
  ```
  https://auth.circle.fractionl.ai/functions/v1/oauth-microsoft-callback
  ```
  Until cut over, the raw host also works:
  `https://ksyuwacuigshvcyptlhe.supabase.co/functions/v1/oauth-microsoft-callback`.
- Register.

Copy the **Application (client) ID**.

## 2. Client secret

- **Certificates & secrets** → **New client secret**.
- Description: `Circle edge fns`.
- Expires: 24 months (re-issue ahead of expiry).
- Copy the secret **Value** (not the ID - only shown once).

## 3. API permissions

**API permissions** → **Add a permission** → **Microsoft Graph** →
**Delegated permissions** → add (`_shared/microsoftOauth.ts` `MS_SCOPES` is the
source of truth - verify against it if this list and the code ever disagree):

```
openid
email
profile
offline_access
User.Read
Contacts.Read
Calendars.Read
Mail.Read
Mail.Send
```

**`Mail.Read` and `Mail.Send` ARE requested today** - parallel to Google's restricted
Gmail scopes above. These are user-consent scopes (no admin consent required, no
Microsoft audit gate the way Google's CASA review is), but they do mean the app reads
and can send mail on the user's behalf once connected - disclose this clearly wherever
the Microsoft connection is offered in-app.

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

## 6. Smoke test

1. Open the app → **Circle** → **Add a source** → **Connect Microsoft**.
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

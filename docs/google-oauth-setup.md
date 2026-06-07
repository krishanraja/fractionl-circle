# Google OAuth setup (Phase 5, updated 2026-06-07)

One-time Google Cloud Console setup for the `Connect Google` source.

## 1. Create or pick a project

- <https://console.cloud.google.com/>
- Use an existing project or create one. The project name is cosmetic.

## 2. Enable the APIs we hit

In **APIs & Services → Library**, enable:

- **People API** — reads Google Contacts + Other Contacts.
- **Google Calendar API** — reads calendar events.

## 3. OAuth consent screen

**APIs & Services → OAuth consent screen**:

- User type: **External** (unless you're on Workspace and want Internal).
- App name: `Circle by Fractionl` (or your own).
- User support email / Developer contact: your email.
- App domain: `circle.fractionl.ai` (or your domain).
- Authorized domains: `fractionl.ai`. (Add `supabase.co` only if you are still
  on the raw `<ref>.supabase.co` host; once the Supabase custom auth domain is
  live — see `supabase-custom-domain.md` — `fractionl.ai` alone is correct.)
- Save.

On the **Scopes** step, add these scopes:

```
openid
email
profile
https://www.googleapis.com/auth/contacts.readonly
https://www.googleapis.com/auth/contacts.other.readonly
https://www.googleapis.com/auth/calendar.events.readonly
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.send
```

**Important — restricted scopes:** `gmail.readonly` and `gmail.send` are
restricted scopes that trigger Google's CASA security audit (~$15k, 4–8 weeks)
if the app is published. The current strategy is to keep the OAuth app in
**Testing mode** (test users only), which allows restricted scopes without
the CASA audit. Do NOT submit the OAuth app for publication until the CASA
audit budget and timeline are approved. When testing, add each test user's
Gmail account to the test-users list in the OAuth consent screen.

Add test users (any Gmail accounts you'll sign in with) until the app is
published.

## 4. OAuth Client ID

**APIs & Services → Credentials → Create credentials → OAuth client ID**:

- Application type: **Web application**.
- Name: `Circle — edge functions`.
- Authorized redirect URIs: add **exactly** the callback on your active auth
  host. Once the Supabase custom domain is live (see
  `supabase-custom-domain.md`), this is:

  ```
  https://auth.circle.fractionl.ai/functions/v1/oauth-google-callback
  ```

  Until cut over, the raw host also works:
  `https://ksyuwacuigshvcyptlhe.supabase.co/functions/v1/oauth-google-callback`.

- Create. Copy the Client ID and Client Secret.

## 5. Set edge-function secrets

```
supabase secrets set \
  GOOGLE_CLIENT_ID=<client id> \
  GOOGLE_CLIENT_SECRET=<client secret>
```

`APP_URL` (used by the callback to redirect back to the app) should already
be set. If not:

```
supabase secrets set APP_URL=https://circle.fractionl.ai
```

## 6. Deploy the three Phase 5 functions

```
supabase functions deploy oauth-google-start
supabase functions deploy oauth-google-callback --no-verify-jwt
supabase functions deploy sync-google
```

`oauth-google-callback` must deploy with `--no-verify-jwt` — Google calls it
directly with no user token. State validation in the callback covers auth.

## 7. Smoke test

1. Open the app → **Circle** → **Add a source** → **Connect Google**.
2. You should land on Google's consent screen with the scopes listed above.
3. Accept. You'll be redirected to
   `https://circle.fractionl.ai/?oauth=google&status=ok`.
4. A toast appears: "Google connected. Importing contacts + calendar…".
5. Wait ~10–30s. A second toast shows counts:
   `120 new · 24 merged · 18 meeting signals`.
6. Your `sources` row for `kind='google'` flips to `status='active'` with
   `scope_payload` populated.

## Troubleshooting

- **`error=redirect_uri_mismatch`** — the URI in step 4 doesn't exactly match
  what Google is seeing. Double-check the project ref.
- **`error=access_denied`** — user tapped Cancel on the consent screen.
- **`unknown_state`** after callback — the one-time state from `oauth_states`
  was already consumed or never inserted. Try again from the Circle tab.
- **`No google source — reconnect first.`** from sync-google — the callback
  didn't get to the "create source" step. Check edge function logs.
- **Audience errors** — your OAuth consent screen is still in testing and
  your Google account isn't in the test users list. Add it.

## Publishing (later)

To let non-test-users connect, the OAuth app must be published. Because the
app now uses restricted scopes (`gmail.readonly`, `gmail.send`), this requires
Google's **CASA Tier 2 audit** (approximately $15k, 4–8 weeks). Plan this cost
and timeline before opening the "Connect Google" flow to the public. Until the
audit is complete, keep the app in Testing mode and add users manually.

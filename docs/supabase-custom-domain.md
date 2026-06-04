# Supabase custom auth domain — branding the Google sign-in screen

## Why

When a user taps **Sign in with Google**, Google's consent screen reads:

> Choose an account **to continue to ksyuwacuigshvcyptlhe.supabase.co**

That raw Supabase project ref looks untrustworthy at the exact moment a new user
is deciding whether to trust the product. It appears because Supabase's built-in
Google auth runs through the project's hosted domain
(`<ref>.supabase.co/auth/v1/callback`), and Google displays the redirect host.

The only way to replace that hostname with our brand is a **Supabase custom
domain**. Once live, the screen reads *"to continue to auth.circle.fractionl.ai"*.

> Note: this is the **built-in sign-in** OAuth client configured in the Supabase
> dashboard (Authentication → Providers → Google). It is a different client from
> the edge-function "Connect Google" contact-import flow documented in
> `google-oauth-setup.md`. The custom domain moves **both** onto our domain.

## What changes in code (already done on this branch)

- **`.env.example`** documents `VITE_SUPABASE_URL` pointing at the custom domain.
- **`supabase/config.toml`** lists the production site URL / redirect URLs.
- The Supabase client (`src/integrations/supabase/client.ts`) and the
  edge-function `getRedirectUri()` (`supabase/functions/_shared/googleOauth.ts`)
  both read `VITE_SUPABASE_URL` / `SUPABASE_URL`, so they follow automatically
  once the env var points at the custom domain — no further code change.

## Manual steps (need Supabase / DNS / Google Cloud access)

Run these **in order**. The chosen host below is `auth.circle.fractionl.ai`.

### 1. Enable the Supabase Custom Domains add-on
- Supabase dashboard → **Project Settings → General → Custom Domains**.
- Enable the add-on (paid, ~$10/mo) and enter **`auth.circle.fractionl.ai`**.
- Supabase shows a CNAME (and a TXT verification) record to add.

### 2. Add the DNS records
- In the DNS for `fractionl.ai`, add the **CNAME** (and TXT) Supabase displays,
  pointing `auth.circle.fractionl.ai` at the Supabase target.
- Back in the dashboard, click **Verify**. Wait for the cert to provision
  (minutes to ~an hour). Then **Activate** the custom domain.

### 3. Update Google Cloud Console
For the OAuth client used by Supabase's **built-in** Google provider (the one in
Authentication → Providers → Google):
- **Authorized redirect URIs** → add
  `https://auth.circle.fractionl.ai/auth/v1/callback`
  (keep the old `https://ksyuwacuigshvcyptlhe.supabase.co/auth/v1/callback`
  until the domain is fully cut over, then remove it).
- **OAuth consent screen**:
  - App name **`Fractionl`**, upload the logo, set support email + developer
    contact, and the Privacy Policy / Terms URLs
    (`https://circle.fractionl.ai/privacy`, `/terms`).
  - **Authorized domains**: `fractionl.ai` (remove `supabase.co` once cut over).
  - Submit for verification if still in testing — this is what removes the
    "unverified app" warning and finishes the branded look.

Do the same redirect-URI swap for the **edge-function** OAuth client in
`google-oauth-setup.md` (its callback also moves to the custom domain):
`https://auth.circle.fractionl.ai/functions/v1/oauth-google-callback`.

### 4. Point the app at the custom domain
- Update `VITE_SUPABASE_URL` to `https://auth.circle.fractionl.ai` in the host
  (Vercel/Netlify) project env, and locally in `.env`.
- Redeploy. The edge-function `SUPABASE_URL` is auto-injected by the platform
  and will reflect the active domain.

## Verify
1. Sign out, open the app, tap **Sign in with Google**.
2. The consent screen now reads **"to continue to auth.circle.fractionl.ai"**
   with the `Fractionl` app name + logo, no unverified-app warning.
3. Complete sign-in → you land back in the app, session valid.
4. Confirm **Circle → Add a source → Connect Google** (the edge-function flow)
   still completes end-to-end on the new callback host.

## Rollback
Point `VITE_SUPABASE_URL` back at `https://ksyuwacuigshvcyptlhe.supabase.co`,
redeploy, and (optionally) deactivate the custom domain. No code change needed.

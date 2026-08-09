# Re-engagement & web push - ops guide

*Verified accurate against `supabase/functions/cron-reengage/index.ts`,
`supabase/cron_setup.sql`, and `src/pathroom/ReturnSurface.tsx` on 2026-06-29;
re-verified 2026-08-09, no drift found. (The cron set has since grown a `cron-embed-circle` job at
07:45 UTC, after warmth and before the digest/reengage jobs described here - see `docs/PRODUCT.md` for
the full schedule; it doesn't change anything in this doc.)*

> **Status update (2026-07-03): BOTH CHANNELS ARE LIVE.** `RESEND_API_KEY` and
> all `VAPID_*` secrets were verified set in the production project and every
> cron schedule is active - the sweep emails and pushes for real. Every send
> attempt now lands a row in `delivery_log` (kind `reengage`, channel, status),
> so "did Monday's sweep go out?" is answerable with one query. The
> inert-by-default description below remains true for fresh environments.

How the "come back - here's what's waiting" sweep works, and how to turn on the
two delivery channels (email + web push) it shares with the warm digest. Both
channels are **inert by default**: the feature ships and the cron job runs with
no keys set; it just skips the unconfigured channel and counts the skip.

## What `cron-reengage` does

Edge function: `supabase/functions/cron-reengage/index.ts`. Service-role,
authenticated by the `x-cron-secret` header (same `CRON_SECRET` as the other
cron jobs). It:

1. Selects users who **onboarded** (`user_profiles.onboarding_completed = true`)
   and were **last active 5–21 days ago** (drifted, but not abandoned). Capped at
   500 users per run.
2. For each, computes cheap "what's waiting" counts:
   - **going quiet** - people in their circle with no interaction in 30+ days;
   - **decisions waiting** - banked answers not yet folded into a fresh read.
3. **Skips the user entirely if both counts are 0** - it never sends an empty
   nudge.
4. Sends a short, plain-language email (Resend) and a web push (`send-push`),
   each naming what's waiting and linking back to the app.

Opt-outs (read from `user_preferences`, all treated as opt-out / default-send):
- **email** goes out unless `email_notifications` is `false` or
  `goal_reminders` is `false`;
- **push** goes out unless `browser_notifications` is `false`.

It returns a JSON summary: `{ processed, emailed, pushed, skipped_no_hooks,
skipped_email_unconfigured, email_suppressed, email_configured, errors, at }`.

### Schedule

Mondays at **15:00 UTC** (`0 15 * * 1`), two hours after the warm digest (13:00
UTC) so a drifted user gets the warm-circle nudge first and this only reaches
those who still have something genuinely waiting. Scheduled in
`supabase/cron_setup.sql` via `pg_cron` + `pg_net`, like the other cron jobs.

## Web push setup (stays inert until set)

`send-push` returns `{ sent: 0, skipped: 'vapid_unconfigured' }` and never throws
until all three server VAPID secrets are present, so re-engagement push is a safe
no-op until you configure keys.

1. Generate a VAPID keypair:

   ```
   npx web-push generate-vapid-keys
   ```

2. Set the **server** secrets (Supabase → Project Settings → Edge Functions →
   Secrets, or `supabase secrets set`):
   - `VAPID_PUBLIC_KEY` - the public key from step 1
   - `VAPID_PRIVATE_KEY` - the private key from step 1
   - `VAPID_SUBJECT` - a `mailto:` or `https:` contact URL

3. Set the **frontend** env vars (Vite, public bundle):
   - `VITE_VAPID_PUBLIC_KEY` - the **same** public key as `VAPID_PUBLIC_KEY`
   - `VITE_PUSH_ENABLED=true` - flips the in-app subscribe flow on

Until `VITE_PUSH_ENABLED=true` and a public key are present, the app never asks
to subscribe; until the three server secrets are present, `send-push` no-ops.

## Email setup (Resend - stays inert until set)

If `RESEND_API_KEY` is missing, `cron-reengage` skips email cleanly and reports
it as `skipped_email_unconfigured` (push still fires). To enable:

1. Set `RESEND_API_KEY` as an edge-function secret.
2. Verify a sending domain in Resend so the from-address resolves.
3. The from-address is `WARM_DIGEST_FROM_EMAIL`, falling back to
   `CONCIERGE_FROM_EMAIL`, then `circle@fractionl.ai`. Set one to a verified
   address on your domain. Links use `APP_URL` (default
   `https://circle.fractionl.ai`).

## The in-app "what's waiting" surface

The in-app surface that shows the same hooks (people going quiet, decisions
waiting) needs **no configuration** - it reads the user's own data directly. The
keys above only gate the outbound email and push reminders.

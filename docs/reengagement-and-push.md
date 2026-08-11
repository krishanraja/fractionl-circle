# Re-engagement and web push

Last verified against the deployed design on 2026-08-10.

Circle sends a reminder only when a person the user saved has gone quiet. It
does not surface retired Plan or thesis concepts.

## Active flow

`cron-reengage` runs at 15:00 UTC each Monday, after the warm digest. It:

1. Finds onboarded users whose last activity was 5 to 21 days ago.
2. Counts saved people with a recorded interaction older than 30 days.
3. Skips users with no qualifying people.
4. Respects `email_notifications`, `browser_notifications`, and
   `goal_reminders` preferences.
5. Sends a short email and web push that link to Circle's main screen.
6. Writes each send attempt to `delivery_log` with `kind = 'reengage'`.

The function returns counts for processed users, sends, skips, suppressed
email, configuration state, and per-user errors. Do not invoke it manually in
production for a smoke test because a successful call can contact real users.

## Web push

`send-push` is service-role only. It validates the bearer token against the
project service-role key before accepting a user ID and payload.

Push stays inert until all three server secrets exist:

```text
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
```

When they are missing, the function returns
`{ sent: 0, skipped: 'vapid_unconfigured' }`. Expired subscriptions are removed
after a 404 or 410 response from the push service.

Generate a VAPID pair with:

```bash
npx web-push generate-vapid-keys
```

Then add the public key to the web app as `VITE_VAPID_PUBLIC_KEY` and keep the
private key in Supabase function secrets.

## Email

Email stays inert when `RESEND_API_KEY` is absent. The sender is read from
`WARM_DIGEST_FROM_EMAIL`, then `CONCIERGE_FROM_EMAIL`, with
`circle@fractionl.ai` as the final fallback.

## Release and verification

Deploy only the functions changed by the release:

```bash
supabase functions deploy cron-reengage --project-ref <project-ref>
supabase functions deploy send-push --project-ref <project-ref>
```

Verify without sending:

- `supabase functions list --project-ref <project-ref>` shows new deployed
  versions.
- The function source contains no `thesis_answers`, Plan, or banked-decision
  branch.
- `send-push` remains service-role gated and inert without VAPID secrets.
- Application tests, type checking, lint, and production build pass.

Keep a downloaded copy of the previous function source before deployment. To
roll back, redeploy that exact copy. Do not change schedules or secrets during
a copy-only release.

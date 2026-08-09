# Google OAuth verification - calendar write (warm-reach holds)

Goal: let the weekly warm-reach digest write a recurring hold **straight onto the
user's Google Calendar** instead of attaching an `.ics` file. That needs the
`calendar.events` (write) scope, which is a **sensitive** scope - it requires
Google's lighter brand verification (screenshots + a short demo video, ~days, no
cost), **not** the restricted-scope CASA audit.

The code is already shipped behind two flags that are **off**, so today's behavior
(an `.ics` attachment) is unchanged until you finish the steps below and flip them.

## The two flags (Supabase edge-function secrets)

| Flag | Effect |
|---|---|
| `GOOGLE_CALENDAR_WRITE_ENABLED=true` | OAuth asks for `calendar.events` (write) instead of read-only. Users must reconnect Google once to grant it. |
| `WARM_DIGEST_NATIVE_CALENDAR=true` | The digest writes the hold via the Calendar API (and drops the `.ics` from the email). Falls back to `.ics` automatically for any user without the write scope. |

Both default off. Set them only **after** verification clears.

## What you do in Google Cloud Console (only you can)

1. **APIs & Services → OAuth consent screen → Edit → Scopes → Add scope:**
   add `https://www.googleapis.com/auth/calendar.events`. Save.
2. **Publishing status:** if the app is still in *Testing*, the write scope works
   immediately for test users - you can validate end-to-end before submitting.
   To reach all users, click **Publish app**, then **Prepare for verification**.
3. Fill the verification form with the text below, record the demo video, submit.
4. When Google approves (usually a few days for a sensitive scope), set the two
   flags above in Supabase and redeploy `oauth-google-start` + `cron-warm-digest`
   (or just set the secrets - they are read at runtime).

### Scope justification (paste into the form)

> Circle by Fractionl helps a user maintain their own professional network. Once a
> week we compute which of the user's own contacts have gone quiet and email the
> user a short reminder. With the `calendar.events` scope we write a single
> recurring 20-minute "warm reach" reminder event onto the requesting user's own
> primary calendar so the reminder appears where they plan their week. We only
> create/update this one app-owned event (a fixed event id per user); we do not
> read, modify, or delete the user's other events with this scope. The data shown
> in the event is the user's own contact names that they added to our product.

### Demo video script (~60–90s, screen recording)

1. Sign in at `https://circle.fractionl.ai`, open **Circle → Add a source →
   Connect Google**. Show the consent screen listing the calendar scope; accept.
2. Trigger the warm-reach digest (or show the weekly email already received).
3. Open Google Calendar; show the single recurring "Warm reach - keep your circle
   warm" hold the app created, with the contact names in the description.
4. Narrate: "The app writes only this one reminder event onto the user's own
   calendar; it does not touch their other events."

## Deferred: Gmail drafts (do NOT submit yet)

Putting the pre-written message directly in the user's **Gmail Drafts** needs
`gmail.compose` - a **restricted** scope that triggers the annual **CASA security
audit (~$15k, 4–8 weeks, paid third-party assessment)**. We are deliberately not
pursuing this until the digest has proven it drives reconnects. Until then the
draft is delivered as a one-tap pre-filled `mailto:` link in the email, which
needs no scope. The code path for native drafts is intentionally not built yet.

(Note: the OAuth app already requests `gmail.send`/`gmail.readonly` in Testing
mode for test users only; going public with those is the same CASA gate. As of
2026-08-09 no code in this repo actually calls the Gmail API with that grant -
see the correction in `docs/google-oauth-setup.md` and the open item in
`SECURITY.md`. If Gmail access isn't on the near-term roadmap, dropping those
two scopes lets the contacts/calendar flow publish now via the lighter
brand-verification path instead of waiting on CASA.)

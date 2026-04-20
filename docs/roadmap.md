# Post-launch leverage roadmap

The 90-day plan is shipped (Phases 1-11). This file is the honest state of
everything the original plan listed as "post-launch leverage" — what's
done, what's partial, what's deferred, and roughly what it takes.

Ordering is by leverage-per-effort, not by lineup in the original plan.

## Shipped in this follow-up session

- **Concierge Slack/Email notifications** (`notify-concierge-event` edge fn).
  Triggered from `useConcierge.submit/cancel` on the client; ops CLI can
  re-trigger for any state transition.
- **Concierge booking URL** (Cal.com / Calendly). New
  `concierge_requests.booking_url` column; `book-url` command on
  `scripts/concierge-inbox.mjs`; user taps the link straight from Today.
- **Edit-distance logging** (taste/voice model *foundation*). New
  `move_edits` table; `log-move-sent` edge fn computes Levenshtein distance
  between the AI draft and what the user actually sent; MatchCard ships the
  "I sent it" flow. The model that *uses* this data is a dedicated follow-up.
- **Multi-CRM / multi-sheet importer**. `src/lib/crmCsv.ts` auto-detects
  HubSpot / Attio / Folk / LinkedIn / generic sheets from the header row
  and normalizes into the existing ingest pipeline. New `CrmCsvDrop`
  surface on **Add a source**.

## Deferred — own-session items (sized honestly)

### External enrichment — People Data Labs / Clay / Apollo on consent
**Effort:** half-session per provider. Each is a single edge fn + UI toggle
per user. PDL is the cleanest one-off (per-lookup API, pay-per-find).

**Shape when built:**
- `user_consents` row per provider, per user.
- Edge fn `enrich-circle-person` takes a `circle_person_id`, calls the
  provider, writes richer fields back to `circle_person` and/or a signal.
- UI: "Enrich with public data" button on a Person detail sheet — which we
  don't have yet. Likely bundled with a Person detail screen session.

**Gotchas:** none of these providers have a free tier worth testing at
scale. Prepare to burn $10-$50 to get the ingestion quality right.

### Per-category auto-send opt-in
**Effort:** one session. Needs genuine UX scoping first.

**Open questions (decide before building):**
- Which categories are auto-send candidates on launch? Plan mentioned
  `congrats_promotion` and `congrats_job_change` as the obvious starters.
  Add fundraise / anniversary? Probably.
- What's the auto-send gate? Per category + per-contact consent, or
  per-category only?
- Does auto-send bypass the user-approval step entirely, or still show a
  brief "sending in 60s" undo banner on Today?
- Executive tier only, as the plan specified.

**Schema:** new `autosend_consents` table (user_id, category,
circle_person_id nullable, enabled_at). New enum `move_category`.
`run-match-engine` writes the category onto the Move; a worker dispatches
approved-and-consented Moves through the channel.

### Cross-user market intelligence (anonymized)
**Effort:** one session *plus* a waiting period for real user volume.

Shipping this before we have enough users is worse than not shipping it —
empty charts and made-up insights sour trust. Revisit once paying-user
count is >200 OR once 90 days of Match+Move data exists.

**Shape when built:**
- Nightly job aggregates anonymized signal → outcome pairs into a
  `market_patterns` materialized view (ICP cluster × signal kind × response
  rate × close rate).
- Sunday Letter surfaces one pattern per week ("Offers shaped like yours
  are converting at 22% in Series B SaaS this quarter.").
- Opt-out respected at the user-profile level; aggregation never reads the
  raw rows of opt-out users.

### RFP scraper + named-contact news + tweet monitoring
**Effort:** one session **per feed**.

These are fundamentally provider-integration work. Picking the provider
first compresses the work:

- **RFPs:** SAM.gov opportunities feed (free, US federal only) is the
  easiest start. RFPdb / Govtribe if you want commercial too.
- **News:** Google News RSS per named contact is the cheapest. NewsAPI /
  Event Registry if you want entity-level resolution.
- **Tweets / X:** X API is $100/mo minimum now. The cheap alternative is
  polling a small number of `@user` RSS bridges. Won't scale to 10K users
  but is fine for the early Chief of Staff cohort.

Each feed is a cron-fired edge fn that writes `signals` rows keyed to
existing `circle_person` entries (or `subject='market'` for RFPs/trends),
which the Match Engine already consumes.

### Social data-export parsers — Instagram / Facebook / X
**Effort:** half-session total for all three. Same shape as `crmCsv.ts`,
just tuned per format.

- Instagram export → parse `following.json` from the ZIP.
- Facebook export → parse `friends/your_friends.json`.
- X export → parse `following.js` (with the weird "window.YTD" preamble
  stripped).

Build ZIP parsing into a new `ingestSocialExport` helper that fans out per
format, then add a "Drop social export" picker option.

### Legacy CRM *direct* (not CSV) import
**Effort:** one session per target. Only worth it for customers who
actively can't export clean CSVs.

CSV import already covers HubSpot / Attio / Folk (above). OAuth-based
direct import is the follow-up for:

- **HubSpot**: CRM API v3, `/crm/v3/objects/contacts`. Needs a HubSpot app
  + OAuth flow, mirror of Phase 5.
- **Attio**: REST API, API-key auth (simpler than OAuth).
- **Folk**: API is limited; CSV is currently the canonical path.

### Chrome Web Store submission
**Effort:** 1-2 hours of writing, then 1-2 weeks of Google review.

Not code — artifacts needed:

- Listing copy (short + long description, targeting fractionals).
- 3-5 screenshots at 1280×800 (popup states: not-connected, connected,
  recent captures; plus a before/after of Circle).
- 128×128 branded icon (replace the generated placeholder).
- Privacy policy at a public URL covering: the three LinkedIn-only
  permissions, the single Supabase API call, no-mail-bodies posture,
  chrome.storage scope. Add a `docs/privacy-policy.md` + host at
  `circle.fractionl.ai/privacy`.
- Submit via the Chrome Web Store Developer Dashboard ($5 one-time dev fee).

### Scheduling integration (Calendly / Cal.com) deep
Already shipped the minimum: ops drops a booking URL, user clicks.
"Deep" integration = embedded scheduler inside the ConciergeCard itself +
webhook-driven state transitions. Half-session.

**Shape:**
- Embed the Cal.com `<cal-inline>` component or Calendly widget inside the
  ConciergeCard so the user never leaves the app.
- Cal.com webhook on `BOOKING_CREATED` → edge fn that sets
  `concierge_requests.status = 'scheduled'` and `scheduled_at` + notifies
  ops. Obsoletes the manual `schedule` CLI command.

### Email / Slack notifications on concierge events (this session shipped core)
Already shipped the edge fn. Deferred:
- Per-user email digests ("Your concierge delivered: ...") — useful for
  users who don't check the app daily.
- Slack interactivity (buttons in the Slack message to schedule / start /
  deliver without leaving the channel).

Both are ~half-session once the ops team actually asks for them.

## Truly out-of-scope for now

- Mobile native shells (iOS / Android) — PWA + share target cover most of
  the value.
- Firefox / Safari extension variants.
- Whitelabel / multi-tenant.
- Team seats beyond the single EA add-on mentioned in the pricing plan.

## How to pick the next session

If the signal from paying users is...

- **"Our Circle isn't rich enough"** → ship Social export parsers + PDL
  enrichment. Half-day each.
- **"The Sunday Letter is thin"** → ship cross-user market intel (only if
  user-count warrants it) or edit-distance-trained draft personalization.
- **"I'm drowning in drafts"** → ship per-category auto-send.
- **"I can't show anyone this without a real Chrome Store listing"** →
  ship Chrome Web Store submission.
- **"Ops is buried in concierge coordination"** → ship the deep Cal.com
  integration + Slack interactivity.

Nothing here blocks a real launch. The 90-day plan is complete.

# Circle to Mindmaker OS: attribution + fleet-commerce wiring handoff

Date: 2026-05-30. For a Mindmaker OS session to verify the warehouse side is wired correctly. Circle ONLY emits; it never holds the warehouse service-role key. Everything below is the contract Circle now speaks.

## What Circle ships (live in source, on main)
- Runtime machine-readable product truth the fleet fetches:
  - https://circle.fractionl.ai/agent.json (product, pitch, ICP, the three tiers + prices, current offer, stripe_account=fractionl_ai, live-vs-roadmap status, URLs)
  - https://circle.fractionl.ai/llms.txt (human/LLM companion)
  - AGENT_BRIEFING.md in the repo (full sell/market brief, channel copy, objection handling, LIVE-vs-ROADMAP table)
- Corrected public surface (canonical circle.fractionl.ai, real positioning, OG/Twitter fixed, schema.org JSON-LD, sitemap, robots Sitemap).
- First-touch attribution capture in the app (UTM/source/agent/referrer/landing -> localStorage + cookie -> user_attribution on first auth).
- Stripe checkout stamps the attribution fields onto the Stripe customer + subscription metadata.
- Stripe webhook emits revenue lifecycle events to the OS ingest function (no-op until the secret is set).

## What the OS side must BUILD and VERIFY (this is the ask)
1. The ingest function. Create an edge function `ingest-attribution` on the OS Supabase project `gojpffsrxybbpbdzzrvs` that:
   - Accepts `POST` with header `x-attribution-secret: <ATTRIBUTION_INGEST_SECRET>`; rejects on mismatch.
   - Validates `app` (circle today; the other five apps will follow the same contract).
   - Upserts into `attribution.events` with `INSERT ... ON CONFLICT (dedupe_key) DO NOTHING` (idempotent).
   - Is rate-limited; never trusts the caller for anything but the shared secret.
2. The schema. Create the dedicated `attribution` schema with `attribution.events` (canonical contract below), RLS on, service-role writes only via the ingest function, no consumer-app read access. The `attribution` schema is migrated ONLY from the OS repo (Circle never migrates warehouse tables).
3. The secret. Generate `ATTRIBUTION_INGEST_SECRET` and set it in TWO places: (a) the OS ingest function env, and (b) Circle's Supabase edge env (`ATTRIBUTION_INGEST_SECRET`) so the Circle webhook starts emitting. Optionally set `ATTRIBUTION_INGEST_URL` on Circle if the function URL differs from the default `https://gojpffsrxybbpbdzzrvs.supabase.co/functions/v1/ingest-attribution`.
4. The read model. Ship `attribution.funnel_by_campaign` and `attribution.revenue_by_campaign` views spanning both Stripe accounts so Maya and Leo read CAC and LTV with no new ETL.

## Canonical event contract (what Circle POSTs)
```
{
  "app": "circle",
  "event": "purchased | refunded | churned",   // (landed | signed_up | activated are PENDING, see below)
  "stripe_account": "fractionl_ai",
  "occurred_at": "<ISO8601>",
  "dedupe_key": "<deterministic, unique>",
  "user_id": "<supabase auth uuid, from sub.metadata.supabase_user_id>",
  "anonymous_id": "<from sub.metadata.anonymous_id>",
  "utm_source|utm_medium|utm_campaign|utm_content|utm_term": "<from sub.metadata>",
  "campaign_id": "<from sub.metadata>",
  "agent": "<fleet agent id, from sub.metadata>",
  "stripe_customer_id": "cus_...",
  "stripe_subscription_id": "sub_...",
  "amount_cents": 3000,
  "currency": "usd",
  "metadata": { "tier": "...", "price_id": "...", "source_event": "..." }
}
```
The OS `attribution.events` table should carry at least: id, occurred_at, received_at, app, event, anonymous_id, user_id, email, utm_*, campaign_id, agent, referrer, landing_path, stripe_account, stripe_customer_id, stripe_subscription_id, amount_cents, currency, metadata jsonb, dedupe_key (unique).

## dedupe_key strategy (Circle side, already implemented)
- purchased: `circle:purchased:<subscription>:<invoice_id>` (fires on invoice.payment_succeeded; first sale + each renewal distinct)
- refunded:  `circle:refunded:<charge_id>:<amount_refunded>`
- churned:   `circle:churned:<subscription_id>`

## Stripe metadata keys Circle stamps (on customer + subscription)
`supabase_user_id`, `anonymous_id`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `campaign_id`, `agent`. Stripe account: fractionl_ai (rk_live_51TELoi...). The OS can read these directly off the Stripe objects as a fallback.

## Events that are PENDING (not yet emitted by Circle)
- `landed`, `signed_up`, `activated` require a server-side emit path (the SSG marketing edge layer / a server helper) so the shared secret is never exposed in the browser bundle. That edge layer is the locked-but-unbuilt 5a SSG surface, so these three events are ROADMAP. The revenue half (purchased/refunded/churned) is wired now.

## Circle-side steps still pending an authorized actor (NOT done in this session)
These are production-affecting and were intentionally not executed without explicit approval:
1. Apply the two additive migrations to the Circle Supabase project `ksyuwacuigshvcyptlhe`:
   - `supabase/migrations/20260530000001_processed_stripe_events.sql`
   - `supabase/migrations/20260530000002_user_attribution.sql`
   (Until user_attribution exists, the app's attribution flush fails open silently; until processed_stripe_events exists, the webhook dedup is skipped fail-open.)
2. Deploy the touched Circle edge functions: `stripe-checkout`, `stripe-webhook`, `dedupe-circle`, `oauth-google-start`, `oauth-microsoft-start`, `parse-screenshot`.
3. Set `ATTRIBUTION_INGEST_SECRET` on Circle's edge env (step 3 above) to turn on emission.
4. Rotate the exposed credentials: the `sbp_` Supabase token and the GitHub PAT embedded in the git remote.
5. Optional cleanup (production-destructive, needs go/no-go): undeploy the 7 orphan live functions (ai-strategic-analysis, swift-action, google-sheets-integration, get-market-sentiment, chat-with-krish, daily-briefing, voice-command) and the test-google-secret debug function.

## Where to read the full story
- `_upgrade/fractionl-circle/PHASE-0.md` (verified audit), `PHASE-1.md` (5X vision + commerce contract), and `AGENT_BRIEFING.md` (the fleet brief).

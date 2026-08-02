# Circle to Mindmaker OS: attribution + fleet-commerce wiring handoff

> **SUPERSEDED (flagged 2026-08-02).** The attribution wiring described below is still live and is
> now documented in the current, actively-maintained docs: `README.md`'s "Fleet attribution wiring"
> section and `AGENT_BRIEFING.md` section 10. Nothing here is lost by archiving this file -
> recommended for archiving to `docs/_archive/` pending confirmation.

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

## Circle-side production state (DONE this session, 2026-05-30)
- APPLIED to Circle Supabase `ksyuwacuigshvcyptlhe` (verified): `public.processed_stripe_events` (RLS on, deny-all) and `public.user_attribution` (RLS on, owner select/insert).
- DEPLOYED + smoke-verified (verify_jwt preserved): `stripe-webhook` v20 (false, returns 400 on missing signature), `stripe-checkout` v20 (true), `dedupe-circle` v16 (true, 401 without auth), `oauth-google-start` v13, `oauth-microsoft-start` v9, `parse-screenshot` v18.
- `src/integrations/supabase/types.ts` regenerated from the live DB (now includes both new tables).

## Still pending (after this session)
1. Set `ATTRIBUTION_INGEST_SECRET` on Circle's Supabase edge env so emission turns on. This MUST equal the secret on the OS ingest function. Do this when the OS receiver is built (steps 1-3 above). Optionally set `ATTRIBUTION_INGEST_URL` on Circle if it differs from the default.
2. Rotate the exposed credentials: the `sbp_` Supabase token and the GitHub PAT embedded in the git remote.
3. Optional cleanup (production-destructive, needs Krish go/no-go, NOT done): undeploy the 7 orphan live functions (ai-strategic-analysis, swift-action, google-sheets-integration, get-market-sentiment, chat-with-krish, daily-briefing, voice-command) and the test-google-secret debug function. Left in place because they have no repo source and may be wired to the wider fleet (n8n/OS); confirm nothing calls them before removing.

## Note on emission being live
The Circle webhook now emits purchased/refunded/churned, but `emitAttribution` is a no-op until `ATTRIBUTION_INGEST_SECRET` is set, so nothing is sent yet. The moment the OS provisions the receiver + shared secret (set on both sides), revenue events flow with zero further Circle changes.

## Where to read the full story
- `_upgrade/fractionl-circle/PHASE-0.md` (verified audit), `PHASE-1.md` (5X vision + commerce contract), and `AGENT_BRIEFING.md` (the fleet brief).

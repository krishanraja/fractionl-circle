# Circle by Fractionl — Source of Truth

> Circle is the thesis-validation engine for fractional executives. Bring your idea for how you want to fractionalize — what to offer and to whom — and it validates that idea against the real market in the open, then breaks the path to your first clients into doable, validated steps. It also keeps the warm network that powers that validation: every person you know, reachable from the moment their name matters.

This document is the canonical source for product, architecture, pricing, and go-to-market language. It is structured to be readable both by engineers who are shipping it and by sales/marketing AI agents who are selling it.

**Last verified against repo:** 2026-06-28 (post-kill-sweep reconciliation; the prior Circle CRM — Today/Streams/Circle/Ask — was retired in the kill-sweep, commit #85. This document reflects the thesis-validation engine that replaced it.)

---

## Current product state (2026-06-28)

### LIVE vs ROADMAP (the line the fleet must hold)

- **LIVE NOW.** The thesis-validation engine (guided dialogue → live Perplexity research → scored read → sharpen → journey map); the lightweight Circle tab (add contacts by screenshot, paste, voice, or typing; LinkedIn CSV import from the Deep dive tab); Stripe checkout for Free / Pro / Chief of Staff; market-pulse live instrument (fractionl-pulse API); LinkedIn CSV contact import; screenshot-to-contact vision capture; basic circle enrichment via LinkedIn lookup.
- **RETIRED (dead in live UI, code still on disk).** The four-tab Circle CRM (Today / Streams / Circle / Ask), the Match Engine and its cron, the Sunday Letter and its cron, the browser extension pairing UI, the voice onboarding to 3 Ideas (FirstVoice → extract-ideas flow), the Concierge booking sheet. Their edge functions (`run-match-engine`, `cron-match-engine`, `generate-sunday-letter`, `cron-sunday-letter`, `extension-ingest`, `extract-ideas`, `transcribe`) still exist in source but are not wired to any live UI path. Do not claim these as live features.
- **HONESTY GATE.** Do not pitch the Circle CRM's relationship-to-revenue features (Match Engine, Sunday Letter, "talk once, wake to a drafted Move") as the current product. The current product is the thesis-validation engine. The circle is the supporting context for that validation.

### Fleet attribution wiring

How Circle's revenue is attributed across the Mindmaker OS fleet. Agent-facing summary lives in `AGENT_BRIEFING.md`; this is the contract.

- **Emit-only.** Circle only emits attribution events; it never holds the central-warehouse service-role key. The warehouse is the Mindmaker OS Supabase project `gojpffsrxybbpbdzzrvs`.
- **Events.** `landed | signed_up | activated | purchased | refunded | churned`, POSTed to the OS function `ingest-attribution` with header `x-attribution-secret`. `landed` / `signed_up` / `activated` fire server-side (never the browser); `purchased` / `refunded` / `churned` fire from the signature-verified Stripe webhook off the subscription metadata. Each event carries a deterministic `dedupe_key`; the OS does INSERT ON CONFLICT DO NOTHING.
- **Canonical fields.** `id`, `occurred_at`, `app=circle`, `event`, `anonymous_id`, `user_id`, `email`, `utm_source` / `utm_medium` / `utm_campaign` / `utm_content` / `utm_term`, `campaign_id`, `agent`, `referrer`, `landing_path`, `stripe_account=fractionl_ai`, `stripe_customer_id`, `stripe_subscription_id`, `amount_cents`, `currency`, `metadata`, `dedupe_key`.
- **Stripe stamp.** Checkout stamps `metadata[supabase_user_id]` plus the `utm_*` / `campaign_id` / `agent` fields on both the Stripe customer and subscription, so the webhook can attribute the purchase back to first touch.
- **Runtime product-truth URLs the fleet reads.** `https://circle.fractionl.ai/llms.txt` and `https://circle.fractionl.ai/agent.json` (both ROADMAP, not yet emitted by the SSG build; do not fetch these as live truth yet).

---

## Table of contents

**Product & Strategy**
1. [Why Circle exists](#1-why-circle-exists)
2. [The 60-second pitch](#2-the-60-second-pitch)
3. [ICP — who Circle is for](#3-icp--who-circle-is-for)
4. [Outcomes & benefits](#4-outcomes--benefits)
5. [Differentiation](#5-differentiation)
6. [Pricing & gating](#6-pricing--gating)

**How the product works**
7. [The data model](#7-the-data-model)
8. [Surfaces — what each tab does](#8-surfaces--what-each-tab-does)
9. [Onboarding](#9-onboarding)
10. [Sources & ingestion](#10-sources--ingestion)
11. [Retired: Match Engine](#11-retired-match-engine)
12. [Retired: Sunday Letter](#12-retired-sunday-letter)
13. [Retired: browser extension](#13-retired-browser-extension)
14. [Screenshot capture](#14-screenshot-capture)
15. [Retired: Concierge](#15-retired-concierge)

**Architecture**
16. [Tech stack](#16-tech-stack)
17. [Frontend layout](#17-frontend-layout)
18. [Database schema](#18-database-schema)
19. [Edge functions (53 in source)](#19-edge-functions-53-in-source)
20. [AI / LLM call sites](#20-ai--llm-call-sites)
21. [Auth, RLS & security posture](#21-auth-rls--security-posture)
22. [Reliability & rate limiting](#22-reliability--rate-limiting)
23. [Compliance](#23-compliance)

**Go-to-market enablement (for sales/marketing agents)**
24. [Sales narrative anchors](#24-sales-narrative-anchors)
25. [Channel-ready copy](#25-channel-ready-copy)
26. [Objection handling](#26-objection-handling)
27. [Use cases by ICP segment](#27-use-cases-by-icp-segment)
28. [Proof of mechanism](#28-proof-of-mechanism)
29. [Brand & voice](#29-brand--voice)

**Operational reference**
30. [Local development](#30-local-development)
31. [Deployment](#31-deployment)
32. [Project history](#32-project-history)

---

# Product & Strategy

## 1. Why Circle exists

The fastest-growing segment of the senior professional workforce isn't employees and isn't freelancers. It's **portfolio operators**: fractional CMOs, CFOs, CTOs, COOs, CHROs, advisors, and consultants who build six- and seven-figure businesses by serving 2–7 clients in parallel.

The first thing every new fractional has to solve is the same: **is my offer real?** Not "is it a nice idea" but "is there a burning need, is the market sized, can I win against the incumbents, and do I have the warm network to close the first client fast enough that I don't run out of runway?"

Most fractionals answer that question by talking to a few people, reading a blog post, and guessing. They pick wrong, spend six months chasing a niche that doesn't pay, and either pivot too late or limp back to full-time employment.

**Circle is the tool that answers the question before they waste the six months.** Bring your thesis — what you want to offer, and to whom. It validates it against the real market in the open (~20s live Perplexity research), returns an honest scorecard (demand, burning need, competition, your edge, warm reach, credibility — bands with evidence and confidence, never fake numbers), and breaks the hard middle into specific validated steps. The circle powers the warm-reach read: the real faces who could be your first client.

### The secondary insight

Once the thesis is validated, the fractional still needs to manage the network that closes it. Circle keeps that network: every person they know, capturable in seconds by screenshot, voice, paste, or typing. The thesis tool reads the circle for warm reach; the circle tab keeps the circle warm.

---

## 2. The 60-second pitch

A fractional CMO is 90 days out of her last full-time role. She thinks she wants to offer "marketing for B2B SaaS companies." She has no idea if that's too broad, whether the market is saturated, what price she can charge, or which of her 400 LinkedIn connections could be her first client.

She types her thesis into Circle. A sufficiency check pushes back on the thin input — "who specifically, at what stage, for what outcome?" — until the idea has a real shape. Then live research runs in the open: Perplexity reads the demand landscape, competitor density, buyer complaints, pricing benchmarks, and her LinkedIn network's overlap. Twenty seconds later she has a scorecard:

- **Is it a real opportunity?** Demand: strong. Burning need: yes — a clear buyer complaint around pipeline-to-revenue attribution. Crowding: high (flagged as risk, not hidden). Her edge: ten years inside a specific vertical her competitors lack.
- **Can she win it fast?** Fit: high. Warm reach: 12 named people in her circle who match the ICP. Credibility: strong.

The scorecard gives her confidence bands and evidence, not fake precision. She adds a business she admires to sharpen her edge, adds a few contacts by screenshot, and exports the living journey map: specific named steps to her first retained client, with the real faces from her circle woven in.

She knows what to do Monday morning. Circle got her there in under an hour.

Free gives one full validation with no paywall on first value. Pro ($39/mo) is unlimited re-validation as the thesis evolves, real warm reach from the full LinkedIn import, named next moves, and market monitoring.

---

## 3. ICP — who Circle is for

> **Deep profile:** The tables below are the operational quick-reference. For the full archetype — the three motivation segments (Pushed / Pulled / Lifestyle), the psychology, the buying-trigger window, the market data, and the commercial wedge — see [docs/icp-archetype.md](./docs/icp-archetype.md), the canonical buyer profile.

### Primary ICP — The Fractional Executive

| Attribute | Detail |
|---|---|
| **Title** | Fractional CMO / CFO / CTO / COO / CHRO |
| **Career stage** | 15+ years experience, ex-VP or C-suite from high-growth companies |
| **Revenue** | $150K – $1.5M annually across 2–7 concurrent engagements |
| **Working pattern** | Mobile during the day (between client meetings), desktop on Sunday for planning |
| **Current stack** | LinkedIn, Apple Notes, a stale Google Sheet, maybe HubSpot they hate, calendar reminders that don't fire |
| **Core pain** | "I don't know if my offer is right, and I'm already 90 days in." |
| **Buying trigger** | A slow first quarter. A niche that isn't converting. A competitor who seems to be winning clients they should be winning. |
| **Where they live online** | LinkedIn (daily), Substack (read more than write), specific Slack/Discord communities for their function (CMO Coffee Talk, fCFO Collective, etc.) |
| **What they pay for** | Tools that give them clarity and confidence. They spend $50–$200/mo on personal SaaS without thinking about it. |

### Secondary ICPs

**The independent strategy advisor / boutique consultant.** Retainers, project work, speaking gigs. Needs to validate which of her three service ideas is the real opportunity before committing.

**The thought leader operator.** Author / keynote / workshop facilitator monetizing IP through multiple channels. Needs to know which offer to lead with.

**The emerging fractional (year 1).** Senior professional in their first year of independence. Needs the validation and the steps that the senior fractionals "all seem to have figured out."

### Anti-ICP (do not sell to)

- SDRs / outbound BDRs running prospecting motions for someone else.
- Full-time founders (the LTV/loyalty pattern is wrong — they grow out of it).
- Sales teams of 3+. Circle is a single-operator product.
- Anyone whose pipeline is "20 enterprise logos." That's a Salesforce/HubSpot job.

### What every Circle ICP shares

- **They are unsure their offer is right** — and afraid to admit it.
- They are **time-starved** and need answers fast.
- They value **evidence over advice** — they've heard enough opinions.
- They need **accountability** more than automation.
- They will pay for a tool that makes them **feel organized and confident**.

---

## 4. Outcomes & benefits

### Outcomes (the headline result)

| Outcome | Mechanism |
|---|---|
| **Know if your offer is real before you waste six months** | Live Perplexity research validates demand, competition, pricing, and edge in ~20s. Confidence bands and evidence, not opinions. |
| **Know which people in your network can close it** | The scorecard's warm-reach score reads your real circle and names the specific contacts. |
| **Get specific steps, not generic advice** | The living journey map breaks the hard middle into ordered, validated moves with your real circle woven in. |
| **Sharpen as you learn** | Add a business you admire (feeds your edge), add contacts (feeds warm reach), re-run as the thesis evolves. |
| **Stay current on your market** | The Home screen's market-pulse instrument (live fractionl-pulse API) shows role demand, the Fractional Working Index, and weekly deltas. |

### Benefits (per surface)

- **Deep dive (thesis tab)** — Guided dialogue, live research, honest scorecard, sharpen panel, journey map with circle faces. One thing per screen, always fit in a phone viewport.
- **Circle tab** — Drop a person in seconds: screenshot a LinkedIn or business card, paste a URL or handle, speak a name, or type. LinkedIn CSV import via the Deep dive's add-people screen.
- **Market pulse (on Home)** — Live Fractional Working Index for your role, this-week deltas, a rising topic. Genuinely changes overnight.
- **Ember gauge (in nav)** — Dim when we know little, brighter and warmer as real data goes in. Honest signal about read quality.

---

## 5. Differentiation

### Why Circle is not a CRM

| | HubSpot / Salesforce / Pipedrive | Circle |
|---|---|---|
| Built for | Sales team of 5–500 | Single portfolio operator |
| Data model | Companies → Deals → Contacts | Thesis → Scorecard → Circle → Journey |
| Filing burden | Heavy. Expects discipline. | Zero. Screenshot, voice, paste. |
| Primary job | Manage existing pipeline | Validate whether the offer is right |
| Mobile | Afterthought | Primary surface |
| Pricing for one seat | $50–$150/mo locked behind seats | $39 |

### Why Circle is not a generic AI assistant (ChatGPT / Claude)

Generic LLMs give opinions from training data. Circle does live research (Perplexity reads the actual market right now), scores against your specific circle (real people who actually know you), and returns evidence with confidence bands — not generated confidence with no source.

### Why Circle is not LinkedIn / Sales Navigator

LinkedIn is the graph. Circle is the thesis tool that reads your slice of that graph for warm reach. Sales Nav is built for SDRs running prospecting motions; it has no concept of your thesis, your edge, your journey.

### What is genuinely defensible

1. **Live research, not synthetic.** The read is grounded in Perplexity results — real web sources, not LLM training data. Low-confidence findings are flagged.
2. **Real circle, not sample data.** The warm-reach score names your actual contacts — people who know you and whose fit the model can evaluate. Fake people produce fake scores.
3. **Honest renderer.** Scores are confidence bands with evidence, unreadable inputs are refused, low-confidence reads are flagged not hidden.

---

## 6. Pricing & gating

Tier names, prices, and feature bullets are sourced from `src/lib/tiers.ts`. Stripe price IDs are configured via `VITE_STRIPE_PRO_MONTHLY_PRICE_ID` and `VITE_STRIPE_EXEC_MONTHLY_PRICE_ID` env vars. Gating in `src/hooks/useSubscription.ts`.

| | **Freemium** | **Pro** | **Chief of Staff** |
|---|---|---|---|
| **Price** | $0 | $39 / mo | $79 / mo |
| **Tagline** | Try the magic. | Build the whole portfolio. | Help me scale. |
| **One full thesis validation + complete read + steps** | ✅ | ✅ | ✅ |
| **Build your circle by screenshot or CSV** | ✅ | ✅ | ✅ |
| **Unlimited thesis validations as you evolve** | — | ✅ | ✅ |
| **Real warm reach from your full network** | — | ✅ | ✅ |
| **Specific, named next moves** | — | ✅ | ✅ |
| **Ongoing market monitoring** | — | ✅ | ✅ |
| **Unlimited Streams + Matches (roadmap)** | — | — | ✅ |
| **Sunday Letter audio (roadmap)** | — | — | ✅ |
| **External signal feeds (roadmap)** | — | — | ✅ |
| **Cross-user market intelligence (roadmap)** | — | — | ✅ |
| **Per-category auto-send consent (roadmap)** | — | — | ✅ |
| **White-glove concierge onboarding (roadmap)** | — | — | ✅ |
| **Priority compute** | — | — | ✅ |

**Chief of Staff note:** the features marked (roadmap) in that tier refer to capabilities from the prior Circle CRM architecture (Match Engine, Sunday Letter, Concierge) that are not surfaced in the current live UI. The tier is in Stripe and purchasable; today it grants priority compute only beyond what Pro gives. Those features are tracked as future builds.

**Gating implementation reference:**
- Feature gates (`sunday_letter_audio`, `external_signals`, `autosend`, `market_intelligence`, `concierge`, `ask_memory`, etc.): `TIER_FEATURES` in `src/hooks/useSubscription.ts:55`.
- Server-side enforcement: `_shared/compliance.ts` rate-limit + tier checks; `usage_tracking` table; `subscriptions.tier` column.
- Trial: `subscription.status = 'trialing'` upgrades effective tier to Pro until `trial_ends_at`.

---

# How the product works

## 7. The data model

The active thesis-validation product uses three primary tables:

```
THESIS_INSPIRATION          (businesses the user admires → sharpens "Your edge")
         │
         ▼
THESIS_RUNS                 (each validated thesis: scorecard, step progress, thesis text, background)
         │
         ▼
(informs)
         │
CIRCLE_PERSON               (canonical, deduplicated contact list powering the warm-reach score)
    │
    └─◄── SOURCES           (provenance of each contact: share_sheet, ios_shortcut, business_card_photo,
                              linkedin_csv, voice_seed, etc.)
```

**Dead tables (exist in migrations, no live UI writes to them):** `ideas`, `matches`, `moves`, `streams`, `sunday_letters`, `concierge_requests`, `move_edits` — all from the prior Circle CRM ontology. Do not write new code against them.

Migration count: 50+ files in `supabase/migrations/` (last: `20260623120000_circle_enrichment.sql`).

**Migration drift note.** As of prior deploys, `supabase migration list --linked` shows known drift on older entries (some local files not tracked remote, some remote with no local file). Do not run `supabase db push` blindly — apply targeted migrations via the Management API instead. Newer migrations from `20260418000001` onward are clean.

---

## 8. Surfaces — what each tab does

The authed app shell is `src/pathroom/CircleApp.tsx` — a two-tab layout in the ember (.thx) design system.

### Circle tab (`src/pathroom/CircleHome.tsx`)

The contact-first home. Free hero, accessible to all users.

- **Brand bar** — wordmark and ember gauge.
- **"Drop a contact" CTA** — opens `AddToCircleSheet` with four capture modes: screenshot or photo (vision LLM), paste anything (URL, handle, bio, signature), just say their name (voice), or type a name plus what you remember.
- **"What are you working on?"** — `WorkingOnInput`, a quick context note.
- **Circle people list** — `CirclePeopleList`, shows all contacts with tag chips. Total count. Quick-add from empty state.

### Deep dive tab (`src/pathroom/ThesisApp.tsx`)

The thesis-validation tool. Free users get one full pass; Pro gates the Home and the deepening tools.

Flow phases (each one screen, no-scroll frame):

1. **Home** — Pro-only command center. Charging ember orb, live market-pulse instrument (Fractional Working Index + role demand + delta + rising topic), navigation to read / path / circle.
2. **Capture** — `CaptureDialogue.tsx`. Guided, gated dialogue: one question at a time, sufficiency judge (`judge-thesis` edge fn + local fallback) pushes back on thin input, runs after two rounds regardless.
3. **Thinking** — live research runs in the open (~20s, Perplexity). Progress rings, findings clamp to one line.
4. **Read** — `ReadView`. Scorecard: Is it a real opportunity? (Demand, Burning need, Crowding, Your edge). Can you win it fast? (Fit, Warm reach, Credibility). Bands with evidence and confidence, no fake numbers. Headline clamps to 3 lines, tap to expand.
5. **Sharpen** — `SharpenPanel.tsx`. Three intents: a business you admire (feeds edge via `extract-admire`), a business card / screenshot (feeds circle via `extract-contact`), LinkedIn URL (feeds fit + credibility). Re-run is an explicit choice.
6. **Journey** — `JourneyMap.tsx`. Living journey map: path to first retained client, real circle faces woven in, step tracking persists in `thesis_runs.step_progress`.
7. **Add people** — `ThesisCircle.tsx`. Screenshot a profile or business card (vision LLM), or upload LinkedIn Connections CSV.
8. **Gate** — upgrade prompt for free users who have used their one pass.

### Cross-cutting

- **Auth** — `src/components/AuthPage.tsx`. Email + password, Google OAuth.
- **Share Contact** — `src/pages/ShareContact.tsx`. Android PWA share target / iOS Shortcut destination for screenshot-to-contact.
- **Privacy / Terms** — `src/pages/Privacy.tsx`, `src/pages/Terms.tsx`.
- **Preview fixtures** — `/preview/cockpit`, `/preview/start`, `/preview/sharpen`, `/preview/journey`, `/preview/loader` (unlinked, lazy, excluded from prod bundle critical path).
- **Compliance** — `ConsentBanner`, `SessionManager` (`src/components/compliance/`).

---

## 9. Onboarding

New users land on the **Capture screen** (`CaptureDialogue.tsx`). The guided dialogue:

1. **One question at a time.** Not a form: it draws out who, what, and why-you with soft follow-ups.
2. **Sufficiency judge.** `judge-thesis` edge fn (Gemini via the provider fallback) + a deterministic local fallback reads the thesis. Thin inputs ("marketing services") get a push-back naming exactly what's missing. After two rounds it runs anyway and flags the read as a sketch.
3. **Question / multiple / essay routing.** A question ("what should I offer?") routes to a short discovery flow; multiple offers in one route to a pick-one; a verbose input is played back as one line to confirm. Then one line of background.
4. **Research runs** — live Perplexity (~20s), visible as it works.
5. **Read** — the scorecard. Free users stop here for their one pass. Pro users can sharpen, re-run, and access Home.

The ember brightens as more fuel goes in (thesis, background, LinkedIn, circle people, admired businesses). A dim ember honestly signals a thin read.

---

## 10. Sources & ingestion

Circle contacts feed the warm-reach score in the thesis read. Sources flow into `circle_person` via fingerprint matching (email, phone, normalized name + company, social handles).

| Source | UI | Edge function | Notes |
|---|---|---|---|
| **Screenshot or photo** | `AddToCircleSheet` → `QuickAddImage` | `extract-contact` (Gemini vision) | LinkedIn profile, Instagram, business card, name tag. Primary quick-add mode. |
| **Paste** | `AddToCircleSheet` → `QuickAddPaste` | `resolve-contact` (server-side dedupe) | URL, @-handle, email, or signature block. |
| **Voice** | `AddToCircleSheet` → `VoiceSeedCapture` | `parse-voice-contact` (gpt-4o-mini) | Say the name and company; AI parses and dedupes. |
| **Typed** | `AddToCircleSheet` → `QuickAddTyped` | `resolve-contact` | Name plus any details you remember. |
| **LinkedIn CSV** | `ThesisCircle.tsx` (Deep dive → add-people screen) | (client-side parse → `importConnectionsCsv`) | Upload your LinkedIn Connections export. The Deep dive links directly to the LinkedIn export page (24–48hr wait) so users know where to get it. |
| **Screenshot (iOS Shortcut / Android share)** | `src/pages/ShareContact.tsx` | `parse-screenshot` (claude-haiku-4-5-20251001 preferred → gpt-4o-mini fallback) | One-gesture capture from outside the app. See [docs/screenshot-to-contact.md](./docs/screenshot-to-contact.md). |
| **Enrichment** | (server-side, not user-initiated) | `contact-enrich`, `linkedin-search`, `resolve-contact`, `merge-persons` | Clearbit / Apollo enrichment + Google CSE-backed LinkedIn lookup + explicit merge. |

**Not currently wired to any live UI path (code present, UI not exposed):** Google Contacts / Calendar OAuth sync (`oauth-google-*`, `sync-google`, `cron-sync-google`), Microsoft Contacts / Calendar OAuth sync (`oauth-microsoft-*`, `sync-microsoft`, `cron-sync-microsoft`), browser extension (`extension-ingest`), CRM CSV import (`CrmCsvDrop.tsx`). Do not claim these as live without confirming the UI path is restored.

---

## 11. Retired: Match Engine

The Match Engine (scoring Idea × Person, drafting Move DMs, the nightly cron) was the core of the prior Circle CRM. It was retired in the kill-sweep (commit #85). The edge functions `run-match-engine` and `cron-match-engine`, the hook `useMatches.ts`, and the `matches` / `moves` / `move_edits` tables remain in the codebase as dead code. No live UI path reaches them. Do not claim Match Engine as a live feature.

---

## 12. Retired: Sunday Letter

The Sunday Letter (weekly AI narrative + optional audio) was the retention loop of the prior Circle CRM. It was retired in the kill-sweep. Edge functions `generate-sunday-letter` and `cron-sunday-letter`, the hook `useSundayLetter.ts`, and the `sunday_letters` table remain in the codebase as dead code. No live UI path reaches them. Do not claim Sunday Letter as a live feature.

---

## 13. Retired: browser extension

`extension/` — Manifest V3 extension code is still on disk. The browser extension pairing UI (`ExtensionPair.tsx`) and the `extension-ingest` edge function exist in source but are not exposed in any live UI path. Chrome Web Store submission was a future item that has not shipped. Do not claim the browser extension as a live feature.

---

## 14. Screenshot capture

One-gesture contact capture. Works on Android (Web Share Target) and iOS (Apple Shortcut). See [docs/screenshot-to-contact.md](./docs/screenshot-to-contact.md) for the full flow.

- **Android.** PWA installed → take screenshot → Share → Circle → land on `/share-contact`. Wired via `public/site.webmanifest` `share_target` + `public/sw.js`.
- **iOS.** Apple Shortcut installed once. POSTs the screenshot to `parse-screenshot`, opens `/share-contact?prefill=<urlencoded-JSON>`.
- **In-app.** `AddToCircleSheet` → "Screenshot or photo" mode uses `extract-contact` (vision LLM) directly.
- **Privacy.** Screenshots only leave the device when the user explicitly shares. The function does not persist the raw image. EXIF is not read.

---

## 15. Retired: Concierge

The white-glove Concierge onboarding (Chief of Staff feature, `ConciergeBookingSheet.tsx`, `concierge_requests` table, `notify-concierge-event` edge function, `scripts/concierge-inbox.mjs`) was retired in the kill-sweep. The code remains in source. Do not claim Concierge as a live feature.

---

# Architecture

## 16. Tech stack

| Layer | Tech | Notes |
|---|---|---|
| **Frontend** | React 18 + TypeScript (strict: true) + Vite | Mobile-first PWA. SPA with React Router. |
| **UI** | Tailwind + shadcn/ui + Radix primitives | Custom ember (.thx) design system in `src/pathroom/`. |
| **Animation** | Framer Motion | `motion.*` instances in shared components; all have `initial` + `animate`. |
| **Data fetching** | TanStack React Query (provider mounted) + direct `supabase.functions.invoke` | React Query not yet fully adopted across all call sites. |
| **Backend** | Supabase (Postgres + Auth + Edge Functions / Deno) | Project: `ksyuwacuigshvcyptlhe`. |
| **Edge runtime** | Deno (Supabase Edge Functions) | 53 functions in source. |
| **AI providers** | Perplexity (live research in `validate-thesis`) · OpenAI (gpt-4o-mini for voice parse, parse-screenshot fallback) · Anthropic (claude-haiku-4-5-20251001 preferred in `parse-screenshot`) · Lovable Gateway (google/gemini-flash for `generate-user-insights`) · Google Gemini (via `GOOGLE_API_KEY` in `extract-admire`, `judge-thesis`) | All wrapped with `AbortSignal.timeout`. |
| **Payments** | Stripe (Checkout, Customer Portal, Webhook) | Account `fractionl_ai`. Hand-rolled Web Crypto HMAC signature verify + `processed_stripe_events` idempotency ledger. |
| **SMS** | Twilio | `send-sms` edge function. Origin-allowlisted CORS. |
| **Email** | Resend | Ops notifications (retired Concierge flow; retained in edge function source). |
| **Search** | Google CSE | LinkedIn lookup via `linkedin-search`. |
| **Hosting** | Vercel (frontend) + Supabase (functions + DB) | Auto-deploy on `main` push. |

**TypeScript posture.** `tsconfig.app.json` runs with `strict: true`. `tsc --noEmit -p tsconfig.app.json` must be clean before merge.

---

## 17. Frontend layout

```
src/
├── App.tsx                    Top-level router + providers (Auth, Query, Tooltip, Toaster, ErrorBoundary, ConsentBanner)
├── main.tsx                   Bootstrap + global window error/unhandledrejection sink
├── pages/
│   ├── Privacy.tsx            /privacy (auth-gated)
│   ├── Terms.tsx              /terms
│   ├── NotFound.tsx
│   └── PrivacySignInPrompt.tsx
├── components/
│   ├── AuthPage.tsx           Email/password + Google OAuth
│   ├── ErrorBoundary.tsx
│   ├── SetNewPasswordScreen.tsx
│   ├── PreferencesApplier.tsx
│   ├── circle/                Contact add/display components (AddToCircleSheet, CirclePeopleList,
│   │                           QuickAddImage, QuickAddPaste, QuickAddTyped, VoiceSeedCapture,
│   │                           TagChips, CircleListRow, etc.)
│   ├── compliance/
│   │   ├── ConsentBanner.tsx
│   │   ├── SessionManager.tsx
│   │   └── PrivacySettings.tsx
│   ├── navigation/            ResponsiveDialog, MobileHeader
│   ├── feedback/              ErrorBanner, InlineSuccess
│   └── ui/                    shadcn/Radix primitives
│   ── [DEAD CODE — not imported by live app routing]
│   ├── auth/                  Legacy auth subcomponents (referenced only by AuthPage)
│   ├── layout/                AppShell, BottomNav, DesktopSidebar (old 4-tab shell)
│   ├── today/                 MatchCard, SundayLetterCard, ConciergeCard, FocusMove, NextMove, GettingStarted
│   ├── profile/               ProfileSettingsSheet (old CRM settings drawer)
│   └── billing/               PricingSheet, PricingPage, etc. (partially live via useSubscription)
├── pathroom/                  THE LIVE PRODUCT — all active screens live here
│   ├── CircleApp.tsx          Authed app shell: two-tab layout (Circle + Deep dive)
│   ├── CircleHome.tsx         Circle tab: drop a contact, what are you working on, your circle list
│   ├── ThesisApp.tsx          Deep dive tab: home→capture→thinking→read→sharpen→journey→addpeople→gate
│   ├── Home.tsx               Pro-only command center (ember orb, market pulse, navigation)
│   ├── CaptureDialogue.tsx    Guided gated Start Here dialogue
│   ├── SharpenPanel.tsx       After-read "add fuel" panel (admire / card / LinkedIn + re-run)
│   ├── JourneyMap.tsx         Living journey map (steps + circle faces + step tracking + weak pivot)
│   ├── ThesisCircle.tsx       Add-people surface (screenshot add + LinkedIn CSV import)
│   ├── WorkingOnInput.tsx     "What are you working on?" quick note
│   ├── circleChrome.tsx       BrandBar for the Circle tab
│   ├── thesisChrome.tsx       EmberNav brand-mark gauge + shared chromeCss
│   ├── thesisViews.tsx        Shared presentational layer (read, thinking views) + thesisCss + types
│   ├── thesisData.ts          Data layer (judge, validate, persist run, admire, inspiration,
│   │                           circle add/import, step progress, run count, market pulse)
│   ├── thesisJudge.ts         Deterministic client fallback for sufficiency judge + types
│   ├── tokens.ts              Quiet-instrument design tokens
│   └── CircleApp.tsx          (see above)
├── preview/                   Unlinked design fixtures (lazy, not in prod bundle critical path)
│   ├── CockpitMock.tsx        /preview/cockpit
│   ├── StartHereMock.tsx      /preview/start
│   ├── SharpenMock.tsx        /preview/sharpen
│   ├── JourneyMock.tsx        /preview/journey
│   └── LoaderMock.tsx         /preview/loader
├── hooks/
│   ├── useAuth.tsx            Auth context
│   ├── useSubscription.ts     Tier, limits, usage, openCheckout, openPortal
│   ├── useAppFrame.ts         Locks the page to the visible viewport (no-scroll frame)
│   ├── useConsent.ts          GDPR consent state
│   ├── useDataPrivacy.ts      Data export / deletion
│   ├── use-mobile.tsx
│   ├── use-toast.ts
│   ── [DEAD CODE hooks — not called by live app routes]
│   ├── useMatches.ts          Old Match Engine hook (imports run-match-engine)
│   ├── useSundayLetter.ts     Old Sunday Letter hook
│   ├── useConcierge.ts        Old Concierge hook
│   ├── useCircle.ts           Old 4-tab circle hook
│   ├── useIdeas.ts            Old Ideas hook
│   └── (others from the 4-tab CRM)
├── lib/
│   ├── tiers.ts               Tier catalogue (Freemium / Pro / Chief of Staff)
│   ├── circleIngest.ts        Shared ingest pipeline (used by ShareContact.tsx)
│   ├── handles.ts             Social handle normalization
│   ├── fingerprint.ts         Dedupe key generation
│   ├── attribution.ts         UTM / attribution capture
│   ├── bootSplash.ts          Boot splash reveal logic
│   └── utils.ts               cn() + helpers
├── integrations/
│   └── supabase/
│       ├── client.ts
│       └── types.ts           Generated from supabase gen types
└── index.css                  Design tokens, typography, theme (.thx ember system)
```

---

## 18. Database schema

**Active tables (thesis product + circle tab):**

| Table | Purpose |
|---|---|
| `thesis_runs` | Each thesis-validation run: scorecard jsonb, step_progress jsonb, thesis text, background, created_at. User-owned, RLS. |
| `thesis_inspiration` | Businesses the user admires: name, positioning, kind (business/person/competitor), field, why. User-owned, RLS. Feeds "Your edge" in the next read. |
| `circle_person` | Canonical, deduplicated contact. `handles` jsonb for social handles. User-owned, RLS. |
| `sources` | Every ingestion source per user. `kind` enum: google · microsoft · linkedin_csv · linkedin_extension · instagram_export · facebook_export · x_export · legacy_crm_csv · sheet_upload · ios_contacts · ios_shortcut · share_sheet · voice_seed · external_enrichment · business_card_photo · inbox_signature_scan · calendar_backscan |
| `person_raw` | Per-source raw rows, links to canonical `circle_person` |

**Auth, subscriptions, compliance:**

| Table | Purpose |
|---|---|
| `subscriptions` | Stripe-synced tier + status |
| `processed_stripe_events` | Webhook idempotency ledger keyed on Stripe `event.id` |
| `usage_tracking` | Per-feature, per-period counts |
| `rate_limits` | Durable per-user / per-bucket rate limiter |
| `oauth_states` | Single-use, TTL'd OAuth state nonces. RLS: deny-all |
| `oauth_tokens` | Encrypted tokens with SHA-256 integrity hash. RLS: deny-all |
| `user_profiles` | Account, business context, onboarding state |
| `user_preferences` | Theme, notifications, AI personality |
| `user_consents` | GDPR consent choices (7-yr legal hold) |
| `security_audit_log` | User-action audit trail (7-yr legal hold) |
| `data_subject_requests` | DSAR log (7-yr legal hold) |
| `user_behavior_logs` | Behavioural analytics (90-day auto-purge) |
| `user_sessions` | Session analytics (90-day auto-purge) |
| `user_attribution` | UTM + anonymous_id, persisted at sign-up |
| `data_retention_policies` | Drives the retention cron |

**Dead tables (prior Circle CRM, live in migrations only):** `ideas`, `matches`, `moves`, `move_edits`, `streams`, `sunday_letters`, `concierge_requests`, `clients`, `opportunities`, `activity_logs`, `revenue_entries`, `monthly_goals`, `daily_progress`, `weekly_summaries`, `ledger_entries`, `reminders`, `talent_contacts`, `talent_skills`, `talent_referrals`, `talent_opportunities`, `signals`, `ai_conversations`, `conversation_sessions`, `chat_messages`. Do not write new code against these.

---

## 19. Edge functions (53 in source)

All functions live under `supabase/functions/`. Shared helpers in `_shared/` (compliance, identity, matchEngineCore, sundayLetterCore — the last two are dead but remain in shared/).

**Active — thesis product:**
- `validate-thesis` — live Perplexity research + LLM structuring into scorecard + steps; reads circle for warm reach + thesis_inspiration; persists each run
- `judge-thesis` — cheap sufficiency gate (Gemini) before a research call
- `extract-admire` — Gemini vision reads how an admired business positions
- `extract-contact` — Gemini vision reads a profile/card screenshot into circle_person
- `market-pulse` — live Fractional Working Index from fractionl-pulse public APIs

**Active — circle ingestion:**
- `parse-screenshot` — vision LLM (claude-haiku-4-5-20251001 → gpt-4o-mini fallback) for shared screenshots
- `parse-contact-image` — vision LLM for business cards
- `parse-voice-contact` — voice → contact parse
- `parse-voice-seed` — voice → batch contact seed
- `resolve-contact` — server-side dedupe by email/phone/handle
- `merge-persons` — explicit merge of two `circle_person` records
- `contact-enrich` — Clearbit / Apollo enrichment
- `enrich-linkedin` — LinkedIn enrichment
- `linkedin-search` — Google CSE-backed LinkedIn lookup
- `suggest-tags` — tag suggestions for circle contacts
- `rank-inner-circle` — inner circle ranking for warm-reach scoring
- `generate-signals` — signal generation for circle people
- `decision-engine` — decision support for thesis flow
- `extract-read`, `extract-identity` — supporting extraction functions

**Active — billing & auth:**
- `stripe-checkout` — create Checkout session
- `stripe-portal` — open Customer Portal
- `stripe-webhook` — HMAC signature verify + processed_stripe_events idempotency + tier sync
- `oauth-google-start` · `oauth-google-callback` · `oauth-microsoft-start` · `oauth-microsoft-callback` — OAuth state + callback (code present; UI not currently exposed in live app)
- `sync-google` · `cron-sync-google` · `sync-microsoft` · `cron-sync-microsoft` — contact/calendar sync (code present; UI not currently exposed)
- `delete-account` — erasure + auth identity removal

**Active — comms & analytics:**
- `send-sms` — Twilio (origin-allowlisted CORS)
- `send-push` — push notification delivery
- `audit-log` — user-action audit events
- `emit-lifecycle` — attribution lifecycle events
- `log-win` — win logging for streams
- `sunday-letter-feed` — public feed endpoint (ROADMAP; code present)

**Retired (dead UI, code remains):**
- `run-match-engine`, `cron-match-engine` — old Match Engine cron
- `generate-sunday-letter`, `cron-sunday-letter` — old Sunday Letter cron
- `extension-ingest` — old browser extension entry point
- `extract-ideas` — old onboarding voice → 3 Ideas
- `transcribe` — old Whisper transcription for onboarding
- `parse-voice-log`, `parse-onboarding` — old voice activity + onboarding parse
- `generate-user-insights` — personalized insights (verify_jwt=false; auth enforced at function layer)
- `dedupe-circle` — LLM-assisted person dedupe (gated feature; UI path unclear)
- `notify-concierge-event` — old Concierge ops notifications
- `log-move-sent` — old Match Engine send logging
- `demo-extract` — demo extraction helper
- `test-google-secret` — debug helper (`verify_jwt = false`; trim before next prod cut)

---

## 20. AI / LLM call sites

**Active call sites (thesis product):**

| # | File | Provider | Model | Purpose |
|---|---|---|---|---|
| 1 | `validate-thesis/index.ts` | Perplexity | sonar / sonar-pro | Live market research |
| 2 | `validate-thesis/index.ts` | OpenAI / fallback | gpt-4o-mini | Scorecard structuring |
| 3 | `judge-thesis/index.ts` | Google (via `GOOGLE_API_KEY`) | gemini-flash | Sufficiency gate |
| 4 | `extract-admire/index.ts` | Google (via `GOOGLE_API_KEY`) | gemini-flash vision | Admired business positioning |
| 5 | `extract-contact/index.ts` | Google (via `GOOGLE_API_KEY`) | gemini-flash vision | Contact from screenshot |
| 6 | `market-pulse/index.ts` | (fractionl-pulse API, no LLM) | n/a | Role demand data |
| 7 | `parse-screenshot/index.ts:109` | Anthropic | claude-haiku-4-5-20251001 | Screenshot vision (preferred) |
| 8 | `parse-screenshot/index.ts:142` | OpenAI | gpt-4o-mini | Screenshot vision (fallback) |
| 9 | `parse-contact-image/index.ts` | OpenAI | gpt-4o | Contact image vision |
| 10 | `parse-voice-contact/index.ts` | OpenAI | gpt-4o-mini | Voice contact parse |
| 11 | `parse-voice-seed/index.ts` | OpenAI | gpt-4o-mini | Voice seed parse |
| 12 | `generate-user-insights/index.ts` | Lovable Gateway | google/gemini-flash | Personalized insights |

All call sites wrap their LLM fetch with `AbortSignal.timeout` (20s default; longer for heavier calls).

**Output validation.** All persisted LLM output goes through schema validation before write. Upstream provider error bodies are not echoed into edge logs (status code only).

---

## 21. Auth, RLS & security posture

### Google sign-in dashboard configuration

The "Continue with Google" button on `AuthPage` uses Supabase's hosted Google provider via `supabase.auth.signInWithOAuth({ provider: 'google' })`. If users see *"Google authentication is not configured"*, check this checklist:

> **Branding the consent screen.** Because this flow runs through Supabase's hosted domain, Google's consent screen shows the raw `<ref>.supabase.co` host. To replace it with `auth.circle.fractionl.ai`, set up the Supabase custom auth domain — full procedure in `docs/supabase-custom-domain.md`.

1. **Google Cloud Console** → APIs & Services → Credentials → OAuth 2.0 Web client:
   - **Authorized JavaScript origins:** `https://circle.fractionl.ai`
   - **Authorized redirect URIs:** `https://auth.circle.fractionl.ai/auth/v1/callback`
2. **Supabase Dashboard** → project `ksyuwacuigshvcyptlhe`:
   - Authentication → Providers → **Google: enable**, paste Client ID + Client Secret.
   - Authentication → URL Configuration → **Site URL:** `https://circle.fractionl.ai`; **Redirect URLs:** add `https://circle.fractionl.ai/**`.

This is separate from the Google **contacts/calendar** ingestion flow (`oauth-google-start` + `oauth-google-callback`, which use their own `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` Edge secrets).

- **Auth.** Supabase Auth with email/password and Google OAuth. JWT lifetime 1h, refresh-token rotation enabled, `refresh_token_reuse_interval = 10s`.
- **RLS.** Enforced on every user-scoped table. `oauth_states` and `oauth_tokens` are RLS deny-all — service-role only.
- **Edge function gating.** All functions use `requireAuth` (JWT) by default. Exceptions:
  - `generate-user-insights` — `verify_jwt = false` but enforces auth-or-`CRON_SECRET` at the function layer.
  - `test-google-secret` — debug helper; remove from prod config.
  - `stripe-webhook` — verified by Stripe signature instead of JWT.
- **Stripe webhook.** Signature verified by hand-rolled Web Crypto HMAC verifier (constant-time compare). Idempotency ledger (`processed_stripe_events`, keyed on Stripe `event.id`). Tier sync on `customer.subscription.created` / `.updated` / `.deleted` and `invoice.payment_*`. Stripe account: `fractionl_ai`.
- **CORS.** Origin allowlist via `_shared/compliance.ts::getCorsHeaders(req)`. No wildcard holdouts.
- **Service-role key** never appears in the client bundle.
- **Audit log.** `audit-log` edge function writes user-action events server-side.

---

## 22. Reliability & rate limiting

- **Durable rate limits.** `rate_limits` table (PK `(bucket_key, window_start)`) with atomic upsert; replaces per-instance Maps that were invisible across edge workers. Affected functions: `extract-contact`, `parse-screenshot`, `validate-thesis`, `judge-thesis`, and others.
- **LLM timeouts.** Every fetch has `AbortSignal.timeout`.
- **Error telemetry.** `src/lib/telemetry.ts` is the central client-side sink. `src/main.tsx` wires `window.addEventListener('error', ...)` and `'unhandledrejection'`. Sentry / Vercel log drain integration is the next step.
- **Retry helper.** `src/utils/retry.ts` exposes a typed exponential-backoff helper for fragile fetches.

---

## 23. Compliance

- **GDPR.** ConsentBanner + PrivacySettings + SessionManager surfaces under `src/components/compliance/`. `useConsent()` syncs local consent flags to the server on auth.
- **Data export / deletion.** `export_user_data(uuid)` + `erase_user_data(uuid)` + `delete-account` edge function.
- **No email body scanning.** Google + Microsoft sync (when wired) reads contacts + calendar headers only.
- **Privacy page.** `/privacy` (`src/pages/Privacy.tsx`).
- **Full compliance posture:** see `COMPLIANCE.md` and `SUBPROCESSORS.md`.

---

# Go-to-market enablement

This section is for sales and marketing AI agents. It is the language to use, the proof to cite, and the objections to expect.

## 24. Sales narrative anchors

### The category we're inventing

Not "another CRM." Not "an AI assistant." We are **the thesis-validation engine for fractional executives** — the tool that answers "is my offer real?" with live market data, then breaks the hard middle into specific steps with your real network woven in.

### The pain in five sentences (cold-message-ready)

1. "You've been fractional for 90 days. You're not sure your niche is right."
2. "You've talked to six people. They all said 'sounds interesting.' You still don't know."
3. "You need a read that's grounded in real market data, not more opinions."
4. "You need to know which of your 400 LinkedIn connections is actually a warm path to your first client."
5. "Circle gives you that read in twenty minutes. Then it gives you the steps."

### The promise in three lines

- Type your thesis. Circle pushes back until it's real, then runs live research.
- Get a scored read with evidence: demand, competition, your edge, warm reach.
- Get the journey map: specific steps to your first retained client, with your real network woven in.

### The hook for paid media

> "Is your fractional offer right? Find out in 20 minutes with live market data."

### The hook for podcasts / interviews

> "The hardest thing about going fractional isn't the work. It's not knowing if your offer is real. We built the tool that answers that question before you waste six months."

### The hook for LinkedIn organic

> "Fractional execs lose more revenue to wrong-niche than to bad execution. We built the system that validates the niche before you commit."

### The numbers anchor (use these in copy)

- **20 seconds** for live Perplexity research to run.
- **7 scored dimensions** in the read: demand, burning need, crowding, your edge, fit, warm reach, credibility.
- **Free** gives one full validation with no paywall on first value.
- **$39/mo** for Pro: unlimited re-validation as your thesis evolves.
- **0** fake precision: every score is a confidence band with evidence.

---

## 25. Channel-ready copy

These are templates. AI sales agents should personalize the bracketed fields against the prospect's actual context (recent post, current role, mutual connection).

### Cold LinkedIn DM (60–90 words)

> Hey [name] — I noticed you went fractional [recently / after your time at X]. The hardest part isn't the work, it's knowing your offer is actually right before you're six months in. I built Circle for exactly that. Type your thesis, it runs live market research (~20s), and returns a scored read with evidence: is there real demand, who's competing, what's your edge, which of your contacts is a warm path. Free to try. Worth a look?

### Cold email (founder-led, 4 short paragraphs)

> Subject: Before you spend another quarter on the wrong niche
>
> Hi [name],
>
> Most fractional CMOs/CFOs/CTOs I talk to have been running for 3–6 months on a niche that "seemed right" when they left their last role. They've had a lot of "sounds interesting" conversations and not much else.
>
> I built Circle to answer the question they're actually asking: is my offer right? You type your thesis, it runs live market research (~20s), and returns an honest scored read — demand, competition density, your specific edge, which of your contacts is a warm path. Confidence bands with evidence, not generated opinions.
>
> Free to try, one full validation. $39/mo for unlimited re-validation as your thesis evolves.
>
> Worth ten minutes?

### Inbound landing-page hero (40 words)

> Is your fractional offer right?
> Find out with live market data, not opinions.
>
> Type your thesis. Circle runs real research and returns a scored read — demand, competition, your edge, your warm path. Then gives you the steps.
>
> [Validate free →]

### Webinar / event one-liner

> Circle is the thesis-validation engine for fractional executives. Live market data, honest scores, specific steps. Free to try.

### Upgrade nudge — Free → Pro

> You used your free validation. If your thesis is still evolving — pricing, niche, offer shape — Pro gives you unlimited re-runs as you sharpen, plus real warm reach from your full LinkedIn network. $39/mo. [Upgrade →]

---

## 26. Objection handling

| Objection | Best response |
|---|---|
| **"I've already validated my niche by talking to people."** | "Conversations confirm bias. Circle runs live Perplexity research right now: it reads where buyers complain, sizes demand vs. competition, maps your network's overlap with the ICP. Six conversations won't catch the crowded-market signal it flags in 20 seconds." |
| **"I don't trust AI to tell me if my offer is real."** | "Neither do we. The read is grounded in Perplexity web results, not LLM training data. Every finding has a source. Low-confidence findings are flagged, not hidden. Fake precision is explicitly refused — scores are confidence bands, not invented numbers." |
| **"I already have a niche. I'm not a new fractional."** | "Theses evolve. If you've been running the same offer for 12 months and the market shifted — pricing band, ICP, demand signal — Circle catches that. Pro users re-run as the thesis evolves and use market monitoring to stay current." |
| **"I don't want my contacts in someone else's database."** | "RLS-isolated. Every row is scoped to your `auth.uid()`. Service role never appears in the client. Tokens are encrypted. We do not sell data, we do not train models on your contacts. One-click export and one-click full deletion in Settings." |
| **"$39/mo is fine but I want to try it first."** | "Free tier is built for that: one full validation, the complete read and steps, build your circle. No paywall on first value. Most people understand the product fully from one free run." |
| **"What if my read is wrong — what's the fallback?"** | "We show confidence bands and flag low-confidence findings. A thin thesis input gets a pushed-back dialogue before research runs. The app is honest about what it can and can't confirm — you always know the quality of the read." |
| **"What about iOS / native?"** | "PWA today — installable on iOS and Android. The iOS Shortcut handles screenshot-to-contact capture outside the app. Native is on the roadmap." |
| **"I already use Sales Navigator."** | "Sales Nav is the graph. Circle is the thesis tool on top of your slice of that graph: is your offer right, which of your contacts is a warm path, what specific steps closes the first client. Different job." |

---

## 27. Use cases by ICP segment

### Fractional CMO (90 days in, unsure of the niche)

- **Problem:** Told people she does "B2B SaaS marketing." Five conversations, no retainer.
- **What Circle does:** Guided dialogue sharpens to "GTM for Series A B2B SaaS, demand-gen focus." Research flags that the market is crowded but identifies the specific underserved segment (late-stage Series A without an in-house demand-gen function). Warm reach: 12 named contacts who fit. Journey map: steps including the specific warm outreach to contact #3.
- **Win:** She knows in 20 minutes what six conversations didn't tell her. Pivots positioning. Closes in week 4.

### Fractional CFO (scaling to a second niche)

- **Problem:** Running three retainers in fintech, wondering if he can add healthcare without diluting the brand.
- **What Circle does:** Runs thesis on the healthcare niche. Competition read: more crowded than expected. Warm reach: only 4 contacts in the ICP. Journey map flags that the credibility score is low for a new vertical without a case study.
- **Win:** Decides not to expand the niche yet. Focuses the next 90 days on deepening fintech and building one healthcare credential.

### Independent strategy advisor (Big-3 alum, going solo)

- **Problem:** "Strategy for late-stage founders" is too broad. Not sure whether to lead with sprints, board advisory, or talks.
- **What Circle does:** Runs three thesis iterations (one per offer). Board advisory reads as the highest-demand, least-crowded option for her background. Warm reach is highest for that offer. Journey map prioritizes two specific warm conversations.
- **Win:** Leads with board advisory. First client closes in six weeks.

### Emerging fractional (year 1)

- **Problem:** Left a VP role six months ago. Has had conversations but nothing closed. Doesn't know if the offer is right or the positioning is wrong.
- **What Circle does:** The thesis run gives her a scored read for the first time — not opinions, not gut. Crowding score is high: the market is real but she needs a sharper edge. Add a business she admires to feed that edge. Re-run with the sharper thesis. Read improves.
- **Win:** Clarity. Stops second-guessing the niche and works the steps.

---

## 28. Proof of mechanism

For prospects who need to see *how* the AI works before they trust it:

1. **Live research, auditable.** Every finding in the read has a source behind it (Perplexity web results). The confidence marker on each finding says how sure we are.
2. **Honest about thin inputs.** The sufficiency judge pushes back on vague theses before research runs. "Marketing services" is explicitly refused until it has a who, a what, and a why-you.
3. **No fake precision.** Scores are confidence bands (strong / moderate / weak), not percentages. Evidence is shown in the read, collapsible to keep the screen clean.
4. **Open about what it can't confirm.** Low-confidence findings are flagged with a marker, not dressed up as certain.
5. **Your circle, your read.** The warm-reach score names your actual contacts, not sample data. A user with 5 contacts in their circle gets a different (lower) warm reach score than one with 200.
6. **Output validation.** Every persisted LLM output (scorecard, parsed contacts) goes through schema validation before write. Hallucinated PII does not become durable content.

---

## 29. Brand & voice

| Element | Value |
|---|---|
| **Product name** | Circle |
| **Parent brand** | Fractionl |
| **Full name** | Circle by Fractionl |
| **Primary tagline** | "Is your fractional offer right? Find out with live market data." |
| **Alternate tagline** | "The thesis-validation engine for fractional executives." |
| **Voice** | Peer-to-peer (not corporate). Action-oriented. Quietly confident. Never patronizing. Never cute. |
| **Tone in product copy** | Direct sentences. Short paragraphs. The product talks like a thoughtful colleague who respects your time. Plain language. No jargon. No em dashes in product copy. |
| **What we do not say** | "Revolutionize." "Game-changing." "Power up your..." "Unleash." Anything ending in "-ify." |

### Visual language

| Token | Value | Usage |
|---|---|---|
| **Ember / gold** | `#FF8C00` / `#FFB347` range | Brand mark, accent, energy gauge |
| **Background** | Near-white (light) / Deep charcoal (dark) | Page backgrounds |
| **Cards** | White (light) / Elevated dark (dark) | Containers |
| **Body typography** | Satoshi / system sans | Body, labels, UI |
| **Animation** | Spring easing, 250–400ms; ember breathes gently | Page transitions, brand mark |

### Interaction patterns

- Mobile is a fixed no-scroll frame (`useAppFrame`): one focused thing per screen, the primary action pinned and always visible.
- Every wait is branded: boot splash is an instant CSS ember; in-app loader is a charging ember; research step is "watch it think" with a charge ring.
- Living and breathing, restrained: each screen's content rises in on change, the brand ember gently breathes. All motion honors `prefers-reduced-motion`.
- Desktop at >=900px: surfaces center into a console; the Home goes to a two-region layout (orb hero + instruments).

---

# Operational reference

## 30. Local development

```bash
npm install
cp .env.example .env
# fill in VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, and the
# VITE_STRIPE_PRO_MONTHLY_PRICE_ID / VITE_STRIPE_EXEC_MONTHLY_PRICE_ID you want to test against
npm run dev      # vite dev server
npm run build    # production build (the CI gate)
npm run preview  # preview production build
npm run lint     # eslint
npm run test     # vitest
```

**Edge function secrets** are set with `supabase secrets set <KEY>=<value>` against the linked project, or via the Supabase dashboard. The required secrets include: `PERPLEXITY_API_KEY`, `GOOGLE_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `LOVABLE_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

**Type generation** (after schema changes):
```bash
supabase gen types typescript --project-id ksyuwacuigshvcyptlhe > src/integrations/supabase/types.ts
```

**Migrations.** Do not run `supabase db push` blindly — there is known drift on older entries. Apply targeted migrations via the Management API and record them in `supabase_migrations.schema_migrations` manually. Newer migrations from `20260418000001` onward are clean.

---

## 31. Deployment

- **Frontend:** Vercel auto-deploys `main`. Preview URLs on every PR. Branch → PR → green `audit` CI → squash-merge → sync. Never push to `main` directly.
- **Edge functions:** `SUPABASE_ACCESS_TOKEN=<sbp> npx supabase functions deploy <name> --project-ref ksyuwacuigshvcyptlhe`.
- **Migrations:** Management API for targeted application.
- **Stripe:** `scripts/setup-stripe-products.mjs` provisions products + prices.

---

## 32. Project history

| Period | Milestone |
|---|---|
| **2024 Q1–Q3** | Initial CRM-shaped product: clients, opportunities, activity logs, Google Sheets integration. |
| **2024 Q4** | Design system overhaul → purple brand identity. |
| **2025 Q1** | Rebrand to Circle by Fractionl. Mobile-first PWA. Voice logging + AI parsing. Talent black book. Onboarding wizard. |
| **2026 Q1** | The 90-day plan lands the redesigned Circle CRM end-to-end: Phase-1 ontology, Match Engine, Sunday Letter, Concierge, multi-source ingest, browser extension, screenshot capture, edit-distance logging, multi-CRM importer. |
| **2026-04-22 (PR #45)** | Legacy CRM tables pruned from active surface. |
| **2026-04-24** | Full app audit (`AUDIT_2026-04-24.md`): 4 critical, 7 high, 10 medium, 6 low findings. |
| **2026-04-26 (PR #46)** | Audit remediation — 13 of 14 findings shipped. TypeScript strict mode on. Durable rate limits. LLM timeouts on every call site. |
| **2026-05-30** | Phase 2 security hardening on branch `upgrade/circle/phase-2`. |
| **2026-06-03 (PR #86)** | Kill-sweep: retire the legacy Circle CRM (Today/Streams/Circle/Ask tabs, Match Engine, Sunday Letter, Concierge, FirstVoice onboarding). Thesis-validation engine is the sole product. |
| **2026-06-17 to 2026-06-28** | Thesis tool rebuilt: command-center Home, guided gated dialogue, no-scroll mobile frame, ember design system, Circle tab re-introduced as lightweight contact management alongside Deep dive. |
| **2026-06-28** | Documentation reconciliation: DOCS.md, AGENT_BRIEFING.md, and supporting docs updated to reflect the thesis product. |

---

*This document is the source of truth. If product behavior diverges from what is described here, fix the document or fix the product. Last verified: 2026-06-28.*

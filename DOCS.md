# Circle by Fractionl — Source of Truth

> Circle is the relationship-to-revenue engine for fractional executives, advisors, and operators with portfolio careers. Talk to it once. It turns what you said into Ideas, cross-references your Ideas against everyone you know overnight, and drops a hand-drafted Move on the right person while you sleep.

This document is the canonical source for product, architecture, pricing, and go-to-market language. It is structured to be readable both by engineers who are shipping it and by sales/marketing AI agents who are selling it.

**Last verified against repo:** 2026-04-26 · `main` @ `e70f035` (post PR #46 audit-fix merge).

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
7. [The Phase-1 ontology](#7-the-phase-1-ontology)
8. [Surfaces — what each tab does](#8-surfaces--what-each-tab-does)
9. [Onboarding](#9-onboarding)
10. [Sources & ingestion](#10-sources--ingestion)
11. [The Match Engine](#11-the-match-engine)
12. [The Sunday Letter](#12-the-sunday-letter)
13. [The browser extension](#13-the-browser-extension)
14. [Screenshot → Contact](#14-screenshot--contact)
15. [Concierge (Chief of Staff)](#15-concierge-chief-of-staff)

**Architecture**
16. [Tech stack](#16-tech-stack)
17. [Frontend layout](#17-frontend-layout)
18. [Database schema](#18-database-schema)
19. [Edge functions (35)](#19-edge-functions-35)
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

The fastest-growing segment of the senior professional workforce isn't employees and isn't freelancers. It's **portfolio operators**: fractional CMOs, CFOs, CTOs, COOs, CHROs, advisors, and consultants who build six- and seven-figure businesses by serving 2–7 clients in parallel and a network of hundreds in the background.

These people are exceptional at their craft. Their **operational infrastructure** is broken:

- **Their relationships live in their heads.** They meet brilliant people at conferences, on LinkedIn, through clients — and forget to follow up because there's no system that survives the next client call.
- **Revenue is invisible until it arrives.** With 3–7 concurrent engagements across advisory, workshops, project work, and speaking, the pipeline is "I think I have a few things in motion."
- **Pipeline management is a spreadsheet they haven't updated in three weeks.** Opportunities die between client meetings.
- **Their circle is their moat — and it's unmanaged.** They know someone for every project. They can't remember who, or when they last spoke.

### The insight

Portfolio operators don't need another CRM. They don't need another note-taking app. They don't need LinkedIn Sales Navigator (built for SDRs, not principals).

They need a **relationship-to-revenue engine** that:
- **Captures** the people they meet without them having to file anything.
- **Connects** the work they want to sell to the people most likely to buy it.
- **Drafts** the actual Move — the DM, the email — so all they have to do is hit send.
- **Holds them accountable** to the BD habits that drive growth, with a weekly narrative that survives a busy week.

**Circle is that engine.**

---

## 2. The 60-second pitch

A fractional CMO juggles 4 retainers, 200 LinkedIn warm leads, three product ideas she's not sure are real, and zero time. Her "CRM" is a stale Google Sheet and a Notes file called `ideas??.md`. She closes business the same way every fractional does: someone she met two years ago at a dinner remembers her, sends a DM, the deal happens.

Circle automates that exact pattern.

1. **Talk for 90 seconds at onboarding.** Circle extracts 3 sellable Ideas from what she said — title, ICP, price band, one-liner.
2. **Drop in a LinkedIn CSV (or connect Google / Microsoft / browser extension).** Her Circle dedupes itself across sources. Every person she's ever met, in one place.
3. **Overnight, the Match Engine runs.** It scores every (Idea × Person) pair on fit, recency, and warmth. It surfaces the top Matches with a hand-drafted Move (LinkedIn DM or email) she can send in two taps.
4. **Sunday morning, the Sunday Letter lands.** A 200-word narrative — or a 90-second audio briefing on Chief of Staff tier — telling her what shipped this week, what's worth chasing, what to fix.

She sells more by sending fewer, better messages to the right people. The AI is the operator. She is the relationship.

---

## 3. ICP — who Circle is for

### Primary ICP — The Fractional Executive

| Attribute | Detail |
|---|---|
| **Title** | Fractional CMO / CFO / CTO / COO / CHRO |
| **Career stage** | 15+ years experience, ex-VP or C-suite from high-growth companies |
| **Revenue** | $150K – $1.5M annually across 2–7 concurrent engagements |
| **Working pattern** | Mobile during the day (between client meetings), desktop on Sunday for planning |
| **Current stack** | LinkedIn, Apple Notes, a stale Google Sheet, maybe HubSpot they hate, calendar reminders that don't fire |
| **Core pain** | "I know I should follow up. I don't have a system that works on the move." |
| **Buying trigger** | A missed referral. A warm lead that went cold. A slow quarter that surfaced an empty pipeline. |
| **Where they live online** | LinkedIn (daily), Substack (read more than write), specific Slack/Discord communities for their function (CMO Coffee Talk, fCFO Collective, etc.) |
| **What they pay for** | Tools that make them feel organized and in control. They spend $50–$200/mo on personal SaaS without thinking about it. |

### Secondary ICPs

**The independent strategy advisor / boutique consultant.** Retainers, project work, speaking gigs. Needs unified pipeline visibility across service types.

**The thought leader operator.** Author / keynote / workshop facilitator monetizing IP through multiple channels. Needs to connect audience engagement to revenue outcomes.

**The emerging fractional (year 1).** Senior professional in their first year of independence. Needs structure and confidence — the kind of system the senior fractionals "all seem to have."

### Anti-ICP (do not sell to)

- SDRs / outbound BDRs running prospecting motions for someone else.
- Full-time founders (the LTV/loyalty pattern is wrong — they grow out of it).
- Sales teams of 3+. Circle is a single-operator product.
- Anyone whose pipeline is "20 enterprise logos." That's a Salesforce/HubSpot job.

### What every Circle ICP shares

- **Their circle is their business.**
- They are **time-starved** and need tools that work in 30-second bursts.
- They value **relationships over transactions.**
- They need **accountability** more than automation.
- They will pay for a tool that makes them **feel organized and in control.**

---

## 4. Outcomes & benefits

### Outcomes (the headline result)

| Outcome | Mechanism |
|---|---|
| **Stop losing warm leads** | Every person you meet flows into your Circle automatically. The Match Engine surfaces them when one of your Ideas fits. |
| **Sell more by sending less** | One drafted Move per Match — not a sequence, not a blast. The right thing to say to one person, on one day. |
| **Get your Sunday morning back** | The Sunday Letter writes itself. You read for two minutes instead of staring at a spreadsheet for an hour. |
| **Trust your pipeline again** | Streams = Ideas that earned revenue. Closed-loop view of what's working before you lean further into it. |
| **Activate dormant network** | Recency × warmth scoring brings forward the people you'd otherwise forget. |
| **Look organized when it matters** | Mobile capture in 10 seconds means no apologetic "remind me how we met" follow-ups. |

### Benefits (per surface)

- **Today** — One screen. Everything that needs you. No tab-switching.
- **Circle** — One dedupe-clean list of every person you know across every source.
- **Streams** — Proof of what's actually paying. Close the loop on which Ideas to invest in.
- **Ask** — Voice-first changes to anything (Phase 2 surface).
- **Browser extension** — Look at a LinkedIn profile, it's in your Circle. Zero filing.
- **Sunday Letter** — A weekly narrative that respects your time.
- **Concierge** (Chief of Staff) — A real human onboards your real network alongside you.

### What changes in week 1, week 4, week 12

- **Week 1.** First voice → 3 Ideas. First CSV in. First overnight Match. First Move sent.
- **Week 4.** Match Engine has tuned to your edit patterns (every edit you make to a draft Move is logged via Levenshtein distance, feeding the personalization model). Sunday Letter has 4 weeks of pattern recognition.
- **Week 12.** A Stream emerges — the Idea that's earned revenue at least three times. You retire the Ideas that didn't convert. The system has paid for itself.

---

## 5. Differentiation

### Why Circle is not a CRM

| | HubSpot / Salesforce / Pipedrive | Circle |
|---|---|---|
| Built for | Sales team of 5–500 | Single portfolio operator |
| Data model | Companies → Deals → Contacts | Ideas × People → Matches → Moves → Streams |
| Filing burden | Heavy. Expects discipline. | Zero. Voice-first capture. |
| Outbound model | Sequences, automation, scale | One handcrafted Move per Match |
| Pipeline view | 20 stages, 14 fields, 0 use | Idea is winning or it's retired |
| Mobile | Afterthought | Primary surface |
| Pricing for one seat | $50–$150/mo locked behind seats | $30 |

### Why Circle is not Notion / Apple Notes

Notion is a doc tool. Notes is a memory tool. Neither runs anything overnight. Neither drafts a Move. Neither connects what you want to sell to who might buy it.

### Why Circle is not LinkedIn / Sales Navigator

LinkedIn is the **graph**. Circle is the **operator** on top of the graph. Sales Nav is built for SDRs running prospecting motions; it has zero context on your Ideas, your edits, your past Moves, your revenue. Circle has all of that.

### Why Circle is not a generic AI assistant (ChatGPT / Claude)

Generic LLMs don't have your Circle, your Ideas, or your edit history. They draft generic Moves to generic people. Circle is fine-tuned on **your taste** (every edit you make is logged) and on **your network** (every Match scores against your specific people).

### What is genuinely defensible

1. **The Phase-1 ontology.** Sources → Person → Idea × Person → Match → Move → Stream is a model of the actual fractional business. No CRM ships this. Every ingest path normalizes into the same shape.
2. **Edit-distance taste model.** Every Move the user edits before sending is captured (Levenshtein distance between draft and sent). Over time the AI converges on how *this user* talks. CRMs cannot do this — they don't draft outbound.
3. **The Sunday Letter** as a habit forcing function. Once you've read three of them, you don't stop. It's the product's retention loop.
4. **Cross-source dedupe with LLM tiebreaker** (Operator+ tier). Most contact lists are 30% duplicates. Circle's scoring + LLM dedupe makes one Circle from five.

---

## 6. Pricing & gating

Tier names, prices, and feature bullets are sourced from `src/lib/tiers.ts` and gating is enforced in `src/hooks/useSubscription.ts`. Stripe price IDs are configured via `VITE_STRIPE_PRICE_OPERATOR` and `VITE_STRIPE_PRICE_CHIEF_OF_STAFF` env vars.

| | **Freemium** | **Operator** | **Chief of Staff** |
|---|---|---|---|
| **Price** | $0 | $30 / mo | $79 / mo |
| **Tagline** | Try the magic. | Help me run. | Help me scale. |
| **Voice onboarding + 3 Ideas** | ✅ | ✅ | ✅ |
| **LinkedIn CSV / CRM CSV import** | ✅ | ✅ | ✅ |
| **Browser extension capture** | ✅ | ✅ | ✅ |
| **Active Streams** | 1 | 3 | Unlimited |
| **Matches surfaced** | 1 / week | 3 / day (21/wk) | Unlimited |
| **Circle sources** | 1 | Unlimited | Unlimited |
| **Ask messages** | 5 / week | Unlimited (with memory) | Unlimited |
| **Inbox + Calendar (Google/Microsoft)** | — | ✅ | ✅ |
| **LLM-powered Circle dedupe** | — | ✅ | ✅ |
| **Sunday Letter (text)** | — | ✅ | ✅ |
| **Sunday Letter (90-second audio)** | — | — | ✅ |
| **External signal feeds** (RFPs, news, job changes, trends) | — | — | ✅ |
| **Cross-user market intelligence** | — | — | ✅ |
| **Per-category auto-send consent** | — | — | ✅ |
| **White-glove concierge onboarding** | — | — | ✅ |
| **Priority compute** | — | — | ✅ |

**Gating implementation reference:**
- Daily / weekly Match caps: `LIMITS` in `src/hooks/useSubscription.ts:28`.
- Feature gates (sunday_letter_audio, external_signals, autosend, market_intelligence, concierge, ask_memory, etc.): `TIER_FEATURES` in `src/hooks/useSubscription.ts:55`.
- Server-side enforcement: `_shared/compliance.ts` rate-limit + tier checks; `usage_tracking` table; `subscriptions.tier` column.
- Trial: `subscription.status = 'trialing'` upgrades effective tier to Operator until `trial_ends_at`.

---

# How the product works

## 7. The Phase-1 ontology

Shipped in migration `20260418000001_redesign_phase_1_ontology.sql`. This is the data model that makes Circle Circle:

```
SOURCES                       (every place a Person came from)
   │
   ▼
PERSON_RAW                    (per-source raw rows)
   │   (fingerprint dedupe)
   ▼
CIRCLE_PERSON                 (canonical, deduplicated)
   │
   ├─◄── SIGNALS              (job change, fundraise, RFP, calendar meeting, etc.)
   │
   └─►── MATCHES ──◄── IDEAS  (Idea × Person scored for fit)
          │
          ▼
        MOVES                 (drafted outbound: DM / email)
          │   (edit-distance logged on send)
          ▼
        (sent)
          │
          └─► STREAMS         (Ideas that earned revenue — closed-loop)
```

Legacy CRM tables (`clients`, `opportunities`, `activity_logs`, `talent_contacts`, `talent_skills`, `talent_referrals`, `talent_opportunities`) were pruned from the active surface in PR #45 (commit `da6a235`, 2026-04-22). They linger only in older migration files and a couple of audit-logger references; no live UI reads from them.

---

## 8. Surfaces — what each tab does

The mobile-first PWA is four tabs (`src/components/screens/`).

### Today (`TodayScreen.tsx`)
The home screen. What's waiting for you, ranked.
- **Concierge banner** — visible only on Chief of Staff tier, shows current concierge request state.
- **Sunday Letter card** — this week's letter (text or audio depending on tier), or a "ready to generate" state.
- **Match cards** — surfaced overnight by the Match Engine. Each card shows Person + Idea + drafted Move. Two-tap approve → mark sent flow.
- **Your Ideas** — the active Ideas the engine is matching against.
- **Surface Matches button** — manual trigger of the engine (used after a fresh import).

### Streams (`StreamsScreen.tsx`)
Ideas that have earned revenue. Currently a placeholder; the loop closes when `log-move-sent` rolls forward into `streams.state = 'live'`.

### Circle (`CircleScreen.tsx`)
Every person you know.
- Source cards (active + failed states with retry).
- Total person count.
- **Add a source** sheet — LinkedIn CSV, generic CRM CSV (HubSpot/Attio/Folk auto-detect), voice seed, Google, Microsoft, browser extension pairing.
- **Find duplicates** — LLM-assisted dedupe sheet (Operator tier feature gate).

### Ask (`AskScreen.tsx`)
The voice-first command surface. Currently a placeholder UI; voice capture lands in Phase 2 alongside first-run.

### Cross-cutting

- **Profile / Settings drawer** — `src/components/profile/ProfileSettingsSheet.tsx`. Theme, account, billing portal link, sign-out, install prompts (Android PWA install + iOS Apple Shortcut for screenshot capture).
- **Auth** — `src/components/AuthPage.tsx`. Email + password, Google OAuth.
- **Privacy** — `src/pages/Privacy.tsx`. Static privacy page.
- **Share Contact** — `src/pages/ShareContact.tsx`. The destination of the Android share target / iOS Shortcut.

---

## 9. Onboarding

`src/components/onboarding/FirstVoice.tsx`.

A single-screen voice onboarding:

1. **Intro** — "Tell me what you've done." Hold-to-talk button, up to 90 seconds.
2. **Recording** — live waveform.
3. **Processing** — Whisper transcription (`transcribe` edge function) → `extract-ideas` (gpt-4o-mini) parses 3 Idea drafts (title, one-liner, offer, price_band, ICP, is_adjacent flag).
4. **Review** — the 3 Ideas are shown. "Good. Start with these."
5. **Save** — Ideas are inserted with `status = 'voiced'`. `user_profiles.onboarding_step` advances to 4 (complete).

**Why this is the onboarding:** the moment a user articulates 3 Ideas, the Match Engine has its target. Without Ideas, it has nothing to do. Without a voice-first capture, users would procrastinate and never start.

The first Match Engine run happens overnight via `cron-match-engine`. The first Sunday Letter lands at the end of week 1.

---

## 10. Sources & ingestion

Sources funnel into `person_raw`, which deduplicates into `circle_person` via fingerprint matching (email, phone, normalized name + company, social handles).

| Source | UI | Edge function | Notes |
|---|---|---|---|
| **LinkedIn CSV** | `LinkedInCsvDrop.tsx` | (client-side parse → direct insert) | Richest single source. Parses the standard LinkedIn `Connections.csv` export. |
| **CRM CSV** (HubSpot / Attio / Folk / generic) | `CrmCsvDrop.tsx` | (client-side parse via `src/lib/crmCsv.ts`) | Auto-detects format from header row. |
| **Voice seed** | `VoiceSeedCapture.tsx` | `parse-voice-seed` (gpt-4o-mini) | Talk through your top 30 people, AI parses names + companies. |
| **Google** (Contacts + Calendar) | `GoogleConnect.tsx` | `oauth-google-start` → `oauth-google-callback` → `sync-google` (+ `cron-sync-google`) | People API + Calendar API. Reads last 90 days of meetings as `signal_kind = 'calendar_meeting'`. No email body scanning. |
| **Microsoft** (Contacts + Calendar) | `MicrosoftConnect.tsx` | `oauth-microsoft-start` → `oauth-microsoft-callback` → `sync-microsoft` (+ `cron-sync-microsoft`) | Microsoft Graph. Same shape as Google. |
| **Browser extension** | `ExtensionPair.tsx` (pair) + the extension itself | `extension-ingest` | Captures profiles as the user actually browses LinkedIn. Zero scraping. See [extension/README.md](./extension/README.md). |
| **Screenshot** (Android share / iOS Shortcut) | `src/pages/ShareContact.tsx` | `parse-screenshot` (Claude Haiku 4.5 → GPT-4o fallback) | Vision LLM extracts profile from a shared screenshot. See [docs/screenshot-to-contact.md](./docs/screenshot-to-contact.md). |
| **Manual** (resolve / merge / enrich) | various | `resolve-contact`, `merge-persons`, `contact-enrich`, `linkedin-search`, `dedupe-circle` | Server-side dedupe + Clearbit/Apollo enrichment + Google CSE-backed LinkedIn lookup. |

All sources end up in the same canonical `circle_person` table with `person_raw` rows linking back to provenance. The Match Engine doesn't care where someone came from — only that they're in the Circle.

---

## 11. The Match Engine

Lives in `supabase/functions/_shared/matchEngineCore.ts` and is triggered by:
- **Manual** — `run-match-engine` (TodayScreen "Surface Matches" button).
- **Nightly** — `cron-match-engine`.

For each user, the engine:

1. **Loads context** — active Ideas, all `circle_person` rows with their `person_raw` provenance and any `signals` from the last 30 days, recent `match` history (to avoid re-surfacing).
2. **Pre-filters** — recency × warmth × source quality. Drops people with zero useful fields.
3. **LLM scoring** — gpt-4o-mini call (`matchEngineCore.ts:209`) ranks (Idea × Person) pairs and writes a one-sentence `match.rationale` for the top results.
4. **Drafts a Move** — for each surfaced Match, `move.draft_body` is generated in the same call (LinkedIn DM by default, email if the person has an email and not a LinkedIn handle).
5. **Writes** — `matches` rows + `moves` rows in `state = 'new'` / `'draft'`.
6. **Quota check** — respects `LIMITS.matches_per_week` for free, `matches_per_day` for Operator. Returns `quota_blocked: true` to nudge the upgrade.

**Edit-distance taste model.** When the user hits "Mark sent" on a Match, `log-move-sent` computes the Levenshtein distance between the AI draft and what the user actually sent and stores it in `move_edits`. This is the data substrate for the personalization model that prompts future drafts.

**Timeouts.** Every LLM call site has an `AbortSignal.timeout` since PR #46 (audit C3). 20s default, 60s for heavier structured calls.

---

## 12. The Sunday Letter

Lives in `supabase/functions/_shared/sundayLetterCore.ts`. Triggered by:
- **Manual** — `generate-sunday-letter` (TodayScreen Sunday Letter card).
- **Weekly** — `cron-sunday-letter` (Sunday morning).

Output:
- **Text body** — gpt-4o-mini narrative (~200 words). Stored in `sunday_letters.text_body`.
- **Audio** (Chief of Staff only) — OpenAI TTS, ~90 seconds, served from `sunday_letters.audio_url`.
- **Stats sidebar** — `matches_surfaced`, `matches_approved`, `moves_sent`, `new_circle_people` for the week.

**Generation source tracking.** Migration `20260424000002_sunday_letter_generation_source` adds a `generation_source` column (`llm`, `rule_based`, etc.) so we can monitor what fraction of letters are LLM vs. fallback over time. Closes audit M10.

**Zod-validated and length-capped** since PR #46 (audit C2). Empty / placeholder output is rejected. Records are tagged with the model version that generated them.

---

## 13. The browser extension

`extension/` — Manifest V3, Chrome / Arc compatible.

- Reads name / title / company / headline / location from the LinkedIn profile DOM (plus any JSON-LD embeds).
- Background service worker forwards to the `extension-ingest` edge function with the user's Supabase JWT.
- Same fingerprint dedupe as the other sources.
- On re-visit, `last_interaction_at` is refreshed so the Match Engine ranks recency.

**Hard rules:**
- Zero scraping of pages the user is not actively viewing.
- Zero harvesting of anyone else's data — runs only in the user's authenticated session.
- Zero email / inbox / body scanning.
- Zero auto-browsing.

Pairing flow: Circle web app → Circle tab → Add a source → Connect browser extension → copy pairing token → paste into the extension popup. Tokens carry an access token (~1 hour life) plus a refresh token; the extension rotates them as needed.

Chrome Web Store submission is a follow-up — see [docs/roadmap.md](./docs/roadmap.md).

---

## 14. Screenshot → Contact

One-gesture contact capture. Works on Android (Web Share Target) and iOS (Apple Shortcut). See [docs/screenshot-to-contact.md](./docs/screenshot-to-contact.md) for the full flow.

- **Android.** PWA installed → take screenshot → Share → Circle → land on `/share-contact` with parsed fields. Wired via `public/site.webmanifest` `share_target` + `public/sw.js` interception.
- **iOS.** User installs an Apple Shortcut once. Shortcut POSTs the screenshot to `parse-screenshot` and opens `/share-contact?prefill=<urlencoded-JSON>`. The `parse-screenshot` function uses Claude Haiku 4.5 vision (preferred) with GPT-4o vision fallback.
- **Privacy.** Screenshots only leave the device when the user explicitly shares. The function does not persist the raw image. EXIF is not read.

---

## 15. Concierge (Chief of Staff)

Chief of Staff tier ships with a real human concierge — the relationship manager who walks new users through their first import, runs the first Match Engine pass with them, and writes the first Move alongside them.

- **`concierge_requests` table** (migration `20260422000001_concierge.sql`).
- **`concierge_requests.booking_url`** column for Cal.com / Calendly link drop (migration `20260423000001_concierge_booking_url.sql`).
- **`ConciergeCard.tsx`** banner on Today (executive tier only) shows current state: requested → scheduled → in_progress → delivered.
- **`ConciergeBookingSheet.tsx`** for taking the request.
- **`notify-concierge-event`** edge function fires Slack + Resend email to the ops channel on every state transition.
- **`scripts/concierge-inbox.mjs`** is the ops CLI for managing the queue: `list`, `show`, `schedule`, `book-url`, `start`, `deliver`, `cancel`. Service-role-keyed; runs locally.

---

# Architecture

## 16. Tech stack

| Layer | Tech | Notes |
|---|---|---|
| **Frontend** | React 18 + TypeScript (strict: true) + Vite | Mobile-first PWA. SPA with React Router. |
| **UI** | Tailwind + shadcn/ui + Radix primitives | Custom design tokens. |
| **Animation** | Framer Motion | 153 `motion.*` instances; all have `initial` + `animate` to avoid first-render flash. |
| **Forms** | (currently raw `useState`) | `react-hook-form` + Zod scaffolding present (`src/components/ui/form.tsx`) but not yet adopted on most call sites — see audit H3 in [docs/roadmap.md](./docs/roadmap.md). |
| **Data fetching** | TanStack React Query (provider mounted, partial adoption) | Direct `supabase.functions.invoke` is still common; full migration is a deferred audit item. |
| **Charts** | Recharts | Used in admin/analytics surfaces. |
| **Backend** | Supabase (Postgres + Auth + Edge Functions / Deno) | Project: `ksyuwacuigshvcyptlhe`. |
| **Edge runtime** | Deno (Supabase Edge Functions) | 35 functions; see §19. |
| **AI providers** | OpenAI (Whisper, GPT-4o, GPT-4o-mini, TTS) · Anthropic (Claude Haiku 4.5) · Lovable Gateway (Gemini 3 Flash) | 14 LLM call sites, all with explicit `AbortSignal.timeout`. |
| **Payments** | Stripe (Checkout, Customer Portal, Webhook) | Verified webhook signature; tier sync on `customer.subscription.*` events. |
| **SMS** | Twilio | `send-sms` edge function. Origin-allowlisted CORS (audit C4). |
| **Email** | Resend | Concierge ops notifications. |
| **Search** | Google CSE | LinkedIn lookup via `linkedin-search` edge function. |
| **Hosting** | Vercel (frontend) + Supabase (functions + DB) | Auto-deploy on `main` push. |

**TypeScript posture.** `tsconfig.app.json` runs with `strict: true` since PR #46 (audit H1). `tsc --noEmit -p tsconfig.app.json` is clean.

---

## 17. Frontend layout

```
src/
├── App.tsx                    Top-level router + providers (Auth, Query, Tooltip, Toaster, ErrorBoundary)
├── main.tsx                   Bootstrap + global window error/unhandledrejection sink (audit M5)
├── pages/
│   ├── Index.tsx              Tab host (Today / Streams / Circle / Ask)
│   ├── ShareContact.tsx       /share-contact — Android + iOS screenshot landing
│   ├── Privacy.tsx            /privacy
│   └── NotFound.tsx
├── components/
│   ├── AuthPage.tsx           Email/password + Google OAuth
│   ├── ErrorBoundary.tsx
│   ├── onboarding/
│   │   └── FirstVoice.tsx     90-second voice → 3 Ideas
│   ├── screens/
│   │   ├── TodayScreen.tsx
│   │   ├── StreamsScreen.tsx
│   │   ├── CircleScreen.tsx
│   │   └── AskScreen.tsx
│   ├── today/
│   │   ├── MatchCard.tsx
│   │   ├── SundayLetterCard.tsx
│   │   └── ConciergeCard.tsx
│   ├── circle/
│   │   ├── AddSourceSheet.tsx
│   │   ├── LinkedInCsvDrop.tsx
│   │   ├── CrmCsvDrop.tsx
│   │   ├── VoiceSeedCapture.tsx
│   │   ├── GoogleConnect.tsx
│   │   ├── MicrosoftConnect.tsx
│   │   ├── ExtensionPair.tsx
│   │   ├── DedupeReviewSheet.tsx
│   │   └── ContactButton.tsx
│   ├── billing/
│   │   ├── PricingSheet.tsx        (canonical pricing UI — sourced from src/lib/tiers.ts)
│   │   ├── PricingPage.tsx         (legacy desktop pricing — scheduled for removal/refresh)
│   │   ├── ConciergeBookingSheet.tsx
│   │   ├── SubscriptionBadge.tsx
│   │   └── UpgradePrompt.tsx
│   ├── compliance/
│   │   ├── ConsentBanner.tsx
│   │   ├── SessionManager.tsx
│   │   └── PrivacySettings.tsx
│   ├── profile/
│   │   └── ProfileSettingsSheet.tsx
│   ├── layout/                AppShell, BottomNav, DesktopSidebar, PageHeader
│   ├── navigation/            MobileBottomNav, MobileHeader, ResponsiveDialog
│   ├── feedback/              ErrorBanner, InlineSuccess
│   └── ui/                    shadcn/Radix primitives
├── hooks/
│   ├── useAuth.tsx            Auth context
│   ├── useUserProfile.ts      Profile + preferences + onboarding state
│   ├── useSubscription.ts     Tier, limits, usage, openCheckout, openPortal
│   ├── useCircle.ts           Sources + people count
│   ├── useCircleDedupe.ts     Dedupe scan + accept/reject
│   ├── useIdeas.ts            Active Ideas
│   ├── useMatches.ts          Match list + state transitions + run trigger
│   ├── useSundayLetter.ts     Letter loading + generation
│   ├── useConcierge.ts        Concierge request lifecycle
│   ├── useUserInsights.ts     Generated insights
│   ├── useConsent.ts          GDPR consent state
│   ├── useDataPrivacy.ts      Data export / deletion
│   ├── useVoiceRecording.ts   MediaRecorder wrapper for the onboarding mic
│   ├── useSkills.ts
│   ├── useBehaviorTracking.ts
│   ├── useInstallPrompt.ts    PWA install prompt
│   ├── useKeyboardVisible.ts  Mobile keyboard detection
│   ├── use-mobile.tsx
│   └── use-toast.ts
├── lib/
│   ├── tiers.ts               Tier catalogue (Freemium / Operator / Chief of Staff)
│   ├── circleIngest.ts        Shared ingest pipeline
│   ├── crmCsv.ts              HubSpot/Attio/Folk/generic CSV detection
│   ├── linkedinCsv.ts         LinkedIn CSV parsing
│   ├── handles.ts             Social handle normalization
│   ├── primaryContact.ts      Pick best email/phone/LinkedIn for outreach
│   ├── fingerprint.ts         Dedupe key generation
│   ├── telemetry.ts           Central error/event sink (audit M5)
│   ├── tiers.ts
│   └── utils.ts               cn() + helpers
├── utils/
│   ├── auditLogger.ts         User-action audit trail
│   ├── contactActions.ts
│   ├── greeting.ts
│   ├── haptics.ts
│   ├── retry.ts
│   └── registerServiceWorker.ts
├── integrations/
│   └── supabase/
│       ├── client.ts
│       └── types.ts           Generated from supabase gen types
├── constants/animation.ts     Stagger / spring / fade variants
├── App.css
└── index.css                  Design tokens, typography, theme
```

121 TS/TSX files in `src/` as of 2026-04-26.

---

## 18. Database schema

**Phase-1 ontology (the active surface):**

| Table | Purpose |
|---|---|
| `sources` | Every ingestion source per user. `kind` enum: google · microsoft · linkedin_csv · linkedin_extension · instagram_export · facebook_export · x_export · legacy_crm_csv · sheet_upload · ios_contacts · ios_shortcut · share_sheet · voice_seed · external_enrichment · business_card_photo · inbox_signature_scan · calendar_backscan |
| `person_raw` | Per-source raw rows, links to canonical `circle_person` |
| `circle_person` | Canonical, deduplicated person. `handles` jsonb column for social handles (Phase B promotion, 2026-04-22) |
| `ideas` | Active sellable Ideas. `status`: proposed · voiced · active · retired |
| `signals` | Inbound signals on people or market. `kind`: job_change · promotion · fundraise · hiring · public_post · mention · rfp · trend · calendar_meeting · email_interaction · other |
| `matches` | (Idea × Person) surfaced by the engine. `state`: new · approved · edited · sent · won · cold · declined |
| `moves` | Drafted outbound. `channel`: email · linkedin_dm · sms · call · calendar_invite · post · other. `state`: draft · approved · sent · responded · declined |
| `move_edits` | Edit-distance log between AI draft and user-sent body |
| `streams` | Ideas that earned revenue. `state`: prototyping · live · paused · retired |
| `sunday_letters` | Weekly narrative + audio_url + generation_source |
| `concierge_requests` | Chief of Staff onboarding queue |

**OAuth & subscriptions:**

| Table | Purpose |
|---|---|
| `oauth_states` | Single-use, TTL'd OAuth state nonces. RLS: deny-all (service role only) |
| `oauth_tokens` | Encrypted tokens with SHA-256 integrity hash. RLS: deny-all |
| `subscriptions` | Stripe-synced tier + status |
| `usage_tracking` | Per-feature, per-period counts (Match cap enforcement) |
| `ledger_entries` | Inferred revenue from inbox + calendar (Operator+) |
| `rate_limits` | Durable per-user / per-bucket rate limiter (audit H4) |
| `reminders` | Nudge scheduling (legacy; not currently used by active surface) |

**User & analytics:**

| Table | Purpose |
|---|---|
| `user_profiles` | Account, business context, onboarding state |
| `user_preferences` | Theme, notifications, AI personality |
| `user_business_context` | Business profile for AI personalization |
| `user_insights` | AI-generated insights with confidence + priority |
| `user_behavior_logs` | Behavioral analytics |
| `feature_usage` | Feature adoption tracking |
| `user_sessions` | Session analytics |
| `ai_conversations` · `conversation_sessions` · `chat_messages` | Ask history (Phase 2) |

**Legacy (pruned from the active surface in PR #45 but tables linger in older migrations):**
`clients`, `opportunities`, `activity_logs`, `revenue_entries`, `monthly_goals`, `daily_progress`, `weekly_summaries`, `talent_contacts`, `talent_skills`, `talent_referrals`, `talent_opportunities`, `skills`. Do not write new code against these.

**Migration count:** 39 files in `supabase/migrations/` (2026-04-26).

**Migration drift note.** As of the PR #46 deploy, `supabase migration list --linked` shows known drift on older entries (some local files not tracked remote, some remote with no local file). Do not run `supabase db push` blindly — apply targeted migrations via the Management API instead. See the audit-deploy memory for context.

---

## 19. Edge functions (35)

All functions live under `supabase/functions/`. Shared helpers in `_shared/` (compliance, identity, matchEngineCore, sundayLetterCore).

**Voice & vision parsing (LLM-backed):**
- `transcribe` — Whisper audio→text
- `parse-voice-log` — voice → structured activity log
- `parse-voice-contact` — voice → contact
- `parse-voice-seed` — voice → batch contact seed (onboarding)
- `parse-onboarding` — voice → client / revenue setup (legacy onboarding path)
- `parse-screenshot` — vision LLM (Claude Haiku 4.5 → GPT-4o fallback) for shared screenshots
- `parse-contact-image` — vision LLM for business cards / profile shots
- `extract-ideas` — onboarding voice transcript → 3 Idea drafts

**Match engine & weekly digest:**
- `run-match-engine` — manual trigger
- `cron-match-engine` — nightly trigger
- `generate-sunday-letter` — manual trigger
- `cron-sunday-letter` — Sunday morning trigger
- `generate-user-insights` — personalized business insights (gated by auth + body validation per audit C1)
- `dedupe-circle` — LLM-assisted person dedupe (Operator+ feature)

**OAuth + sync:**
- `oauth-google-start` · `oauth-google-callback` · `sync-google` · `cron-sync-google`
- `oauth-microsoft-start` · `oauth-microsoft-callback` · `sync-microsoft` · `cron-sync-microsoft`

**Contact ingest & resolution:**
- `extension-ingest` — browser extension entry point
- `resolve-contact` — server-side dedupe by email/phone/handle
- `merge-persons` — explicit merge of two `circle_person` records
- `contact-enrich` — Clearbit / Apollo / Twilio enrichment
- `linkedin-search` — Google CSE-backed LinkedIn lookup

**Billing & comms:**
- `stripe-checkout` — create Checkout session
- `stripe-portal` — open Customer Portal
- `stripe-webhook` — verified webhook → tier sync
- `send-sms` — Twilio (origin-allowlisted CORS per audit C4)
- `notify-concierge-event` — Slack + Resend ops notifications
- `log-move-sent` — edit-distance logging on Move send
- `test-google-secret` — debug helper (verify_jwt = false; trim before next prod cut)

---

## 20. AI / LLM call sites

14 outbound LLM fetches across the codebase. All wrapped with explicit `AbortSignal.timeout` (20s default; 60s on `generate-sunday-letter` and `generate-user-insights`) since PR #46.

| # | File:Line | Provider | Model | Purpose |
|---|---|---|---|---|
| 1 | `_shared/matchEngineCore.ts:209` | OpenAI | gpt-4o-mini | Match scoring + Move drafting |
| 2 | `_shared/sundayLetterCore.ts:177` | OpenAI | gpt-4o-mini | Sunday Letter narrative |
| 3 | `extract-ideas/index.ts:61` | OpenAI | gpt-4o-mini | Onboarding voice → 3 Ideas |
| 4 | `dedupe-circle/index.ts:132` | OpenAI | gpt-4o-mini | Person dedupe tiebreaker |
| 5 | `parse-voice-log/index.ts:65` | OpenAI | gpt-4o-mini | Voice activity log parse |
| 6 | `parse-voice-contact/index.ts:55` | OpenAI | gpt-4o-mini | Voice contact parse |
| 7 | `parse-voice-seed/index.ts:41` | OpenAI | gpt-4o-mini | Voice contact-seed parse (onboarding) |
| 8 | `parse-onboarding/index.ts:49` | OpenAI | gpt-4o-mini | Voice onboarding parse (legacy) |
| 9 | `transcribe/index.ts:64` | OpenAI | whisper-1 | Audio transcription |
| 10 | `parse-screenshot/index.ts:109` | Anthropic | claude-haiku-4-5-20251001 | Screenshot vision (preferred) |
| 11 | `parse-screenshot/index.ts:142` | OpenAI | gpt-4o | Screenshot vision (fallback) |
| 12 | `parse-contact-image/index.ts:56` | OpenAI | gpt-4o | Contact image vision |
| 13 | `generate-user-insights/index.ts:391` | Lovable Gateway | google/gemini-3-flash-preview | Personalized insights |
| 14 | `generate-sunday-letter` (audio path) | OpenAI | tts-1 | 90-second audio narration (Chief of Staff) |

**Output validation.** `generate-sunday-letter` runs Zod-validated, length-capped output and rejects empty/placeholder strings (audit C2). `sunday_letters.generation_source` records `llm` vs `rule_based` so we can monitor drift (audit M10).

**Prompt-injection posture.** All LLM input is treated as untrusted. Persisted output is validated. We do not echo upstream error bodies into edge logs (audit H7).

---

## 21. Auth, RLS & security posture

### Google sign-in dashboard configuration

The "Continue with Google" button on `AuthPage` uses Supabase's hosted Google provider via `supabase.auth.signInWithOAuth({ provider: 'google' })`. The client code is correct; the provider must be configured in the **Supabase Dashboard** (and the Google Cloud Console) — `supabase/config.toml` does not control deployed-project auth settings. If users see *"Google authentication is not configured"*, check this checklist:

1. **Google Cloud Console** → APIs & Services → Credentials → OAuth 2.0 Web client:
   - **Authorized JavaScript origins:** `https://circle.fractionl.ai`
   - **Authorized redirect URIs:** `https://ksyuwacuigshvcyptlhe.supabase.co/auth/v1/callback` (the Supabase callback, **not** the app URL — common mistake)
2. **Supabase Dashboard** → project `ksyuwacuigshvcyptlhe`:
   - Authentication → Providers → **Google: enable**, paste Client ID + Client Secret from step 1.
   - Authentication → URL Configuration → **Site URL:** `https://circle.fractionl.ai`; **Redirect URLs:** add `https://circle.fractionl.ai/**`.
3. Verify: load `https://circle.fractionl.ai`, tap "Continue with Google" → should bounce to `accounts.google.com` and back to `https://circle.fractionl.ai/#access_token=...`.

This is separate from the Google **contacts/calendar** ingestion flow (`oauth-google-start` + `oauth-google-callback` Edge Functions, which use their own `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` Edge secrets).

- **Auth.** Supabase Auth with email/password and Google OAuth. JWT lifetime 1h, refresh-token rotation enabled, `refresh_token_reuse_interval = 10s` (`supabase/config.toml`).
- **RLS.** Enforced on every user-scoped table. ~95+ `CREATE POLICY` statements across migrations. `oauth_states` and `oauth_tokens` are `RLS deny-all` — service-role only.
- **Edge function gating.** All functions use `requireAuth` (JWT) by default. Exceptions (per `supabase/config.toml`):
  - `transcribe` — `verify_jwt = false` (called from the onboarding voice flow with anon key for low friction; rate-limited).
  - `parse-voice-log`, `parse-onboarding` — same.
  - `generate-user-insights` — `verify_jwt = false` but enforces auth-or-`CRON_SECRET` at the function layer (audit C1 fix).
  - `test-google-secret` — debug helper; remove from prod config.
  - `stripe-webhook` — verified by Stripe signature instead of JWT.
- **Stripe webhook.** Verified via `stripe.webhooks.constructEvent()` with `STRIPE_WEBHOOK_SECRET`. Tier sync happens on `customer.subscription.created` / `.updated` / `.deleted` and `invoice.payment_*`.
- **OAuth.** State tokens are double-`crypto.randomUUID()`, single-use, TTL'd. Tokens are encrypted with SHA-256 integrity hash. PKCE is a deferred audit item (H6).
- **CORS.** Origin allowlist via `_shared/compliance.ts::getCorsHeaders(req)`. `send-sms` was the last wildcard holdout — fixed in PR #46 (audit C4).
- **Service-role key** never appears in the client bundle. `.env` is gitignored (verified clean against history).
- **Audit log.** `src/utils/auditLogger.ts` writes user-action events server-side.

---

## 22. Reliability & rate limiting

- **Durable rate limits.** `rate_limits` table (PK `(bucket_key, window_start)`) with atomic upsert; replaces the per-instance `Map<string, ...>` that was invisible across edge workers (audit H4). Affected functions: `extract-ideas`, `parse-voice-*`, `parse-screenshot`, `transcribe`, `parse-contact-image`, `parse-onboarding`, `dedupe-circle`, `generate-sunday-letter`.
- **LLM timeouts.** Every fetch has `AbortSignal.timeout` (audit C3).
- **Error telemetry.** `src/lib/telemetry.ts` is the central client-side sink. `src/main.tsx` wires `window.addEventListener('error', ...)` and `'unhandledrejection'` (audit M5). Sentry / Vercel log drain integration is the next step.
- **Retry helper.** `src/utils/retry.ts` exposes a typed exponential-backoff helper for fragile fetches.

---

## 23. Compliance

- **GDPR.** ConsentBanner + PrivacySettings + SessionManager surfaces under `src/components/compliance/`. `useConsent()` syncs local consent flags to the server on auth.
- **Data export / deletion.** `useDataPrivacy()` covers user-initiated export and account deletion paths.
- **No email body scanning.** Google + Microsoft sync reads contacts + calendar *headers* only. Documented user-facing.
- **Privacy page.** `/privacy` (`src/pages/Privacy.tsx`).

---

# Go-to-market enablement

This section is for sales and marketing AI agents. It is the language to use, the proof to cite, and the objections to expect.

## 24. Sales narrative anchors

### The category we're inventing

Not "another CRM." Not "an AI assistant." We are **the relationship-to-revenue engine for portfolio operators.** A new category: the AI is the operator on top of the user's existing graph (LinkedIn, calendar, contacts).

### The pain in five sentences (cold-message-ready)

1. "Fractional execs run their pipeline in Apple Notes."
2. "Your warmest leads go cold because no system survives the next client call."
3. "Your circle is your business. It's also unmanaged."
4. "You don't need 30 outbound sequences. You need to send the right thing to one person tonight."
5. "Sunday morning shouldn't be spent staring at a spreadsheet you haven't updated in three weeks."

### The promise in three lines

- Talk for 90 seconds. Get 3 sellable Ideas.
- Drop in your LinkedIn CSV. Wake up to Matches with Moves drafted.
- Read the Sunday Letter. Spend the rest of Sunday with your family.

### The hook for paid media

> "Your circle is your business. Circle turns it into Streams."

### The hook for podcasts / interviews

> "The AI doesn't replace the relationship. It replaces the spreadsheet."

### The hook for LinkedIn organic

> "Fractional execs lose more revenue to forgetting than to losing. We built the system that doesn't let you forget."

### The numbers anchor (use these in copy)

- **2–7 concurrent engagements** is the modal portfolio operator load.
- **200+** is the modal active LinkedIn-warm network.
- **1 Match per week is enough on Free.** 21/week on Operator. Unlimited on Chief of Staff.
- **90 seconds** to onboarding's first artefact.
- **$30/mo** to make the spreadsheet die.

---

## 25. Channel-ready copy

These are templates. AI sales agents should personalize the bracketed fields against the prospect's actual context (recent post, current role, mutual connection).

### Cold LinkedIn DM (60–90 words)

> Hey [name] — I noticed you're running [N] fractional engagements right now. I built the thing I wished existed when I was watching fractionals lose warm leads to "I'll follow up after this client call." It's called Circle. You talk to it for 90 seconds, drop in your LinkedIn CSV, and overnight it surfaces the Matches between what you sell and who you know — Move already drafted. $30/mo. Want a 10-minute walkthrough?

### Cold email (founder-led, 4 short paragraphs)

> Subject: For the part of fractional work that lives in your head
>
> Hi [name],
>
> Most fractional CMOs/CFOs/CTOs I talk to run their pipeline the same way: a stale Google Sheet, a Notes file called `ideas??.md`, and the prayer that someone they met two years ago at a dinner remembers them.
>
> I built Circle to automate that exact pattern. Talk for 90 seconds at signup; you get 3 sellable Ideas. Drop a LinkedIn CSV; your circle dedupes itself. Overnight, an engine cross-references your Ideas against your people and surfaces tomorrow's two best Matches with the DM already drafted.
>
> $30/mo for the version most fractionals use. Free tier to try it. Worth 10 minutes?
>
> [signature]

### Inbound landing-page hero (40 words)

> Your circle is your business.
> Circle makes it work.
>
> Talk for 90 seconds. Drop in your LinkedIn CSV. Wake up to Matches with Moves drafted on the right people for the work you're trying to sell.
>
> [Try it free →] [Book a walkthrough →]

### Webinar / event one-liner

> Circle is the relationship-to-revenue engine for portfolio operators. We turn your circle into Streams.

### Post-onboarding nurture (Day 3 email)

> Subject: Your first Match is waiting
>
> Hey [name] — overnight the Match Engine ran for the first time. You have [N] Matches waiting on Today, with the LinkedIn DMs already drafted. Want to send the first one? Two taps. We log every edit you make so future drafts sound more like you, not like AI.

### Upgrade nudge — Free → Operator

> You hit your free-tier Match cap this week. Operator gives you 3 Matches a day, full inbox + calendar connect, the Sunday Letter as text, and Circle dedupe. $30/mo. [Upgrade →]

### Upgrade nudge — Operator → Chief of Staff

> You're using Circle like an operator. Want it to scale you? Chief of Staff is $79/mo and adds the 90-second Sunday audio briefing, RFP / job change / market signal feeds, per-category auto-send consent, and a real human concierge to onboard your network alongside you. [Upgrade →]

---

## 26. Objection handling

| Objection | Best response |
|---|---|
| **"I already have a CRM."** | "CRMs are built for sales teams of 10+. Circle is built for one operator. The data model is different — Ideas × People → Matches → Moves → Streams, not Companies → Deals → Contacts. The filing burden is zero. You'll keep the CRM if your fractional CMO clients use one; Circle replaces the spreadsheet *you* keep on the side." |
| **"I don't trust AI to write my outreach."** | "Neither do we. Circle doesn't auto-send anything by default. It drafts; you edit; you send. Every edit is logged via Levenshtein distance, so the AI converges on how *you* talk. After 4 weeks the drafts sound like you. Auto-send is opt-in per category and only available on Chief of Staff." |
| **"I don't want my contacts in someone else's database."** | "RLS-isolated. Every row is scoped to your `auth.uid()`. Service role never appears in the client. Tokens are encrypted. We don't sell data, we don't train models on your contacts, we have a clean audit log. There's a one-click export and a one-click full deletion in Settings." |
| **"My LinkedIn graph is mostly noise."** | "That's the whole point. The Match Engine pre-filters on recency × warmth × source quality. Operator-tier Circle dedupe collapses the noise (most lists are 30%+ duplicates). You'll be surprised how much signal there is once it's deduped." |
| **"$30/mo is fine but I want to try it first."** | "Free tier is built for that. Voice onboarding, 3 Ideas, LinkedIn CSV, 1 Match per week. Most users upgrade in week 2 because 1/week is too few, not because they're unsure of the product." |
| **"What about iOS / native?"** | "PWA today — installable on iOS and Android. Push notifications work. The browser extension covers LinkedIn capture. Native is on the roadmap if PWA stops being enough." |
| **"What if I lose the network — privacy / breach risk."** | "We've audited the surface (April 2026, full report in `AUDIT_2026-04-24.md`). RLS is solid, no service-role in the bundle, OAuth state is single-use + TTL'd, Stripe webhook is signature-verified, every LLM call has a timeout, every persisted LLM output is validated. We publish the audit." |
| **"I already use Sales Navigator."** | "Sales Nav is the *graph*. It's built for SDRs running prospecting motions. Circle sits on top of your existing graph (LinkedIn, calendar, contacts) and runs the operator workflow — Ideas → Matches → Moves → Streams. Different tool, different job." |
| **"Will it work for my coaching / advisory practice?"** | "Yes — coaches and advisors are the second-largest cohort. Replace the cohort-style 'who should I follow up with' question with the Match Engine. Substitute 'Idea' for 'service offer'." |
| **"Can my EA see this?"** | "Single-seat today. Team mode and EA add-on are on the roadmap." |

---

## 27. Use cases by ICP segment

### Fractional CMO (4 retainers, $400K ARR target)

- **Onboard:** Voice-records "I do brand + GTM for Series A B2B SaaS, $20K/mo retainer, 90-day brand-to-pipeline workshops at $50K, and one keynote a quarter."
- **Ideas extracted:** (1) Fractional CMO retainer, ICP = Series A B2B SaaS, $20K/mo; (2) Brand-to-pipeline workshop, $50K, 90 days; (3) Keynote / conference, custom pricing.
- **First Matches surfaced:** mostly retainer-fit founders + workshop-fit Heads of Marketing + speaker-fit conference organizers.
- **Wins:** A workshop sale she wouldn't have followed up on lands within 3 weeks.

### Fractional CFO (3 retainers, scaling to 5)

- **Onboard:** "Fractional CFO for venture-backed startups Series A to C, $15K/mo, plus due diligence projects $25K flat, and quarterly board prep packages."
- **Wins:** Job-change signals (founder leaves company, becomes CEO somewhere else) trigger a Match for the retainer Idea.

### Independent strategy advisor (Big-3 alum)

- **Onboard:** "Strategy sprints for late-stage founders, $40K for 6 weeks. Board advisory at $5K/mo. Talks at AI conferences."
- **Wins:** Cross-user market intelligence (Chief of Staff) tells her sprint pricing in her ICP cluster is converting at higher rates this quarter — she runs a price test.

### Author / keynote speaker / workshop facilitator

- **Onboard:** "Workshops on [topic] at $30K, keynotes at $20K, three-month executive coaching cohort at $15K."
- **Wins:** Audience-engagement signals (LinkedIn comments on a post, calendar meeting attendance) surface as Matches against the cohort Idea.

### Year-1 emerging fractional

- **Onboard:** "Just left [company] as VP of [function]. Going fractional. Best fit is Series B+ B2B in fintech."
- **Wins:** The Sunday Letter forces the BD habit that didn't exist in W2 life. The structure replaces the panic.

---

## 28. Proof of mechanism

For prospects who need to see *how* the AI works before they trust it:

1. **The Match Engine prompt is auditable** — engineering can show the prompt + the rationale string in `match.rationale` for any Match. No black box.
2. **Edit-distance logging** — `move_edits.distance` (Levenshtein) is the substrate for the personalization model. We don't claim the AI sounds like you on day one; we show the data we use to converge.
3. **Sunday Letter generation source** — every letter has a `generation_source` column that says `llm` or `rule_based`. We monitor what fraction is which over time.
4. **Open audit** — full audit report in `AUDIT_2026-04-24.md`. Every finding tracked, most resolved in PR #46.
5. **No data sale, no model training on user contacts** — stated in the privacy policy and enforced by the backend (no third-party export pipelines).
6. **Output validation** — every persisted LLM output (Sunday Letter, drafts, parsed contacts) goes through Zod validation + length caps. Hallucinated PII does not become durable content.

---

## 29. Brand & voice

| Element | Value |
|---|---|
| **Product name** | Circle |
| **Parent brand** | Fractionl |
| **Full name** | Circle by Fractionl |
| **Primary tagline** | "Your circle is your business. Circle turns it into Streams." |
| **Alternate tagline** | "The relationship-to-revenue engine for portfolio operators." |
| **Voice** | Peer-to-peer (not corporate). Action-oriented. Quietly confident. Never patronizing. Never cute. |
| **Tone in product copy** | Direct sentences. Short paragraphs. The product talks like a thoughtful colleague who respects your time. Examples in `TodayScreen.tsx`: "Overnight I looked for Matches across your Ideas and Circle." / "Nothing waiting for you yet." / "Ready when you are." |
| **What we do not say** | "Revolutionize." "Game-changing." "Power up your..." "Unleash." Anything ending in "-ify." |

### Visual language

| Token | Value | Usage |
|---|---|---|
| **Primary** | `#994CCC` / HSL 287 45% 55% | Key actions, brand accents |
| **Background** | Near-white (light) / Deep charcoal (dark) | Page backgrounds |
| **Cards** | White (light) / Elevated dark (dark) | Containers |
| **Display typography** | Source Serif 4 | Headlines, narrative copy |
| **Body typography** | Satoshi | Body, labels, UI |
| **Animation** | Spring easing, 250–400ms | Page transitions, list staggers |

### Interaction patterns

- Bottom-sheet drawers for mobile forms (not modals).
- Stagger animations for list rendering.
- Skeleton loaders on async content (where adopted; full coverage is an open audit item).
- Toast confirmations for action completion.
- Real-time subscriptions for live updates on subscription tier and concierge state.

---

# Operational reference

## 30. Local development

```bash
npm install
cp .env.example .env
# fill in VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, and the
# VITE_STRIPE_PRICE_* IDs you want to test against
npm run dev      # vite dev server on localhost:8080 (or whatever vite picks)
npm run build    # production build
npm run preview  # preview production build
npm run lint     # eslint
npm run test     # vitest
```

**Edge function secrets** are set with `supabase secrets set <KEY>=<value>` against the linked project, or via the Supabase dashboard. See `.env.example` for the canonical list of required and optional secrets.

**Type generation** (after schema changes):
```bash
supabase gen types typescript --project-id ksyuwacuigshvcyptlhe > src/integrations/supabase/types.ts
```

**Migrations.** Per the audit-deploy memory: do not run `supabase db push` blindly — there's known drift on older entries. Apply targeted migrations via the Management API and record them in `supabase_migrations.schema_migrations` manually. Newer migrations from `20260418000001` onward are clean.

---

## 31. Deployment

- **Frontend:** Vercel auto-deploys `main`. Preview URLs on every PR.
- **Edge functions:** `supabase functions deploy --use-api --jobs 4` from a clean local checkout.
- **Migrations:** Management API for targeted application; record manually if needed.
- **Stripe:** `scripts/setup-stripe-products.mjs` provisions products + prices.
- **Concierge ops:** `scripts/concierge-inbox.mjs` for the queue.
- **Extension:** `node scripts/build-extension-icons.mjs` regenerates icons; load unpacked into Chrome / Arc until Web Store submission.

---

## 32. Project history

| Period | Milestone |
|---|---|
| **2024 Q1–Q3** | Initial CRM-shaped product: clients, opportunities, activity logs, Google Sheets integration. |
| **2024 Q4** | Design system overhaul → purple brand identity. |
| **2025 Q1** | Rebrand to Circle by Fractionl. Mobile-first PWA. Voice logging + AI parsing. Talent black book. Onboarding wizard. |
| **2026 Q1** | The 90-day plan (Phases 1–11) lands the redesigned product end-to-end: Phase-1 ontology, Match Engine, Sunday Letter, Concierge, multi-source ingest, browser extension, screenshot capture, edit-distance logging, multi-CRM importer. |
| **2026-04-22 (PR #45)** | Legacy CRM tables pruned from active surface. |
| **2026-04-22** | Phase B — social handles promoted to first-class `circle_person` column. |
| **2026-04-24** | Full app audit (`AUDIT_2026-04-24.md`): 4 critical, 7 high, 10 medium, 6 low findings. |
| **2026-04-26 (PR #46)** | Audit remediation — 13 of 14 findings shipped. C1, C2, C3, C4, H1, H2, H4, H5, M1, M2, M3, M5, M8 resolved. TypeScript strict mode on. Durable rate limits in. LLM timeouts on every call site. |
| **2026-04-26** | Premium typography (Source Serif 4 + Satoshi). Profile/settings drawer. |

**Open audit follow-ups** (deferred from PR #46, tracked in [docs/roadmap.md](./docs/roadmap.md)): H3 (react-hook-form / TanStack Query adoption), H6 (OAuth PKCE), H7 (parse-screenshot error-body leak), M4 (resolve-contact N+1), M6 / M7 / M9 / M10, L1–L6.

---

*This document is the source of truth. If product behavior diverges from what's described here, fix the document or fix the product. Last verified: 2026-04-26.*

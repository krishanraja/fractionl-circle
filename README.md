# Circle by Fractionl

**Your circle is your business. Circle turns it into Streams.**

Circle is the relationship-to-revenue engine for fractional executives, advisors, and operators with portfolio careers. Talk to it once. It turns what you said into Ideas, cross-references your Ideas against everyone you know overnight, and drops a hand-drafted Move on the right person while you sleep.

Built mobile-first. AI-native. Quietly pays for itself the first week you use it.

---

## The 60-second pitch

A fractional CMO juggles 4 retainers, 200 LinkedIn warm leads, three product ideas she's not sure are real, and zero time. Her "CRM" is a stale Google Sheet and a Notes file called `ideas??.md`. She closes business the same way every fractional does: someone she met two years ago at a dinner remembers her, sends a DM, the deal happens.

Circle automates that exact pattern.

1. **Talk for 90 seconds at onboarding.** Circle extracts 3 sellable Ideas from what you said — title, ICP, price band, one-liner.
2. **Drop in a LinkedIn CSV (or connect Google / Microsoft / browser extension).** Your Circle dedupes itself across sources. Every person you've ever met, in one place.
3. **Overnight, the Match Engine runs.** It scores every (Idea × Person) pair on fit, recency, and warmth. It surfaces the top Matches with a hand-drafted Move (LinkedIn DM or email) you can send in two taps.
4. **Sunday morning, your Sunday Letter lands.** A 200-word narrative — or a 90-second audio briefing on Chief of Staff tier — telling you what shipped this week, what's worth chasing, and what to fix.

You sell more by sending fewer, better messages to the right people. The AI is the operator. You are the relationship.

---

## Who this is for

| Persona | Pain | What Circle Replaces |
|---|---|---|
| **Fractional CMO / CFO / CTO** ($150K–$1.5M ARR, 2–7 active retainers) | "I know I should follow up but I can't keep it in my head between client calls" | Spreadsheet, Apple Notes, the part of HubSpot they hate |
| **Independent strategy advisor / boutique consultant** | "Pipeline is invisible until a deal hits the bank" | LinkedIn DMs sitting unread, calendar reminders that don't fire |
| **Author / keynote speaker / workshop facilitator** | "Audience engagement and revenue live in two different worlds" | Mailchimp + a CRM trial that expired |
| **Emerging fractional (year 1)** | "I have no system, and the senior fractionals all do" | Vibes, panic |

If you build six- and seven-figure income from a network you can't fit in a spreadsheet, this is for you.

---

## What's inside

**Mobile-first PWA — four tabs:**

- **Today** — what's waiting for you today: Matches the engine surfaced overnight, this week's Sunday Letter, your concierge banner if you're on Chief of Staff.
- **Streams** — Ideas that earned revenue. The closed-loop view of what's working.
- **Circle** — every person you know, unified across LinkedIn / Google / Microsoft / browser extension / screenshots / voice. Dedupe lives here.
- **Ask** — voice-first command surface (Phase 2).

**Browser extension** — capture LinkedIn profiles into your Circle as you naturally browse. Zero scraping; works only in your authenticated session.

**Screenshot → Contact** — share a profile screenshot from your phone (Android share target, iOS Apple Shortcut). Vision AI extracts the contact. Dedupe runs automatically.

**Concierge onboarding** (Chief of Staff tier) — a real human walks you through the first import, runs the first Match Engine pass with you, and writes your first Move alongside you.

---

## Pricing

| Tier | Price | Built for |
|---|---|---|
| **Freemium** | $0 | Try the magic — voice onboarding + 3 Ideas + 1 Match per week |
| **Operator** | $30/mo | The serious fractional running 2–3 active Streams |
| **Chief of Staff** | $79/mo | Portfolio operators who want the AI to scale them — Sunday Letter audio, RFP/news/job-change feeds, market intelligence, white-glove concierge |

Full breakdown in [DOCS.md § Pricing](./DOCS.md#pricing--gating).

---

## Tech

React 18 + TypeScript (strict) · Vite · Tailwind · shadcn/Radix · Framer Motion · Supabase (Postgres + RLS + Edge Functions / Deno) · OpenAI (Whisper, GPT-4o, GPT-4o-mini, TTS) · Anthropic (Claude Haiku 4.5) · Lovable Gateway (Gemini 3 Flash) · Stripe · Twilio · Resend · Vercel.

34 edge functions. RLS on every user-scoped table. LLM timeouts on every call site. Audit-clean as of 2026-04-26 (PR #46 — see [AUDIT_2026-04-24.md](./AUDIT_2026-04-24.md)).

---

## Quick start

```bash
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

Edge function secrets are set via `supabase secrets set` — see [.env.example](./.env.example) for the full list.

---

## Documentation

- **[DOCS.md](./DOCS.md)** — full source of truth: product, architecture, schema, sales/marketing anchors, ICP, objection handling, channel-ready copy.
- **[docs/roadmap.md](./docs/roadmap.md)** — what shipped, what's next, sized honestly.
- **[AUDIT_2026-04-24.md](./AUDIT_2026-04-24.md)** — last full audit + remediation log.
- **[docs/google-oauth-setup.md](./docs/google-oauth-setup.md)** · **[docs/microsoft-oauth-setup.md](./docs/microsoft-oauth-setup.md)** — one-time provider setup.
- **[docs/screenshot-to-contact.md](./docs/screenshot-to-contact.md)** — Android share target + iOS Apple Shortcut.
- **[extension/README.md](./extension/README.md)** — browser extension install + pairing.

---

Built by [Fractionl](https://fractionl.com) for the portfolio economy.

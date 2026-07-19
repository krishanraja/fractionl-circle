# Fractionl

**Two halves in one mobile-first app for people building a business off their network.**
**Circle** is your warm network - the people who can help you sell. **Plan** reads the live
market against what you want to offer and shows where you stand (a strength score 0–100 with
banded, evidence-backed signals) plus your next moves.

Live: https://circle.fractionl.ai

Full product, architecture, and run/deploy: **[docs/PRODUCT.md](docs/PRODUCT.md)**.

> **Note (2026-06-29):** the older "Circle CRM" generation (Ideas → Matches → Moves →
> Streams → Sunday Letter) has been removed. Docs are being kept honest to the shipped
> product; if you find a stale reference to that model, trust the code and the dated notes
> in `docs/PRODUCT.md`.

## What it does (60 seconds)

1. **Start here (first run).** A brand-new user (no plan yet) is held in a warm, gated
   onboarding (`src/pathroom/StartHere.tsx`), read-first: it unlocks **See how it lands** as soon
   as you give a few plain words about who you want to sell to, why you, and your current
   objective. Your people (who could help you sell) and a business you admire are optional
   sharpeners, offered here and again after the read, not a wall in front of it. Why: a one-box
   "type an idea → AI report" reads as a generic LLM wrapper, so the read is grounded in the
   uniquely-yours about-you; an empty circle honestly reads warm-reach as LOW, the earned reason
   to add your people next (fast via LinkedIn CSV, CRM/sheet, or instant Google/Microsoft contacts
   sync). Your typed words persist locally so an OAuth contacts-sync redirect never loses them.
2. **Plan.** The read runs live market research and returns **where you stand**: a strength
   score (0–100) and honest, banded signals with evidence (never fake numbers), plus a
   **make it stronger** coach that asks the single highest-leverage decision next, and a
   living, action-first path of next moves.
3. **Circle.** Your warm network stays alive on its own: a weekly "keep your circle warm"
   digest surfaces who to reconnect with, and a **return surface** on the Circle landing shows
   what's waiting for you when you come back (people going quiet, decisions to fold in).

Free gives one full read with no paywall on first value. Pro ($39/mo) is unlimited reads,
real warm reach from your full network, named next moves, and ongoing market monitoring.

## Quick start

```
npm install
npm run dev      # local dev
npm run build    # the CI gate
```

## Stack

Vite + React + TypeScript + Tailwind + shadcn/Radix, Supabase (Postgres / RLS / edge
functions), Perplexity (live research) + Gemini (vision) + a provider-fallback LLM,
Stripe, Vercel.

## Docs

- [docs/PRODUCT.md](docs/PRODUCT.md) - canonical product and architecture (source of truth).
- [AGENT_BRIEFING.md](AGENT_BRIEFING.md) - the sales/marketing brief, with a LIVE-vs-ROADMAP discipline.
- [docs/icp-archetype.md](docs/icp-archetype.md) - the ICP.
- [docs/screenshot-to-contact.md](docs/screenshot-to-contact.md) - the vision capture.
- `docs/google-oauth-setup.md`, `docs/microsoft-oauth-setup.md`, `docs/supabase-custom-domain.md` - ops setup.
- [docs/reengagement-and-push.md](docs/reengagement-and-push.md) - the re-engagement sweep + email/web-push setup.
- `docs/google-oauth-verification.md` - the calendar-write sensitive-scope submission pack (native warm-reach holds).
- `docs/privacy-policy.md`, `docs/RoPA.md` - legal and compliance (drafts, pending counsel).
- [COMPLIANCE.md](COMPLIANCE.md), [SECURITY.md](SECURITY.md), [SUBPROCESSORS.md](SUBPROCESSORS.md) - honest current-state compliance posture, security policy, and the subprocessor list.
- `docs/_archive/` - superseded strategy (the earlier Circle CRM and the Path Room decision room), kept for history.

> `DOCS.md`, `NON_FUNCTIONAL_AUDIT_REPORT.md`, and `AUDIT_2026-04-24.md` in the repo root are
> point-in-time snapshots of an earlier product generation (the retired Circle CRM: Today /
> Streams / Ask tabs, the Match Engine, the Sunday Letter). They are kept for engineering history
> only - do not treat them as current. Use `docs/PRODUCT.md` and `AGENT_BRIEFING.md` instead.

> Plain-language vocabulary (Plan / your idea / see how it lands / where you stand / make it
> stronger) has a single source of truth: `src/pathroom/copy.ts`. Code symbols may still say
> "thesis" internally; only what the user reads is renamed.

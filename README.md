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

1. **Start here (first run, read-first hybrid).** A brand-new user (no plan yet) is held in a
   warm onboarding (`src/pathroom/StartHere.tsx`) that unlocks **See how it lands** as soon as
   you give a few plain words about who you want to sell to, why you, and your current
   objective - that alone is enough to ground an honest read. Adding **10 people** who could
   help you sell and **1 business you admire** are offered right there as optional sharpeners
   (now or after your first read): an empty circle just reads warm-reach as low, which becomes
   the earned reason to build it next. A fast bulk-import path (LinkedIn CSV, CRM/sheet, instant
   Google/Microsoft contacts sync) makes adding people fast whenever you do, and your typed
   words persist locally so an OAuth contacts-sync redirect never loses them.
2. **Plan.** The read runs live market research and returns **where you stand**: a strength
   score (0–100) and honest, banded signals with evidence (never fake numbers), plus a
   **make it stronger** coach that asks the single highest-leverage decision next, and a
   living, action-first path of next moves.
3. **Circle.** Your warm network stays alive on its own: a weekly "keep your circle warm"
   digest surfaces who to reconnect with, and a **return surface** on the Circle landing shows
   what's waiting for you when you come back (people going quiet, decisions to fold in).

Free gives one full read with no paywall on first value (server-enforced: one `thesis_runs`
row per free account). Pro ($39/mo) is unlimited reads, real warm reach from your full
network, named next moves, and ongoing market monitoring. Chief of Staff ($79/mo) adds the
Monday chief-of-staff brief (where you stand, your market this week, the week's decision) on
top of everything in Pro; external signal feeds and cross-user market intelligence are
still roadmap, not live.

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
- [docs/VALUE_SHARPENING_2026-07-03.md](docs/VALUE_SHARPENING_2026-07-03.md) - strategy + decision record behind the "read carries memory" / chief-of-staff work.
- [docs/screenshot-to-contact.md](docs/screenshot-to-contact.md) - the OS-share/iOS-Shortcut vision capture (capture side is wired, confirm page is not built yet - see the doc's Status note).
- `docs/google-oauth-setup.md`, `docs/microsoft-oauth-setup.md`, `docs/supabase-custom-domain.md` - ops setup.
- [docs/reengagement-and-push.md](docs/reengagement-and-push.md) - the re-engagement sweep + email/web-push setup.
- `docs/google-oauth-verification.md` - the calendar-write sensitive-scope submission pack (native warm-reach holds).
- [SECURITY.md](SECURITY.md) - security controls and reporting a vulnerability.
- [COMPLIANCE.md](COMPLIANCE.md) - honest compliance posture (GDPR/CCPA/SOC2/ISO/HIPAA - what's actually implemented vs certified).
- [SUBPROCESSORS.md](SUBPROCESSORS.md) - third parties that process personal data.
- `docs/privacy-policy.md`, `docs/RoPA.md` - legal and compliance (both explicit drafts pending counsel).
- `scripts/golden-eval/` - the pre-release honesty eval for the read (not yet wired into CI, run manually).
- `docs/_archive/` - superseded strategy (the earlier Circle CRM and the Path Room decision room), kept for history.
- `DOCS.md` (repo root) - the pre-2026-06-29 legacy reference, explicitly marked superseded in its own changelog banner; kept for history only, not part of the active doc set above.

> Plain-language vocabulary (Plan / your idea / see how it lands / where you stand / make it
> stronger) has a single source of truth: `src/pathroom/copy.ts`. Code symbols may still say
> "thesis" internally; only what the user reads is renamed.

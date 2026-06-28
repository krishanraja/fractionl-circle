# Fractionl

**The thesis-validation engine for fractional executives.** Bring your idea for how you
want to fractionalize (what you want to offer, and to whom). It validates the idea against
the real market in the open, then breaks the path to your first clients into doable,
validated steps.

Live: https://circle.fractionl.ai

Full product, architecture, and run/deploy: **[docs/PRODUCT.md](docs/PRODUCT.md)**.

## What it does (60 seconds)

1. A **guided dialogue** draws out your thesis, pushing back on thin inputs until it has
   enough (a who, a what, a why-you), with one line of background.
2. It runs live research in the open (~20s) and returns an honest scorecard: **is it a
   real opportunity**, and **can you win it, fast** (bands with evidence and confidence,
   never fake numbers). The read drives a **strength score (0–100)** — the number you push
   toward 100 — shown on the ember and Home.
3. A **proactive sharpen coach** asks the single highest-leverage question to strengthen your
   weakest dimension, framed as a **decision** you tap. Each answer is banked and lifts the
   score on the next read.
4. A **living, action-first journey map** breaks the hard middle into ordered moves to your
   first retained client. The buttons *do* the move: the warm step opens **Reach out** — the
   people going quiet in your circle, each with a pre-written draft and one tap to send.
5. Your **circle** stays warm on its own: a weekly "keep your circle warm" digest surfaces who
   to reconnect with, into your inbox and calendar.

Free gives one full validation with no paywall on first value. Pro ($39/mo) is unlimited,
plus your network's warm reach and ongoing monitoring.

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

- [docs/PRODUCT.md](docs/PRODUCT.md) - canonical product and architecture.
- [docs/icp-archetype.md](docs/icp-archetype.md) - the ICP.
- [docs/screenshot-to-contact.md](docs/screenshot-to-contact.md) - the vision capture.
- `docs/google-oauth-setup.md`, `docs/microsoft-oauth-setup.md`, `docs/supabase-custom-domain.md` - ops setup.
- `docs/google-oauth-verification.md` - the calendar-write sensitive-scope submission pack (native warm-reach holds).
- `docs/privacy-policy.md`, `docs/RoPA.md` - legal and compliance.
- `docs/_archive/` - superseded strategy (the earlier Circle CRM and the Path Room decision room), kept for history.

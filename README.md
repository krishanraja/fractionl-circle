# Fractionl

**The thesis-validation engine for fractional executives.** Bring your idea for how you
want to fractionalize (what you want to offer, and to whom). It validates the idea against
the real market in the open, then breaks the path to your first clients into doable,
validated steps.

Live: https://circle.fractionl.ai

Full product, architecture, and run/deploy: **[docs/PRODUCT.md](docs/PRODUCT.md)**.

## What it does (60 seconds)

1. Describe your fractional thesis in a sentence, with a line of background.
2. It runs live research in the open (~20s) and returns an honest scorecard: **is it a
   real opportunity**, and **can you win it, fast** (bands with evidence and confidence,
   never fake numbers).
3. It deconstructs the hard middle into small, ordered, validated moves.
4. Your **circle** (added by screenshot or LinkedIn CSV) powers real warm reach and named
   next moves.

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
- `docs/privacy-policy.md`, `docs/RoPA.md` - legal and compliance.
- `docs/_archive/` - superseded strategy (the earlier Circle CRM and the Path Room decision room), kept for history.

# Fractionl: the thesis-validation engine

*Canonical product doc. Last updated 2026-06-19. This is the source of truth for what
the product is today. Earlier strategy docs (the Circle CRM and the Path Room decision
room) are superseded and live in `docs/_archive/`.*

## What it is

A tool for fractional executives that does one thing well: take your thesis for how you
want to fractionalize (what service you want to offer, and to whom), validate it against
the real world, and break the hard middle into doable, validated steps. It is not an
answer machine. The value is the opposite of a glib AI reply: it goes and checks, it is
honest about what it cannot confirm, and it turns a scary idea into moves you can start.

Live at `circle.fractionl.ai` (signed in lands you straight on it).

## The flow

1. **Capture.** One sentence of thesis, one line of background, optional LinkedIn. Plain
   language, no jargon, no blur.
2. **Watch it think.** Live web research runs in the open (~20s) via Perplexity: reading
   your background, sizing demand against supply, scanning where buyers complain, checking
   competition, mapping your network, weighing pricing. Low-confidence findings are
   flagged, not faked.
3. **The read.** A corpus-grounded scorecard, as bands with evidence and a confidence
   mark, never fake numbers:
   - **Is it a real opportunity?** Demand, Burning need, Crowding (scored as risk), Your edge.
   - **Can you win it, fast?** Fit to you, Warm reach, Credibility.
   Plus honest "worth knowing before you commit" flags (income ramp, scope, pricing band,
   productization).
4. **The steps.** The hard middle deconstructed into small, ordered, validated moves from
   where you are to your first retained clients. The warm-network move is the biggest lever
   and names real people once your circle is connected.
5. **The circle.** Add people instantly by **screenshot** (a LinkedIn or Instagram profile
   or a business card, read by Gemini vision), and connect your **full network** via the
   LinkedIn Connections CSV export (the export is buried and takes 24 to 48 hours, so the
   app links it directly and you upload the file when it lands). The circle powers the real
   warm-reach score and the named steps.

## Pricing

- **Free:** one full thesis validation, the complete read and steps, build your circle. No
  paywall on first value.
- **Pro, $39/mo:** unlimited re-validation as your thesis evolves, real warm reach from
  your full network, named next moves, ongoing market monitoring. Gated through Stripe
  checkout. (The Stripe Price object must be set to $39 in the production Stripe mode; the
  app reads `VITE_STRIPE_PRO_MONTHLY_PRICE_ID`.)

## Principles

- Real data in is required; an empty app is pointless.
- Honesty in the renderer: low confidence is shown, unreadable inputs are refused, scores
  are bands with evidence, never invented precision.
- Plain language. No jargon, no em dashes in product copy.

## Architecture

**Frontend** (`src/pathroom/`):
- `ThesisApp.tsx` - the live product (capture, thinking, read, steps, circle, gate).
- `thesisViews.tsx` - shared presentational layer + the `thesisCss` register + types.
- `thesisData.ts` - the data layer (validate, persist read, circle add/import, run count).
- `ThesisCircle.tsx` - the circle screen (screenshot add + CSV import).
- `tokens.ts` - the quiet-instrument design tokens.
- `App.tsx` - routes: `/` (auth gate -> the product), `/auth`, `/privacy`, `/terms`.

**Edge functions** (`supabase/functions/`):
- `validate-thesis` - live Perplexity research, then provider-fallback LLM structuring into
  the scorecard + steps; reads the circle for warm reach; persists each run.
- `extract-contact` - Gemini vision reads a profile/card screenshot into the circle.
- `_shared/llm.ts` - provider fallback (OpenAI -> Lovable/Gemini gateway -> Anthropic).

**Data** (Supabase project `ksyuwacuigshvcyptlhe`): `thesis_runs` (user-owned, RLS),
`circle_person` (user-owned, with `source`/`note`).

**Secrets:** `PERPLEXITY_API_KEY`, `GOOGLE_API_KEY` (Supabase function secrets);
`STRIPE_SECRET_KEY` + the price-id Vercel envs for checkout.

## Run and deploy

- Dev: `npm run dev`. Build gate: `npm run build` (the real CI check).
- Edge functions: `SUPABASE_ACCESS_TOKEN=<sbp> npx supabase functions deploy <name> --project-ref ksyuwacuigshvcyptlhe`.
- Frontend: Vercel, deployed on push to `main`.
- Branch -> PR -> green `audit` CI -> squash-merge -> sync. Never push to `main` directly.

## Known follow-ups

- Set the production Stripe Pro monthly Price object to $39 and point
  `VITE_STRIPE_PRO_MONTHLY_PRICE_ID` at it (prod Stripe mode).
- Ongoing market monitoring (the Pro "re-validate over time") is a future build.
- Some residual old-app components remain unimported on disk after the kill-sweep; a
  deeper dead-code pass can remove them.

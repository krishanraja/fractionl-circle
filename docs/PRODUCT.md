# Fractionl: the thesis-validation engine

*Canonical product doc. Last updated 2026-06-20. This is the source of truth for what
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

1. **The guided dialogue (Start Here).** Not a one-shot form: one question at a time. A
   sufficiency judge (the `judge-thesis` edge fn, with a deterministic client fallback)
   reads the thesis and pushes back on thin inputs ("marketing services" is not enough),
   naming exactly what is missing. It is a soft block: up to two rounds of nudging, then it
   runs anyway and is honest that the read will be a sketch. A question ("what should I
   offer?") routes into a short discovery flow; several offers in one route into a pick-one;
   a verbose input is played back as one line to confirm. Then one line of background.
2. **The ember.** The brand mark in the top nav is a gauge: dim when we know little, brighter
   and warmer as real fuel goes in (thesis, background, LinkedIn, businesses you admire, your
   circle). A dim mark honestly means a thin read.
3. **Watch it think.** Live web research runs in the open (~20s) via Perplexity: reading
   your background, sizing demand against supply, scanning where buyers complain, checking
   competition, mapping your network, weighing pricing. Low-confidence findings are
   flagged, not faked.
4. **The read.** A corpus-grounded scorecard, as bands with evidence and a confidence
   mark, never fake numbers:
   - **Is it a real opportunity?** Demand, Burning need, Crowding (scored as risk), Your edge.
   - **Can you win it, fast?** Fit to you, Warm reach, Credibility.
   Plus honest "worth knowing before you commit" flags (income ramp, scope, pricing band,
   productization).
5. **Add fuel to sharpen (its own separate screen, after the read).** The additive things
   live on their own focused screen, not crammed onto the read. Three distinct intents:
   - **A business you admire** feeds your **thesis**. Screenshot a LinkedIn, an Instagram, or
     a site you would love to build something like; `extract-admire` (Gemini vision) reads how
     they position, then asks *why* you admire them. The answer (saved to `thesis_inspiration`)
     sharpens "Your edge" on the next read. Honest about the messy cases: a blurry shot, a
     person with no business, a direct competitor (held as a benchmark to beat, not a template),
     a different field (keep only the transferable part).
   - **A business card** feeds your **circle** (warm reach), via `extract-contact`.
   - **LinkedIn** feeds **fit + credibility**.
   Re-running the read is an explicit choice, since it spends a live research call.
6. **The living journey map.** The path to first retained client as a timeline, with the
   circle woven in: the warm-network move (the biggest lever) shows the real faces it touches
   and lights up as you add people; one primary action per state; step tracking persists
   (`thesis_runs.step_progress`); a weak read does not pretend, it pivots to sharpening the
   thesis. This replaced the old static name-card list and the duplicate "build your circle"
   CTAs.
7. **The circle.** Add people instantly by **screenshot** (a LinkedIn or Instagram profile
   or a business card, read by Gemini vision), and connect your **full network** via the
   LinkedIn Connections CSV export (buried, 24 to 48 hours, so the app links it directly and
   you upload the file when it lands). The circle powers the real warm-reach score and the
   named steps, and is reached in-context from the journey map ("add people to light up your
   warm reach"), not as a dead-end.
8. **Home (the dashboard).** A returning user lands here, not back in the linear flow: their
   thesis, their read at a glance (e.g. "1 of 4 opportunity signals strong, crowding
   flagged"), path progress ("2 of 5 moves done"), and circle count, each a tile that opens
   the full surface. "Continue your path" is the pinned action; "start a new validation" is
   one tap. Reachable from anywhere by tapping the wordmark (or the "home" control) in the
   top bar, so starting over or stepping back to your hub is never fiddly.

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
- Mobile is a fixed no-scroll frame (`useAppFrame`): one focused thing per screen, the
  primary action pinned and always visible, and every screen lands at the top. The page
  itself never scrolls. Content is sized to fit: the read is glanceable (label + band +
  confidence, evidence on tap; headline clamps to 3 lines, tap to expand) and the thinking
  findings clamp to one line, so capture / thinking / read / sharpen / journey all fit a
  phone viewport. (Only sub-iPhone-SE heights, under ~667px, keep a small internal read
  scroll, with the action still pinned.)
- Living and breathing, restrained for the quiet-instrument register: each screen's content
  rises in on change, the brand ember gently breathes, the primary action and cards give
  press feedback, and evidence fades in on tap. All motion honors `prefers-reduced-motion`.
- Desktop is first-class, not a stretched phone: at >=900px every surface centers into a
  console (the read's two panels sit side by side, content is vertically balanced, the
  action stays pinned). The command-center Home goes further on desktop (a two-region
  layout: a large ember-orb hero beside the instruments). See the mock at /preview/cockpit.

## Architecture

**Frontend** (`src/pathroom/`):
- `ThesisApp.tsx` - the live product orchestrator (home, capture, thinking, read, sharpen,
  journey, add-people, gate); owns the no-scroll frame and pins each phase's primary action.
- `Home.tsx` - the home hub / dashboard (returning-user landing; tiles into read/path/circle).
- `CaptureDialogue.tsx` - the guided, gated Start Here dialogue.
- `thesisJudge.ts` - the deterministic client fallback for the sufficiency judge (+ types).
- `SharpenPanel.tsx` - the after-read "add fuel" panel (admire / card / LinkedIn + re-run).
- `JourneyMap.tsx` - the living journey map (steps + circle faces + step tracking + weak pivot).
- `thesisChrome.tsx` - the `EmberNav` brand-mark gauge + the shared `chromeCss`.
- `thesisViews.tsx` - shared presentational layer (read, thinking views) + the `thesisCss`
  register + types.
- `thesisData.ts` - the data layer (judge, validate, persist read, admire, inspiration,
  circle add/import, step progress, run count).
- `ThesisCircle.tsx` - the add-people surface (screenshot add + CSV import), reached from the
  journey map.
- `tokens.ts` - the quiet-instrument design tokens.
- `App.tsx` - routes: `/` (auth gate -> the product), `/auth`, `/privacy`, `/terms`, and the
  unlinked lazy design fixtures `/preview/start|sharpen|journey`.

**Edge functions** (`supabase/functions/`):
- `validate-thesis` - live Perplexity research, then provider-fallback LLM structuring into
  the scorecard + steps; reads the circle for warm reach AND `thesis_inspiration` to sharpen
  "Your edge"; persists each run.
- `judge-thesis` - the cheap sufficiency gate (Gemini via the provider fallback) before a
  research call: strong / thin / question / multiple / essay, with a follow-up.
- `extract-admire` - Gemini vision reads how an admired business positions (writes nothing to
  the circle); honest about reject / person / competitor / different field.
- `extract-contact` - Gemini vision reads a profile/card screenshot into the circle.
- `_shared/llm.ts` - provider fallback (OpenAI -> Lovable/Gemini gateway -> Anthropic).

**Data** (Supabase project `ksyuwacuigshvcyptlhe`): `thesis_runs` (user-owned, RLS, with
`step_progress` jsonb for the journey loop), `thesis_inspiration` (user-owned, the admired
businesses that sharpen the edge), `circle_person` (user-owned, with `source`/`note`).

**Secrets:** `PERPLEXITY_API_KEY`, `GOOGLE_API_KEY`, `LOVABLE_API_KEY` (Supabase function
secrets); `STRIPE_SECRET_KEY` + the price-id Vercel envs for checkout.

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

# Fractionl: the thesis-validation engine

*Canonical product doc. Last updated 2026-06-28. This is the source of truth for what
the product is today. Earlier strategy docs (the Circle CRM and the Path Room decision
room) are superseded and live in `docs/_archive/`.*

## What it is

A tool for fractional executives that does one thing well: take your thesis for how you
want to fractionalize (what service you want to offer, and to whom), validate it against
the real world, and break the hard middle into doable, validated steps. It is not an
answer machine. The value is the opposite of a glib AI reply: it goes and checks, it is
honest about what it cannot confirm, and it turns a scary idea into moves you can start.

Two things keep it from being a one-shot report. (1) A **proactive sharpen coach** that,
at the right moments, asks the single highest-leverage question to develop your thinking,
framed as a decision you tap — pushing a **strength score toward 100**. (2) A **network
layer** (your Circle) that turns the abstract "reach out to your network" into named
people with ready-to-send drafts, and keeps that network warm over time.

The app has two tabs: **Circle** (your people / warm reach) and **Deep Dive** (the
thesis: read, score, path). Live at `circle.fractionl.ai` (signed in lands you straight
on it).

## The flow

1. **The guided dialogue (Start Here).** Not a one-shot form: one question at a time. A
   sufficiency judge (the `judge-thesis` edge fn, with a deterministic client fallback)
   reads the thesis and pushes back on thin inputs ("marketing services" is not enough),
   naming exactly what is missing. It is a soft block: up to two rounds of nudging, then it
   runs anyway and is honest that the read will be a sketch. A question ("what should I
   offer?") routes into a short discovery flow; several offers in one route into a pick-one;
   a verbose input is played back as one line to confirm. Then one line of background.
2. **The ember = your strength score.** The brand mark in the top nav is a gauge fed by the
   real **thesis-strength score (0–100)**: dim/low when the read is thin or low-confidence,
   bright/high as the graded dimensions get stronger and grounded inputs go in. It is the
   number you push toward 100, not just "how many inputs you added." (`src/pathroom/sharpness.ts`.)
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
6. **The living journey map (action-first).** The path to first retained client as a timeline,
   with the circle woven in: the warm-network move (the biggest lever) shows the real faces it
   touches and lights up as you add people. The primary button **performs** the current move,
   it does not just mark it complete — the warm-reach step opens **Reach out** (the named
   people with pre-written drafts, one tap to email/LinkedIn; see below), offer/positioning
   steps open Sharpen; "mark this move done" is a secondary link. Step tracking persists
   (`thesis_runs.step_progress`); a weak read does not pretend, it pivots to the sharpen coach.
7. **Reach out (the warm move's action).** `ReachOut.tsx` lists the few people in your circle
   going quiet, each with a grounded, pre-written draft (from the `warm-digest` brain) and one
   tap to open it in your own email or LinkedIn. Acting stamps `last_interaction_at` so warmth
   recovers and they stop surfacing as cold. The reminder and the action live in the tools
   senior leaders already use, not only in the app.
8. **The circle.** Add people instantly by **screenshot** (a LinkedIn or Instagram profile
   or a business card, read by Gemini vision), and connect your **full network** via the
   LinkedIn Connections CSV export (buried, 24 to 48 hours, so the app links it directly and
   you upload the file when it lands). The circle powers the real warm-reach score and the
   named steps, and is reached in-context from the journey map ("add people to light up your
   warm reach"), not as a dead-end.
9. **Home (the command center).** A returning user lands here, not back in the linear flow.
   It is the living state of your one venture: the **strength-score orb** (the 0–100 number,
   with a one-line "what's holding you back" — your weakest dimension — and any pending lift
   from banked decisions), the **sharpen coach** (the daily question; see below), a **live
   market-movement instrument fed by fractionl-pulse** (your role's demand and the overall
   Fractional Working Index, with this-week deltas, plus a rising topic), and the permanent
   icon'd sections you navigate: **Where you are** (the read), **Your next customer** (the
   path), **Your network** (the circle). One evolving thesis, deepened daily, not many
   validations. Two regions on desktop (orb hero beside the instruments), stacked on mobile.

## The sharpen coach + strength score

The app is a coach, not just a report. At the right moments it asks the **one** question that
most sharpens your thesis and offers it as a **decision** (2–4 crisp options to tap, or type
your own), because the user often needs to decide, not stare at a blank box.

- **The score (`src/pathroom/sharpness.ts`).** A pure, explainable 0–100 from the read's seven
  graded dimensions (band × confidence: low confidence caps how high a dimension can score),
  plus grounded inputs (background, LinkedIn, businesses-admired, circle), plus a small
  provisional lift for banked-but-not-yet-run decisions. It also exposes the **weakest
  dimension(s)** — exactly what the coach asks about next.
- **The question (`next-question` edge fn).** Finds the weakest dimension and asks the
  highest-leverage question to sharpen it, grounded in the user's thesis + profile (reuses
  `chatJSON` + `profilePromptBlock` + `personalitySystemSuffix`). A deterministic per-dimension
  fallback means it never dead-ends if the LLM is down.
- **The loop.** Each answered decision is saved to `thesis_answers`; `validate-thesis` folds
  unapplied answers into the next read, so re-running lifts the real bands/confidence and locks
  the score in. Answers give immediate provisional credit; the read re-run (one paid Perplexity
  call) is on the user's terms via a "re-run to lock in your gains (+N)" affordance.
- **Where it surfaces.** `SharpenPrompt.tsx` is a calm, reusable, one-question-at-a-time card
  (skippable, dismissible) mounted on Home (the daily habit), under the Read, and on the Path's
  weak-read state. Built to drop in anywhere.

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
- Every wait is branded. First paint is an instant CSS ember splash (in index.html, no blank
  flash); the in-app `Loader` is a charging ember (a glow + a sweeping arc + the breathing
  mark); and the research step is "watch it think" with a charge ring that fills as the read
  comes together. No bare spinners or "loading..." text.
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
- `SharpenPrompt.tsx` - the proactive sharpen coach card (one decision-shaped question at a
  time); droppable on any surface, mounted on Home / Read / Path-weak.
- `sharpness.ts` - the pure 0–100 thesis-strength score + weakest-dimension finder.
- `ReachOut.tsx` - the warm-reach step's action surface (people going quiet + drafts +
  one-tap email/LinkedIn; stamps `last_interaction_at`).
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
- `next-question` - the proactive sharpen coach. Finds the weakest read dimension and returns
  one decision-shaped question (2–4 options + why), grounded in thesis + profile; deterministic
  per-dimension fallback. Answers persist to `thesis_answers` and feed the next `validate-thesis` run.
- `extract-admire` - Gemini vision reads how an admired business positions (writes nothing to
  the circle); honest about reject / person / competitor / different field.
- `extract-contact` - Gemini vision reads a profile/card screenshot into the circle.
- `market-pulse` - the live market-movement instrument for Home. Derives the user's role
  from their thesis, then calls the sister product fractionl-pulse's public APIs
  (`/fwi-api/current`, `/fwi-roles`, `/content-api/radar`) and returns a compact, role-level
  market object (overall index + role demand + this-week deltas + a rising topic). Pulse is
  role-grained, not niche-grained; the niche depth stays in the Perplexity read. Robust:
  any Pulse call can fail and Home degrades gracefully.
- `_shared/llm.ts` - provider fallback (OpenAI -> Lovable/Gemini gateway -> Anthropic).
- `compute-warmth` - nightly service-role recompute of every `circle_person.warmth`
  via the set-based SQL fn `recompute_circle_warmth()` (recency decay + response
  rate + recent-signal boost). Runs after the contact/calendar sync so warmth is
  current, and "closes the loop" lightly: a fresh interaction logged by sync
  resets recency and lifts warmth, no "did you reach out?" prompt.
- `warm-digest` / `cron-warm-digest` - the "keep your circle warm" reminder.
  `_shared/warmDigestCore.ts` picks the few warm relationships going quiet and
  drafts a grounded, in-the-user's-voice touch for each (reuses
  `profileContext` + `aiPersonality` + `llm`). The cron delivers it INTO the
  tools senior leaders already use: a Resend email with one-tap prefilled
  `mailto:` drafts, an `.ics` attachment that writes a recurring "warm reach"
  calendar hold (no calendar-write scope), and a Web Push ping. Opt-out via
  `user_preferences.warm_digest`. `warm-digest` is the user-JWT preview of the
  same cohort for in-app surfacing.

**Data** (Supabase project `ksyuwacuigshvcyptlhe`, all user-owned + RLS): `thesis_runs`
(`result` jsonb scorecard + `step_progress` for the journey loop), `thesis_inspiration` (the
admired businesses that sharpen the edge), `thesis_answers` (decisions from the sharpen coach;
`applied_at` marks those folded into a read), `circle_person` (with `warmth`,
`last_interaction_at`, `response_rate`, `source`/`note`), `push_subscriptions`,
`user_preferences` (incl. `warm_digest` opt-out). Warmth is recomputed by the
`recompute_circle_warmth()` SQL fn.

**Secrets** (Supabase function secrets): `PERPLEXITY_API_KEY`, `GOOGLE_API_KEY`,
`LOVABLE_API_KEY` (LLM), `RESEND_API_KEY` (digest email), `VAPID_*` (web push), `CRON_SECRET`
(cron auth), `APP_URL`, Google/Microsoft OAuth client id/secret; `STRIPE_SECRET_KEY` + the
price-id Vercel envs for checkout. Two off-by-default flags gate native calendar write
(`GOOGLE_CALENDAR_WRITE_ENABLED`, `WARM_DIGEST_NATIVE_CALENDAR`).

**Scheduled jobs** (pg_cron, see `supabase/cron_setup.sql`): nightly Google/Microsoft
contact+calendar sync (06:00 / 07:00 UTC), `compute-warmth` (07:30), `cron-match-engine`
(08:00), weekly `cron-warm-digest` (Mon 13:00) and `cron-sunday-letter` (Sun 19:00).

## Run and deploy

- Dev: `npm run dev`. Build gate: `npm run build` (the real CI check).
- Edge functions: `SUPABASE_ACCESS_TOKEN=<sbp> npx supabase functions deploy <name> --project-ref ksyuwacuigshvcyptlhe`.
- Frontend: Vercel, deployed on push to `main`.
- Branch -> PR -> green `audit` CI -> squash-merge -> sync. Never push to `main` directly.

## Shipped this cycle (all live)

- **Network warmth + weekly digest** — nightly `compute-warmth`, the Monday "keep your circle
  warm" email (Resend) with one-tap `mailto:` drafts + an `.ics` hold + web push, opt-out via
  `user_preferences.warm_digest`.
- **Action-first Path + Reach out** — the journey's primary button performs the move; the
  warm step opens `ReachOut` (people + drafts + one-tap email/LinkedIn). Step badges fixed.
- **Sharpen coach + strength score** — `sharpness.ts`, `next-question`, `thesis_answers`, the
  `SharpenPrompt` card on Home/Read/Path, and `validate-thesis` folding answers into re-runs.

## Known follow-ups

- Set the production Stripe Pro monthly Price object to $39 and point
  `VITE_STRIPE_PRO_MONTHLY_PRICE_ID` at it (prod Stripe mode).
- Extend the sharpen coach to every surface (Circle, Reach out) so it is truly ambient on any
  topic, and add a short history of decisions made over time.
- Ongoing market monitoring (the Pro "re-validate over time") is a future build.
- Some residual old-app components remain unimported on disk after the kill-sweep; a
  deeper dead-code pass can remove them.
- Network warmth (shipped, Track A): `compute-warmth` + `cron-warm-digest` are
  deployed and scheduled (warmth recompute nightly 07:30 UTC; digest Mondays
  13:00 UTC). No new secrets were needed — it reuses `RESEND_API_KEY`,
  `VAPID_*`, `CRON_SECRET`, `OPENAI/LOVABLE`, `APP_URL`. Track B (after the
  Google CASA audit / Microsoft `Mail.Send` consent): graduate the digest action
  from a prefilled `mailto:` + `.ics` hold to native Gmail/Outlook drafts and
  real calendar holds; add event-triggered (job-change/fundraise) nudges and a
  Slack surface. A small in-app settings toggle for `user_preferences.warm_digest`
  is the natural next UI step (the flag is respected server-side today; default on).
  Track B native calendar write is already coded behind two off-by-default flags
  (`GOOGLE_CALENDAR_WRITE_ENABLED`, `WARM_DIGEST_NATIVE_CALENDAR`) with `.ics`
  fallback; enabling it needs the `calendar.events` sensitive-scope verification
  (no CASA). See `docs/google-oauth-verification.md`. Gmail native drafts
  (`gmail.compose`, restricted/CASA ~$15k) are deliberately deferred.

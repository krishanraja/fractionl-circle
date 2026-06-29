# Fractionl: warm Circle + Plan

*Canonical product doc. Last updated 2026-06-29. This is the source of truth for what
the product is today. Earlier strategy docs (the Circle CRM and the Path Room decision
room) are superseded and live in `docs/_archive/`.*

## What changed (2026-06-29) and why

This cycle retired the older "Circle CRM" generation (Ideas → Matches → Moves → Streams →
Sunday Letter) and the academic framing it shipped with. Four changes, each with its WHY:

1. **Plain-language vocabulary** — single source of truth `src/pathroom/copy.ts`. User-facing
   renames: the **Deep dive** tab → **Plan**; **thesis** → **your idea / what you want to
   offer**; **validate / run the deep dive** → **see how it lands**; **the read / scorecard** →
   **where you stand**; **sharpen** → **make it stronger**. The **Circle** tab keeps its name.
   *Why:* the old terms ("thesis", "deep dive", "validate") read as intellectual and smart-ass;
   the product must feel approachable, warm, and simple to a time-poor business leader. (Code
   symbols — files, types, table names — still say "thesis" internally; only what the user
   reads changed.)
2. **Gated, grounded first-run onboarding** (`src/pathroom/StartHere.tsx`). A brand-new user
   (no saved plan) is held in a warm "Start here" that unlocks **See how it lands** only after
   they give the inputs that are uniquely theirs: ≥10 people who could help them sell, ≥1
   business they admire, and a few plain words about who they want to sell to / why them /
   their objective (stream-of-consciousness accepted). *Why:* a one-box "type an idea → AI
   report" reads as a generic LLM wrapper; a small amount of uniquely-theirs input is healthy
   friction that grounds the output in the user's real network, taste, and goal.
3. **Re-engagement** — an in-app return surface plus a dormant weekly email + web-push sweep.
   *Why:* give returning users a concrete reason to come back, computed from data we already
   have, and wire the dead `goal_reminders` flag to real behavior.
4. **Legacy removal (the "no patchwork" cleanup).** Deleted the dead Today/layout/navigation
   frontend and the `use{Matches,Streams,Ideas,SundayLetter,Concierge}` hooks, the legacy
   match/sunday-letter edge functions and their `_shared` cores, and their cron schedules.
   `ui/button.tsx` + `ui/progress.tsx` were aligned to the ember tokens (dropped purple-gradient
   remnants). *Why:* the accreted older generation fragmented both the product and the codebase.

## What it is

Two halves in one mobile-first app (`src/pathroom/CircleApp.tsx`), so both read as one app:

- **Circle** — your warm network: the people who can help you sell, kept warm over time.
- **Plan** — reads the live market against what you want to offer and shows **where you
  stand** (a strength score 0–100 with banded, evidence-backed signals) plus your next moves.

It is not an answer machine. The value is the opposite of a glib AI reply: it goes and
checks, it is honest about what it cannot confirm, and it turns a scary idea into moves you
can start. Two things keep it from being a one-shot report: (1) a **make-it-stronger coach**
that, at the right moments, asks the single highest-leverage question framed as a decision you
tap — pushing a **strength score toward 100**; (2) the **Circle** that turns the abstract
"reach out to your network" into named people with ready-to-send drafts, kept warm over time.

Live at `circle.fractionl.ai`. Signed in, a returning user lands in the two-tab shell
(**Circle** and **Plan**); a brand-new user lands in the gated **Start here** onboarding.

## First-run onboarding (the Start here gate)

`src/pathroom/StartHere.tsx`. First-run is gated on "has no saved run":
`CircleApp` calls `getRunCount(userId)` and, when it is `0`, renders `StartHere` instead of the
two-tab shell. The gate holds the user until they supply all three of:

- **A bit about you** — who you want to sell to, why you, and your objective/ideas (plain words;
  a stream of consciousness is fine).
- **Your people** — at least **10** in your circle (`MIN_PEOPLE = 10`), reachable fast via the
  Add-to-Circle / Add-source sheets: screenshot, paste a list, LinkedIn CSV, CRM/sheet, or an
  instant Google/Microsoft contacts sync — so the 10-person gate is never a wall.
- **A business you admire** — at least **1**, typed or read from a screenshot (`extract-admire`).

The brand mark (`EmberNav`) brightens as each input goes in; **See how it lands** is disabled
until all three are done. *Why the friction:* these three are exactly the inputs the read is
grounded in, so the friction buys real, non-generic value instead of reading as a thin LLM
wrapper. On unlock it runs the live read once and hands off to the **Plan** tab.

**Persistence (no migration).** The typed about-you is mirrored to `localStorage`
(`fr_about_<userId>`) so connecting Google/Microsoft contacts — which leaves and returns to the
app via an OAuth redirect — never loses what a time-poor user typed; it is cleared on a
successful run. On run, `saveAboutYou` writes into existing `user_profiles` identity columns
(`target_buyer`, `positioning`, `first_run_transcript`) and `markFirstRunComplete` stamps
`onboarding_completed` / `onboarding_completed_at` / `first_run_completed_at`. All best-effort:
a failed write never blocks onboarding, because the saved run is what actually gates first-run.

## The Plan flow

(The plain-language names below come from `src/pathroom/copy.ts`. `ThesisApp.tsx` is the
orchestrator; the **Plan** tab hosts it.)

1. **The guided dialogue (returning users / new ideas).** `CaptureDialogue.tsx`: one question
   at a time. A sufficiency judge (the `judge-thesis` edge fn, with a deterministic client
   fallback) reads what you want to offer and pushes back on thin inputs ("marketing services"
   is not enough), naming exactly what is missing. It is a soft block: up to two rounds of
   nudging, then it runs anyway and is honest that the read will be a sketch. A question ("what
   should I offer?") routes into a short discovery flow; several offers in one route into a
   pick-one; a verbose input is played back as one line to confirm. Then one line of background.
   (A brand-new user reaches the read through **Start here** instead, see above.)
2. **The ember = your strength score.** The brand mark in the top nav is a gauge fed by the
   real **strength score (0–100)**: dim/low when the read is thin or low-confidence, bright/high
   as the graded dimensions get stronger and grounded inputs go in. It is the number you push
   toward 100, not just "how many inputs you added." (`src/pathroom/sharpness.ts`.)
3. **See how it lands (watch it think).** Live web research runs in the open (~20s) via
   Perplexity: reading your background, sizing demand against supply, scanning where buyers
   complain, checking competition, mapping your network, weighing pricing. Low-confidence
   findings are flagged, not faked.
4. **Where you stand (the read).** A corpus-grounded scorecard, as bands with evidence and a
   confidence mark, never fake numbers:
   - **Is it a real opportunity?** Demand, Burning need, Crowding (scored as risk), Your edge.
   - **Can you win it, fast?** Fit to you, Warm reach, Credibility.
   Plus honest "worth knowing before you commit" flags (income ramp, scope, pricing band,
   productization).
5. **Make it stronger (its own separate screen, after the read).** The additive things
   live on their own focused screen (`SharpenPanel.tsx`), not crammed onto the read. Three
   distinct intents:
   - **A business you admire** feeds **what you want to offer**. Screenshot a LinkedIn, an
     Instagram, or a site you would love to build something like; `extract-admire` (Gemini
     vision) reads how they position, then asks *why* you admire them. The answer (saved to
     `thesis_inspiration`) sharpens "Your edge" on the next read. Honest about the messy cases:
     a blurry shot, a person with no business, a direct competitor (held as a benchmark to beat,
     not a template), a different field (keep only the transferable part).
   - **A business card** feeds your **circle** (warm reach), via `extract-contact`.
   - **LinkedIn** feeds **fit + credibility**.
   Re-reading ("see how it lands now") is an explicit choice, since it spends a live research call.
6. **The living journey map (action-first).** The path to first retained client as a timeline,
   with the circle woven in: the warm-network move (the biggest lever) shows the real faces it
   touches and lights up as you add people. The primary button **performs** the current move,
   it does not just mark it complete — the warm-reach step opens **Reach out** (the named
   people with pre-written drafts, one tap to email/LinkedIn; see below), offer/positioning
   steps open the make-it-stronger screen; "mark this move done" is a secondary link. Step
   tracking persists (`thesis_runs.step_progress`); a weak read does not pretend, it pivots to
   the make-it-stronger coach.
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
9. **Home (the command center).** A returning user with a saved plan lands here inside the Plan
   tab, not back in the linear flow. It is the living state of your one venture: the
   **strength-score orb** (the 0–100 number, with a one-line "what's holding you back" — your
   weakest dimension — and any pending lift from banked decisions), the **make-it-stronger
   coach** (the daily question; see below), a **live market-movement instrument fed by
   fractionl-pulse** (your role's demand and the overall Fractional Working Index, with
   this-week deltas, plus a rising topic), and the permanent icon'd sections you navigate:
   **Where you stand** (the read), **Your next customer** (the path), **Your network** (the
   circle). One evolving plan, deepened daily, not many runs. Two regions on desktop (orb hero
   beside the instruments), stacked on mobile.

## The Circle landing + return surface

The **Circle** tab (`CircleHome.tsx`) is the warm-network home and the daily habit. On it sits
the **return surface** (`ReturnSurface.tsx`): the in-app "what's waiting for you", computed
entirely from data we already have (no new backend). It shows the single most important hook
with one tap back into the Plan:

- **People going quiet** — circle people you have actually spoken to but not in 30+ days
  (`circle_person.last_interaction_at` older than 30 days; people never contacted, e.g. raw CSV
  rows, are deliberately excluded so we never nag about strangers). `getGoingQuietCount`.
- **Banked decisions to fold in** — make-it-stronger answers not yet applied
  (`thesis_answers.applied_at is null`). `getUnrunAnswerCount`.

It is honest: it renders nothing when there is nothing genuinely waiting, and it is gated by
`user_preferences.goal_reminders` (opt-out, default on; only an explicit `false` silences it).
*Why:* give returning users a concrete reason to come back, and wire the `goal_reminders`
toggle — which previously controlled nothing — to real behavior.

## The make-it-stronger coach + strength score

The app is a coach, not just a report. At the right moments it asks the **one** question that
most strengthens your idea and offers it as a **decision** (2–4 crisp options to tap, or type
your own), because the user often needs to decide, not stare at a blank box.

- **The score (`src/pathroom/sharpness.ts`).** A pure, explainable 0–100 from the read's seven
  graded dimensions (band × confidence: low confidence caps how high a dimension can score),
  plus grounded inputs (background, LinkedIn, businesses-admired, circle), plus a small
  provisional lift for banked-but-not-yet-run decisions. It also exposes the **weakest
  dimension(s)** — exactly what the coach asks about next.
- **The question (`next-question` edge fn).** Finds the weakest dimension and asks the
  highest-leverage question to strengthen it, grounded in the user's idea + profile (reuses
  `chatJSON` + `profilePromptBlock` + `personalitySystemSuffix`). A deterministic per-dimension
  fallback means it never dead-ends if the LLM is down.
- **The loop.** Each answered decision is saved to `thesis_answers`; `validate-thesis` folds
  unapplied answers into the next read, so re-reading lifts the real bands/confidence and locks
  the score in (`applied_at` is stamped on those folded in). Answers give immediate provisional
  credit; the re-read (one paid Perplexity call) is on the user's terms via a "see how it lands
  again to lock in your gains (+N)" affordance.
- **Where it surfaces.** `SharpenPrompt.tsx` is a calm, reusable, one-question-at-a-time card
  (skippable, dismissible) mounted on Home (the daily habit), under the read, and on the path's
  weak-read state. Built to drop in anywhere.

## Pricing

Source of truth: `src/lib/tiers.ts` (price labels, feature bullets, Stripe price-id env vars).
The DB-level tier enum is `free | pro | executive`. Three tiers:

- **Free (Freemium), $0:** one full read of where you stand, your plan and next moves, build
  your circle by screenshot or CSV. No paywall on first value.
- **Pro, $39/mo:** unlimited reads as your plan evolves, real warm reach from your full network,
  specific named next moves, ongoing market monitoring. Gated through Stripe checkout. (The
  Stripe Price object must be set to $39 in the production Stripe mode; the app reads
  `VITE_STRIPE_PRO_MONTHLY_PRICE_ID`.) Pro is the highlighted CTA tier; the in-app gate copy
  quotes "$39 a month".
- **Chief of Staff (`executive`), $79/mo:** unlimited reads and warm reach, a weekly brief on
  your network and market, external signal feeds (RFPs, job changes, trends), cross-user market
  intelligence, priority compute + white-glove concierge onboarding. Reads
  `VITE_STRIPE_EXEC_MONTHLY_PRICE_ID`.

In the product flow, free users get one full pass and the read; the deepening tools (re-reads,
the path, warm reach, ongoing monitoring) are Pro. `ThesisApp.tsx` opens the Pro gate when a
locked user reaches a deep phase.

## Principles

- Real data in is required; an empty app is pointless.
- Honesty in the renderer: low confidence is shown, unreadable inputs are refused, scores
  are bands with evidence, never invented precision.
- Plain language. No jargon, no em dashes in product copy.
- Mobile is a fixed no-scroll frame (`useAppFrame`): one focused thing per screen, the
  primary action pinned and always visible, and every screen lands at the top. The page
  itself never scrolls. Content is sized to fit: the read is glanceable (label + band +
  confidence, evidence on tap; headline clamps to 3 lines, tap to expand) and the thinking
  findings clamp to one line, so capture / thinking / read / make-it-stronger / journey all fit a
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
- `CircleApp.tsx` - the authed app shell. Owns the locked no-scroll frame; gates first-run on
  `getRunCount === 0` (StartHere vs the two-tab shell); hosts the **Circle** and **Plan** tabs.
- `copy.ts` - **the single source of truth for the plain-language vocabulary** (`PLAN.*`,
  `COPY.*`): Plan / your idea / see how it lands / where you stand / make it stronger. Keep all
  user-facing naming of these core concepts here so the voice never drifts back.
- `StartHere.tsx` - the gated first-run onboarding (about-you + ≥10 people + ≥1 admired business
  → one live read; persists about-you to `localStorage` and `user_profiles`).
- `CircleHome.tsx` - the Circle tab landing (the warm-network home / daily habit); mounts the
  return surface.
- `ReturnSurface.tsx` - the in-app "what's waiting for you" (people going quiet + banked
  decisions), one tap into the Plan; gated by `user_preferences.goal_reminders`.
- `ThesisApp.tsx` - the Plan orchestrator (home, capture, thinking, read, make-it-stronger,
  journey, add-people, gate). (File/type names still say "thesis" internally; the user reads
  the `copy.ts` names.)
- `Home.tsx` - the Plan home hub / dashboard (returning-user landing; tiles into read/path/circle).
- `CaptureDialogue.tsx` - the guided, gated capture dialogue (returning users / a new idea).
- `thesisJudge.ts` - the deterministic client fallback for the sufficiency judge (+ types).
- `SharpenPanel.tsx` - the after-read "make it stronger" panel (admire / card / LinkedIn + re-read).
- `SharpenPrompt.tsx` - the make-it-stronger coach card (one decision-shaped question at a
  time); droppable on any surface, mounted on Home / Read / Path-weak.
- `sharpness.ts` - the pure 0–100 strength score + weakest-dimension finder.
- `ReachOut.tsx` - the warm-reach step's action surface (people going quiet + drafts +
  one-tap email/LinkedIn; stamps `last_interaction_at`).
- `JourneyMap.tsx` - the living journey map (steps + circle faces + step tracking + weak pivot).
- `thesisChrome.tsx` - the `EmberNav` brand-mark gauge + the shared `chromeCss`.
- `thesisViews.tsx` - shared presentational layer (read, thinking views) + the `thesisCss`
  register + types.
- `thesisData.ts` - the data layer (judge, validate, persist read, admire, inspiration,
  circle add/import, step progress, run count, about-you persistence, the return-surface counts).
- `ThesisCircle.tsx` - the add-people surface (screenshot add + CSV import), reached from the
  journey map.
- `tokens.ts` - the quiet-instrument design tokens.
- `App.tsx` - routes: `/` (auth gate -> the product), `/auth`, `/privacy`, `/terms`, and the
  unlinked lazy design fixtures.

**Edge functions** (`supabase/functions/`). Canonical live set for the Plan + Circle product:
`validate-thesis`, `judge-thesis`, `next-question`, `market-pulse`, `extract-admire`,
`extract-contact`, `enrich-linkedin`, `suggest-tags`, `generate-signals`, `rank-inner-circle`,
`warm-digest`, `compute-warmth`, `cron-reengage`, `send-push`, `emit-lifecycle`, the
`sync-*` / `oauth-*` / `stripe-*` sets, `dedupe-circle`, `merge-persons`, `contact-enrich`,
`delete-account`, `audit-log`, `transcribe`. The legacy match/sunday-letter functions
(`cron-match-engine`, `run-match-engine`, `cron-sunday-letter`, `generate-sunday-letter`,
`sunday-letter-feed`, `decision-engine`, `extract-ideas`, `log-move-sent`, `log-win`,
`parse-onboarding`) and the `_shared` match/sunday-letter cores were **removed** this cycle.
Key ones:
- `validate-thesis` - live Perplexity research, then provider-fallback LLM structuring into
  the scorecard + steps; reads the circle for warm reach AND `thesis_inspiration` to sharpen
  "Your edge"; persists each run. Folds unapplied `thesis_answers` into the next read.
- `judge-thesis` - the cheap sufficiency gate (Gemini via the provider fallback) before a
  research call: strong / thin / question / multiple / essay, with a follow-up.
- `next-question` - the make-it-stronger coach. Finds the weakest read dimension and returns
  one decision-shaped question (2–4 options + why), grounded in idea + profile; deterministic
  per-dimension fallback. Answers persist to `thesis_answers` and feed the next `validate-thesis` run.
- `extract-admire` - Gemini vision reads how an admired business positions (writes nothing to
  the circle); honest about reject / person / competitor / different field.
- `extract-contact` - Gemini vision reads a profile/card screenshot into the circle.
- `cron-reengage` / `send-push` - the weekly re-engagement sweep + Web Push delivery
  (inert until Resend/VAPID are configured; see `docs/reengagement-and-push.md`).
- `market-pulse` - the live market-movement instrument for Home. Derives the user's role
  from their idea, then calls the sister product fractionl-pulse's public APIs
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
admired businesses that sharpen the edge), `thesis_answers` (decisions from the make-it-stronger
coach; `applied_at` marks those folded into a read — `null` is a "banked decision" for the
return surface + re-engagement), `circle_person` (with `warmth`, `last_interaction_at`,
`response_rate`, `source`/`note`), `push_subscriptions`, `user_preferences` (incl. `warm_digest`
and `goal_reminders` opt-outs), `user_profiles` (incl. the first-run identity columns
`target_buyer`, `positioning`, `first_run_transcript`, `onboarding_completed`,
`onboarding_completed_at`, `first_run_completed_at`, `last_active_at`). The first-run onboarding
reuses these existing columns — **no migration was added**. Warmth is recomputed by the
`recompute_circle_warmth()` SQL fn.

**Secrets** (Supabase function secrets): `PERPLEXITY_API_KEY`, `GOOGLE_API_KEY`,
`LOVABLE_API_KEY` (LLM), `RESEND_API_KEY` (digest email), `VAPID_*` (web push), `CRON_SECRET`
(cron auth), `APP_URL`, Google/Microsoft OAuth client id/secret; `STRIPE_SECRET_KEY` + the
price-id Vercel envs for checkout. Two off-by-default flags gate native calendar write
(`GOOGLE_CALENDAR_WRITE_ENABLED`, `WARM_DIGEST_NATIVE_CALENDAR`).

**Scheduled jobs** (pg_cron, see `supabase/cron_setup.sql`). The live cron set is five jobs:
`cron-sync-google` (nightly 06:00 UTC) and `cron-sync-microsoft` (07:00) contact+calendar
sync, `compute-warmth` (07:30, after the syncs so warmth is current), weekly `cron-warm-digest`
(Mon 13:00), and weekly `cron-reengage` (Mon 15:00, two hours after the digest so a drifted user
gets the warm-circle nudge first; inert until Resend/VAPID are set). The legacy
`cron-match-engine` and `cron-sunday-letter` schedules were removed.

## Run and deploy

- Dev: `npm run dev`. Build gate: `npm run build` (the real CI check).
- Edge functions: `SUPABASE_ACCESS_TOKEN=<sbp> npx supabase functions deploy <name> --project-ref ksyuwacuigshvcyptlhe`.
- Frontend: Vercel, deployed on push to `main`.
- Branch -> PR -> green `audit` CI -> squash-merge -> sync. Never push to `main` directly.

## Shipped this cycle (all live)

- **Plain-language vocabulary** — single source of truth `copy.ts`; the Plan tab + the
  see-how-it-lands / where-you-stand / make-it-stronger naming throughout.
- **Gated, grounded first-run onboarding** — `StartHere.tsx` (about-you + ≥10 people + ≥1
  admired business → one live read), persisting into existing `user_profiles` columns with no
  migration; `localStorage` survival across the OAuth contacts-sync redirect.
- **Re-engagement** — the in-app `ReturnSurface` on the Circle landing (people going quiet +
  banked decisions, gated by `goal_reminders`) and the dormant weekly `cron-reengage` email +
  web-push sweep (see `docs/reengagement-and-push.md`).
- **Legacy removal** — the Ideas/Matches/Moves/Streams/Sunday-Letter frontend, hooks, edge
  functions, `_shared` cores, and cron schedules are gone; `ui/button.tsx` + `ui/progress.tsx`
  aligned to the ember tokens.
- **Network warmth + weekly digest** — nightly `compute-warmth`, the Monday "keep your circle
  warm" email (Resend) with one-tap `mailto:` drafts + an `.ics` hold + web push, opt-out via
  `user_preferences.warm_digest`.
- **Action-first Path + Reach out** — the journey's primary button performs the move; the
  warm step opens `ReachOut` (people + drafts + one-tap email/LinkedIn).
- **Make-it-stronger coach + strength score** — `sharpness.ts`, `next-question`,
  `thesis_answers`, the `SharpenPrompt` card on Home/Read/Path, and `validate-thesis` folding
  answers into re-reads.

## Known follow-ups

- Set the production Stripe Pro monthly Price object to $39 and point
  `VITE_STRIPE_PRO_MONTHLY_PRICE_ID` at it (prod Stripe mode); likewise the Chief of Staff
  ($79) Price object behind `VITE_STRIPE_EXEC_MONTHLY_PRICE_ID`.
- Configure Resend + VAPID to activate `cron-reengage` email/push (it is wired and scheduled,
  but inert until the keys are set).
- Extend the make-it-stronger coach to every surface (Circle, Reach out) so it is truly ambient
  on any topic, and add a short history of decisions made over time.
- Ongoing market monitoring (the Pro "re-read over time") is a future build.
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

# Value sharpening: the chief of staff that remembers (2026-07-03)

> Strategy + decision record for the sharpening pass driven by the Mindmaker evidence corpus
> *"How a Non-AI-Native Business Leader Becomes an AI-Native Operator"* (July 2026). The question
> it answers: how does that corpus sharpen Circle's existing value - without interrupting the
> current UX - toward being the chief of staff to a business leader becoming an AI-forward
> fractional operator? First tranches shipped alongside this doc; the rest is sequenced below.

---

## The verdict in one paragraph

The corpus is a blueprint for finishing what Circle already half-built. Its evidence-backed
mechanics - context loaded into every AI interaction beats prompting; memory plus a correction
loop is the #1 success/failure variable for AI assistants; delivery channel beats capability;
AI as sparring partner, not ghostwriter; decision logs as institutional memory; voice learned
from the user's real words - map almost one-to-one onto surfaces that already exist here. The
chief-of-staff direction is not new to this product: it is the `executive` tier's literal name,
the warm digest's literal system prompt, and the archived dream-state vision. The gaps were
wiring gaps, not product gaps, which is why nearly every sharpening move is prompt and data
plumbing behind existing screens, with zero change to the two-tab shell, the onboarding gate,
or any flow.

## What the corpus validates as already right (protect these)

- **Banded, evidence-backed signals with honest confidence.** The corpus's enterprise output
  framework ("assume hallucination until verified", source-tiered numbers, confidence shown not
  faked) is exactly the read's design. This is the defensibility claim - keep enforcing it.
- **The gated, grounded onboarding.** Ten people + one admired business + your own words is a
  starter *context document* in the corpus's sense: the thing that makes output about you, not
  the internet.
- **The coach's decision-shaped questions.** One decision at a time, options to tap, banked to
  a log - this is the corpus's "decisions as institutional memory" behaviour, in embryo.

## The gap map: seven sharpening moves

Each move names the corpus lever it encodes and the surfaces it touches. None interrupts the
current UX.

| # | Move | Corpus lever | Status |
|---|---|---|---|
| 1 | The read loads the user model: profile envelope + the user's own onboarding words (`first_run_transcript`) into `validate-thesis` and `judge-thesis`; identity facts into the research prompt when background is blank | Context beats prompting | **Shipped (this branch)** |
| 2 | The decision log compounds: settled (applied) decisions ride every future read as fixed ground; the previous read is injected as a movement baseline; skipped questions are recorded and never re-asked | Memory + correction loop; decision log | **Shipped (this branch)** |
| 3 | The sparring partner: every read carries a `case_against` (the sceptic's strongest evidence-backed shot, one tap in the read); when all dimensions are strong the coach red-teams the strongest claim instead of going quiet | AI as sparring partner | **Shipped (this branch)** |
| 4 | Grounded flags: the seeded `benchmarks` + `landmines` tables (pricing bands, month-6 crisis, under-pricing trap - each with a provenance tier) now feed the read's flags instead of sitting orphaned | Honest verification | **Shipped (this branch)** |
| 5 | Visible memory: a "Your decisions" tile on Home opens the decision log (what you decided, when, banked vs in-your-read, one-tap worked / didn't outcome that colors future reads) | Decision log; trust in the loop | **Shipped (this branch)** |
| 6 | The weekly chief-of-staff brief: extend the Monday digest with "your market this week" (market-pulse), plan state (score + banked decisions + the lit move), and the one decision question of the week; gate the full brief to the $79 tier and flip its first bullet LIVE, soften the other two to "coming" | Channel beats capability; the weekly ritual | **Next tranche (committed)** |
| 7 | The correction loop on drafts: make Reach-out / digest drafts editable in place, persist generated-vs-final to a `draft_edits` table, few-shot the user's real edits back into the digest brain so drafts converge on their voice | Voice from real writing; correction loop | Tranche after the brief |

## What shipped in this branch (precise)

**Tranche 1 - context + memory + red-team in the read** (no migration, no UI-flow change):

- `supabase/functions/_shared/profileContext.ts`: the envelope now carries
  `first_run_transcript`, clamped, rendered as *In their own words* - upgrading every existing
  consumer (`next-question`, `warm-digest`, `rank-inner-circle`) at once. New `profileFactsLine`
  digests the profile to one line for research prompts.
- `supabase/functions/_shared/decisionContext.ts` (new, pure, unit-tested): the
  settled-decisions block, the fold-in block, the previous-read baseline block, and the corpus
  benchmarks/landmines block.
- `supabase/functions/validate-thesis/index.ts`: the flagship read - previously the only AI
  surface that ignored the user model - now loads the profile envelope + tone preference,
  settled decisions ("build on these, do not re-open them"), the previous run as a baseline
  ("never fabricate improvement"), the corpus facts, and returns a required `case_against`.
- `supabase/functions/judge-thesis/index.ts`: the sufficiency gate now knows who wrote the
  thesis (a thesis that reads thin in isolation can be strong against a known role).
- `src/pathroom/thesisViews.tsx`: "The case against, before you commit" - one tappable line in
  the read, same register as the flags, absent-safe for older runs.

**Tranche 2 - the decision log compounds** (one additive migration):

- `supabase/migrations/20260703120000_decision_log.sql`: `thesis_answers` gains `options`
  (branches considered), `status` (`answered` | `skipped`), `outcome` (`worked` | `didnt_work`),
  `outcome_at`. Additive only.
- `supabase/functions/next-question/index.ts`: passes settled decisions and declined questions
  as memory; when every dimension clears the strong floor it switches to red-team mode (with a
  deterministic fallback) instead of dead-ending.
- `src/pathroom/SharpenPrompt.tsx`: refresh/dismiss record a skip (best-effort); answers persist
  the options that were offered.
- `src/pathroom/Home.tsx` + `ThesisApp.tsx`: the "Your decisions" tile + bottom-sheet log with
  one-tap outcomes.
- Skips never count anywhere a decision counts: `getUnrunAnswerCount`, `cron-reengage`'s banked
  hook, and both fold-in queries filter `status = 'answered'`.

**Deploy order:** apply the migration BEFORE deploying the updated functions
(`validate-thesis`, `next-question`, `judge-thesis`, `cron-reengage`) - they filter on `status`.

## Objective architecture critique (what the corpus exposed)

Recorded honestly, including what this branch did not fix.

1. **The flagship read was context-blind** - `validate-thesis` never loaded the profile envelope
   that three other surfaces already used, and `first_run_transcript` was written by onboarding
   and read by nothing. The product's most expensive, most trusted output was its least
   personalized. *Fixed in this branch.*
2. **The "memory" was a consumable queue** - `applied_at` made every decision invisible to all
   future prompts after one use; `thesis_runs` kept full history that nothing read back. This is
   precisely the corpus's #1 documented failure pattern for AI-assistant builds. *Fixed in this
   branch.*
3. **No correction channel exists on generated output** - Reach-out and digest drafts are
   read-only; edits happen in the mail client and are lost; "voice" is a 4-value enum. The
   corpus's most common quality failure (generic voice) is currently guaranteed by design.
   *Tranche 7 above.*
4. **The $79 tier sells roadmap as bullets** - `src/lib/tiers.ts` lists a weekly brief, signal
   feeds, and cross-user intel; AGENT_BRIEFING §9 marks all three ROADMAP. In a product this
   disciplined about evidence, the paywall is the one unsourced claim. *Decision: ship the brief
   next (move 6); flip bullet one LIVE and soften the others then. No tier copy change in this
   branch so copy and capability flip together.*
5. **The channel layer is half-lit with zero observability** - `cron-reengage`/`send-push` are
   code-complete but inert pending `RESEND_API_KEY`/`VAPID_*`; docs disagree on which key is
   missing (PRODUCT.md says the digest reuses a live Resend key; the follow-ups say the same key
   is unset); nothing logs whether Monday's digest actually sent. The corpus's channel finding
   makes this the cheapest retention leak in the product. *Ops task + a `delivery_log` with the
   brief tranche. Verify the Resend secret's real state first.*
6. **Embeddings are pinned to a provider the product may not be paying** - `_shared/llm.ts`
   notes OpenAI billing exhausted (chat falls back to Gemini), yet `embed()` is OpenAI-only and
   returns null silently, degrading people-search to keyword-only with no visible error. If the
   billing note is current, the shipped "semantic engine" claim is quietly weaker than the copy.
   *Pre-flight check: confirm OpenAI billing for embeddings or plan a deliberate re-embed.*
7. **Sprawl** - 52 edge-function directories vs ~24 canonical live; dead legacy tables from two
   retired generations; in-memory per-instance rate limits guarding paid Perplexity calls while
   a durable `rate_limits` table exists; the extension pairing payload embeds tokens (dev-only
   surface - a launch blocker there, not a today-fire). *A separate reviewed cleanup migration;
   deliberately not bundled into this branch.*
8. **Score-logic duplication** - the band/confidence weights live in `src/pathroom/sharpness.ts`
   and again in `next-question`; the brief will pressure a third copy. Divergence silently breaks
   "the coach asks what the score says is weakest." *Consolidate when the brief needs a
   server-side score.*

## The orphaned-schema verdict

Extend `thesis_answers`; do not revive `decision_ledger`. The ledger (and `the_read`,
`user_business_context`, `comparable_cohort`) came from the archived Path Room engine and would
create a second decision store alongside the one five live consumers already use - two memories
is how assistants end up with the fragmented recall the corpus warns about. Its useful delta
(options considered, outcome) is now three columns on `thesis_answers`. `benchmarks` and
`landmines` are the exception: correctly RLS'd, already seeded, and as of this branch they have
a live consumer (the read's flags). The rest should drop in a dedicated cleanup migration.

## Verification

- `npm run test:run` - the prompt builders and envelope are unit-covered
  (`src/test/decisionMemory.test.ts`); `npm run build` stays the CI gate. Both green on this
  branch.
- Post-deploy, with a test account: run a read and confirm `case_against` renders and Fit /
  Credibility no longer bottom out for a user with a profile but no typed background; bank a
  decision, re-read, and confirm the read references it without re-asking; skip a coach question
  twice and confirm it stops recurring and never counts as banked; mark a decision "didn't" and
  confirm the next read weighs it.
- Regression: a blank-profile free user's flow is unchanged (every new block renders empty and
  concatenates unconditionally; `case_against` is absent-safe on old runs).
- Watch validate-thesis token counts in function logs for a few days (the Gemini path) - the new
  blocks are clamped but real.

## Sequencing from here

1. **The weekly chief-of-staff brief** (move 6) - compose from the existing brains
   (`warmDigestCore` + `market-pulse` + latest run + `next-question`), gate to `executive`, flip
   the tier copy honestly, configure VAPID/verify Resend, add a `delivery_log`.
2. **The draft correction loop** (move 7) - editable drafts, `draft_edits`, voice few-shot.
3. **Cleanup** - legacy table/function drop, durable rate limits on paid calls, the embeddings
   billing decision.

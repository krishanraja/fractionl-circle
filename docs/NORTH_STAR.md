# North Star

Ratified 2026-08-04. Canonical. Where this and any other doc disagree about what Circle is
optimising for, this one wins.

## The one outcome

> A fractional executive brings a half-formed idea for how they want to fractionalize, gets an
> honest read on whether it holds up against the real market, and then actually starts moving on
> it, because the path was broken into a step small enough to take this week.

Everything Circle ships is graded against that sentence. The read is not the product. The read is
the permission to move. A change that does not make someone more likely to take a real step is
not a priority.

## The metric that proves it

> **Validated first steps:** the weekly count of users who both complete a thesis validation AND
> mark their first mapped journey step done within 7 days of that validation.

One number, two halves, and the number only moves when both halves work. The validation half
proves the engine produced a read worth trusting. The first-step half proves the read was
believable enough, and the step small enough, to act on. A 7 day window is deliberate: it is
short enough that the metric reports on this week's product rather than on a slow drift, and long
enough that a busy operator can fit one real move into it.

Free and Pro both count. Nothing about this metric is gated on money.

## Why this, and not "completed validations"

Completed validations is the metric the product would pick for itself, and it is the wrong one.
It counts every user who bounces after the verdict.

That failure mode is the specific one Circle exists to fix. The ICP is 0 to 18 months into
independence: deep capability, no experience generating their own demand. They do not lack an
opinion about their thesis. They lack a first move. A run that ends at "the read" has given a
senior operator one more thing to think about and nothing to do, which is exactly what they were
already drowning in. Optimising completed validations would push us toward a faster, prettier,
more confident-sounding verdict, which is a straight line to the glib AI answer the product was
built to be the opposite of.

Counting the step forces the honest version: bands and confidence marks that a sceptical operator
believes, and a journey map whose first step is genuinely doable rather than a project plan.

## Why this, and not "paying subscribers"

Pro at $39 is the business scoreboard, and it stays the business scoreboard. It is a bad North
Star for two reasons.

It lags. A subscription decision arrives days or weeks after the experience that earned it, so it
cannot tell this week's build whether it worked.

It hides the thing that matters most. Free is the whole magic moment: a full validation, the
complete read, the steps. If the free experience quietly stops producing movement, revenue keeps
arriving from existing subscribers for a while and the dashboard looks fine. Validated first
steps goes flat immediately. Revenue is downstream of that number, not a substitute for it.

The same logic rules out the softer vanity metrics: signups, sessions, time in app, ember
brightness. Every one of them can rise while nobody starts anything.

## What this implies

- **The first step is a product surface, not a list item.** If the journey map's opening move is
  not doable inside a week by someone with no pipeline, the North Star cannot move no matter how
  good the read is.
- **Honesty is load-bearing, not a principle we pay lip service to.** Bands, confidence marks and
  flagged low-confidence findings exist because an operator who does not believe the read will
  not take the step. Invented precision would raise completed validations and sink this number.
- **The gap between the read and the journey map is the highest-leverage seam in the product.**
  That handoff is where the metric is won or lost.
- **Sharpening is a means, not an end.** Add fuel earns its place only when it makes the first
  step more specific or more credible.

## What needs instrumenting

Not built here. This section is the honest inventory of what the metric currently cannot be
measured from, so nobody reports a number the data cannot support.

Today the two halves live in different places and neither is queryable as a funnel:

1. **The validation half** is a `thesis_runs` row. Countable per user per week already.
2. **The first-step half** is inside `thesis_runs.step_progress`, a jsonb blob that is overwritten
   in place. It records the current state of a user's steps but not *when* a step first flipped to
   done, so the "within 7 days" clause cannot be evaluated from it as it stands.
3. **There is no warehouse event for either.** The canonical `activated` lifecycle event exists in
   the attribution contract and Circle has never emitted one, so the metric cannot be joined to
   acquisition channel and no channel can be judged on whether it delivers users who actually
   move.

The shape of the work, when it is scheduled:

- Record a first-completion timestamp per step rather than only current state, so the 7 day window
  is computable. Whether that is a timestamp inside `step_progress` or an append-only events table
  is an implementation call, but it must be append-only in spirit: overwriting loses the metric.
- Emit `activated` to the warehouse on the first mapped step completed after a validation, keyed
  on user id so re-emits are harmless, through the existing authenticated `emit-lifecycle`
  function. That is what closes the loop from `landed` to `signed_up` to `activated` and finally
  makes a channel judgeable on outcome instead of volume.
- Report it weekly, as a count and not a rate. A rate invites gaming the denominator.

Until those exist, any "validated first steps" figure is an estimate. Say so when quoting one.

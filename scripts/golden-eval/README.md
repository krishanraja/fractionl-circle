# Golden-set eval for the read

A fixed set of ICP-derived profiles run through the real `validate-thesis` edge function,
to catch honesty and discrimination regressions before they ship. Born from the 2026-07-04
audit, which found the read inflated Demand/Burning-need to `strong/high` regardless of how
thin or gibberish the input was, and fabricated a market for an empty thesis.

## When to run
Before shipping any change to `supabase/functions/validate-thesis`, its prompts, or
`supabase/functions/_shared/profileContext.ts`.

## How
```
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_ANON_KEY=<anon> \
SUPABASE_SERVICE_ROLE_KEY=<service-role> \
node scripts/golden-eval/run.mjs
```
It creates a throwaway confirmed user (its 14-day trial reads as pro, so the free-read cap
never bites), runs every profile, prints the opportunity/ability bands, deletes the user, and
exits non-zero if a honesty regression is detected.

## The honesty floor (what a good run looks like)

**Last updated 2026-07-12** to match what `run.mjs` actually enforces - only one of the
three checks below is a hard gate (non-zero exit); the other two are print-only, for a
human to eyeball in the console output.

- **p9** (gibberish "i want to make money") - **hard gate.** Fails the run (non-zero exit)
  if Demand comes back `strong`. This is the only check that currently blocks a bad run.
- **p7** (vague thesis "finance help for companies") - **informational only, not a gate.**
  The script prints a note if Demand is `strong/high` but does not fail the run - the model
  reasonably inferring a niche from background is judged a soft signal, not a regression.
- **p10** (a litigator selling CMO services) - **not implemented.** The script does not
  inspect "Fit to you" / ability bands for this profile at all. A regression here (Fit
  reading strong instead of weak) would not be caught and would not fail the run. If this
  is still meant to be part of the honesty floor, it needs to be added to `run.mjs`.
- Across the real profiles, the opportunity bands should actually move with the specificity and
  evidence of each thesis, not sit pinned at strong - eyeball the printed output for this,
  since nothing currently automates it.

`golden-set.json` holds the profiles and the expected characteristics (written before running).
Add profiles as new failure modes are found.

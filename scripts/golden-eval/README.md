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
exits non-zero **only** if `p9` fabricates a strong market - that is the one automated,
hard-failing check (`run.mjs`'s `flagged` counter).

## Reading the output (one hard gate, one soft signal, one eyeball check)
- **p9** (gibberish "i want to make money") is the **hard gate**: exits non-zero if Demand comes
  back `strong`.
- **p7** (vague thesis "finance help for companies") is a **soft, informational note only** - the
  script prints a note if Demand scores `strong/high`, but does not fail the run on it, because a
  strong background can reasonably let the model infer a niche.
- **p10** (a litigator selling CMO services, "Fit to you" should read weak) has **no automated
  check today** - `run.mjs` does not evaluate it. Read the printed ABILITY line for `p10-*`
  by eye until an automated check is added.
- Across the real profiles, eyeball that the opportunity bands actually move with the specificity
  and evidence of each thesis, not sit pinned at strong.

`golden-set.json` holds the profiles and the expected characteristics (written before running).
Add profiles as new failure modes are found.

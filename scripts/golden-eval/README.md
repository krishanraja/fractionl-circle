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
- **p7** (vague thesis "finance help for companies"): Demand must NOT be `strong/high`; the
  read should say the offer is too vague to size and name what to specify.
- **p9** (gibberish "i want to make money"): must NOT fabricate a strong market; bands weak/low.
- **p10** (a litigator selling CMO services): "Fit to you" must read weak; the mismatch surfaced.
- Across the real profiles, the opportunity bands should actually move with the specificity and
  evidence of each thesis, not sit pinned at strong.

`golden-set.json` holds the profiles and the expected characteristics (written before running).
Add profiles as new failure modes are found.

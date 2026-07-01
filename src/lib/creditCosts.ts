// Single source of truth for what credits BUY. The margin guardrail: the credits we
// charge for an action must always be worth MORE than our marginal $ cost to perform
// it, so every pack (see creditPacks.ts) stays margin-positive.
//
// DEEP_ENRICH_CREDITS MUST match supabase/functions/enrich-max (DEEP_ENRICH_CREDITS).
export const DEEP_ENRICH_CREDITS = 20; // one max-effort person enrichment

// Rough marginal $ cost of one deep enrichment (Perplexity research + LLM synthesis
// + re-embed). Internal sanity check only — the cheapest pack's $/credit must stay
// well above DEEP_ENRICH_MARGINAL_USD / DEEP_ENRICH_CREDITS.
export const DEEP_ENRICH_MARGINAL_USD = 0.06;

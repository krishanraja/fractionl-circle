# Circle — Subprocessors

**Last reviewed:** 2026-06-28. This is the list of third parties that may process personal data on Circle's behalf. Publish a customer-facing version of this list (GDPR Art. 28) and keep a signed DPA on file for each. Verify each entry before publishing — some are conditional on features a given user enables.

| Subprocessor | Purpose | Personal data processed | Region | DPA |
|---|---|---|---|---|
| **Supabase** (AWS) | Database, auth, edge functions, storage | All app data, account identifiers | AWS `us-east-1` (USA) | Required — Supabase offers a DPA |
| **Vercel** | Web hosting, CDN, edge delivery | IP addresses, request metadata | Global edge / USA | Required — Vercel DPA |
| **Perplexity** (API) | Live web research during thesis validation (`validate-thesis` edge function) | Thesis text and background sent as the research query | USA | Required — Perplexity API DPA; confirm no training on API data |
| **OpenAI** (API) | Voice contact parsing, screenshot vision fallback (`gpt-4o`, `gpt-4o-mini`), LLM provider fallback in `_shared/llm.ts` | Thesis text, contact names/titles, screenshot descriptions sent in prompts | USA | Required — OpenAI API DPA; API data not used for training. Consider zero-retention endpoint for sensitive text |
| **Anthropic** (API) | Screenshot-to-contact vision, preferred provider in `parse-screenshot` (`claude-haiku-4-5-20251001`) | Screenshot descriptions, contact names/titles sent in prompts | USA | Required — Anthropic API DPA; confirm no training on API data |
| **Stripe** | Subscription billing | Name, email, billing/payment data | USA/global | Required — Stripe DPA |
| **Resend** | Transactional email | Email address, message content | USA | Required — Resend DPA |
| **Google** (OAuth / Gmail API) | Contact & calendar sync **for users who connect it** | OAuth tokens, contacts, message metadata | USA/global | Conditional on user connection; Google API Services User Data Policy applies |
| **Microsoft** (OAuth / Graph) | Contact & mail sync **for users who connect it** | OAuth tokens, contacts, message metadata | USA/global | Conditional on user connection |

## Notes
- **Data residency:** the production database is in `us-east-1` (USA). For EU data subjects this is an international transfer requiring an appropriate safeguard (SCCs) — disclose in the privacy policy.
- **No data sale:** Circle does not sell or share personal data for cross-context behavioural advertising (relevant to CCPA/CPRA).
- **Roadmap enrichment vendors** (Apollo, People Data Labs, BuiltWith, Exa) are **not** wired into Circle today. If/when the demand-graph enrichment ships, add each here with a DPA before going live, because they introduce third-party personal data (the user's network).

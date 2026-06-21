# Fractionl — Subprocessors

**Last reviewed:** 2026-06-21. This is the list of third parties that may process personal data on Fractionl's behalf. Publish a customer-facing version of this list (GDPR Art. 28) and keep a signed DPA on file for each. Verify each entry before publishing — some are conditional on features a given user enables.

| Subprocessor | Purpose | Personal data processed | Region | DPA |
|---|---|---|---|---|
| **Supabase** (AWS) | Database, auth, edge functions, storage | All app data, account identifiers | AWS `us-east-1` (USA) | Required — Supabase offers a DPA |
| **Vercel** | Web hosting, CDN, edge delivery | IP addresses, request metadata | Global edge / USA | Required — Vercel DPA |
| **Perplexity** (API) | Live web research for thesis validation | Thesis text, background text sent as research prompts | USA | Required — verify Perplexity API DPA and data-retention terms |
| **OpenAI** (API) | LLM structuring of the validation scorecard (provider-fallback path) | Thesis text, background, circle data sent in structuring prompts | USA | Required — OpenAI API DPA; API data not used for training. Consider zero-retention endpoint. |
| **Google** (Gemini API) | Vision LLM for screenshot-to-contact and admired-business extraction; LLM structuring (provider-fallback path) | Profile/business-card images, thesis text, circle data | USA/global | Required — Google Cloud DPA; confirm zero-retention for Gemini API calls |
| **Anthropic** (API) | LLM structuring of the validation scorecard (provider-fallback path) | Thesis text, background, circle data sent in structuring prompts | USA | Required — Anthropic API DPA; confirm data retention policy |
| **Stripe** | Subscription billing | Name, email, billing/payment data | USA/global | Required — Stripe DPA |
| **Resend** | Transactional email (ops notifications) | Email address, message content | USA | Required — Resend DPA |

## Conditional / inactive

| Subprocessor | Status | Notes |
|---|---|---|
| **Google** (People + Calendar API OAuth) | **Not currently active** — the Google Contacts/Calendar sync feature is not accessible in the thesis-validation product UI. Edge functions exist in the codebase but are not connected to the active product. | If re-activated, this becomes a required subprocessor for the users who connect it. |
| **Microsoft** (Graph API OAuth) | **Not currently active** — same as Google Contacts above. | Same condition. |

## Notes
- **Data residency:** the production database is in `us-east-1` (USA). For EU data subjects this is an international transfer requiring an appropriate safeguard (SCCs) — disclose in the privacy policy.
- **No data sale:** Fractionl does not sell or share personal data for cross-context behavioural advertising (relevant to CCPA/CPRA).

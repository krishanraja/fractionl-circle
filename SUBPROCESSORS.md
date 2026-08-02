# Circle - Subprocessors

**Last reviewed:** 2026-08-02. This is the list of third parties that may process personal data on Circle's behalf. Publish a customer-facing version of this list (GDPR Art. 28) and keep a signed DPA on file for each. Verify each entry before publishing - some are conditional on features a given user enables.

| Subprocessor | Purpose | Personal data processed | Region | DPA |
|---|---|---|---|---|
| **Supabase** (AWS) | Database, auth, edge functions, storage | All app data, account identifiers | AWS `us-east-1` (USA) | Required - Supabase offers a DPA |
| **Vercel** | Web hosting, CDN, edge delivery | IP addresses, request metadata | Global edge / USA | Required - Vercel DPA |
| **OpenAI** (API) | Voice transcription (Whisper), one LLM in the provider-fallback chain, vision fallback for screenshot/contact capture | Voice transcripts, plan text, contact names/titles sent in prompts | USA | Required - OpenAI API DPA; API data not used for training. Consider zero-retention endpoint for sensitive text |
| **Anthropic** (API, `claude-haiku-4-5-20251001`) | Preferred vision model for screenshot/business-card contact capture | Screenshot/card images, extracted contact text | USA | Required - Anthropic API DPA; API data not used for training |
| **Perplexity** (API) | Live market research grounding the Plan read (`validate-thesis`, `strengthen-plan`, `enrich-max`) | The user's stated goal/offer, business names researched | USA | Required - Perplexity API DPA |
| **Google Gemini, via the Lovable AI gateway** (`ai.gateway.lovable.dev`) | One LLM in the provider-fallback chain; vision reads of an admired business | Plan text, screenshot images | USA/global | Required - confirm Lovable's own subprocessor status and DPA; Lovable is itself a subprocessor proxying prompts to Google |
| **Apollo** | Contact enrichment (`contact-enrich`, `enrich-linkedin`) | Names, emails, company, title of the user's contacts | USA | Required - Apollo DPA |
| **Clearbit** | Contact enrichment (`contact-enrich`) | Names, emails, company, title of the user's contacts | USA | Required - Clearbit DPA |
| **Google Custom Search (CSE)** | LinkedIn profile lookup (`linkedin-search`) | Contact name/company used as a search query | USA/global | Conditional; covered under Google's terms for the CSE API |
| **Stripe** | Subscription billing, credit-pack purchases | Name, email, billing/payment data | USA/global | Required - Stripe DPA |
| **Resend** | Transactional email (concierge ops, warm-digest, re-engagement) | Email address, message content | USA | Required - Resend DPA |
| **Twilio** | SMS (`send-sms`), contact enrichment lookups | Phone numbers, message content | USA | Required - Twilio DPA |
| **Google** (OAuth / Gmail API) | Contact & calendar sync **for users who connect it** | OAuth tokens, contacts, message metadata | USA/global | Conditional on user connection; Google API Services User Data Policy applies |
| **Microsoft** (OAuth / Graph) | Contact & mail sync **for users who connect it** | OAuth tokens, contacts, message metadata | USA/global | Conditional on user connection |

## Notes
- **Data residency:** the production database is in `us-east-1` (USA). For EU data subjects this is an international transfer requiring an appropriate safeguard (SCCs) - disclose in the privacy policy.
- **No data sale:** Circle does not sell or share personal data for cross-context behavioural advertising (relevant to CCPA/CPRA).
- **Correction (2026-08-02):** this list previously stated Apollo and Clearbit were "roadmap, not wired in today." That was wrong - both are live in `contact-enrich`/`enrich-linkedin` as of this review, confirmed by `APOLLO_API_KEY` and `CLEARBIT_API_KEY` calls in source. Anthropic, Perplexity, the Lovable/Gemini gateway, Twilio, and Google CSE were also live but missing from this table. If People Data Labs, BuiltWith, or Exa are added in the future, add each here with a DPA before going live.

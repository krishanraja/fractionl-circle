# Circle - Subprocessors

**Last reviewed:** 2026-07-12. This is the list of third parties that may process personal data on Circle's behalf. Publish a customer-facing version of this list (GDPR Art. 28) and keep a signed DPA on file for each. Verify each entry before publishing - some are conditional on features a given user enables or keys a given deployment has set.

| Subprocessor | Purpose | Personal data processed | Region | DPA |
|---|---|---|---|---|
| **Supabase** (AWS) | Database, auth, edge functions, storage | All app data, account identifiers | AWS `us-east-1` (USA) | Required - Supabase offers a DPA |
| **Vercel** | Web hosting, CDN, edge delivery | IP addresses, request metadata | Global edge / USA | Required - Vercel DPA |
| **OpenAI** (API) | Chat-completion fallback provider, voice transcription (Whisper), vision-based screenshot/business-card parsing, and text embeddings for semantic circle search (`text-embedding-3-small`) | Voice transcripts, screenshot images, contact/profile text, embedded profile text sent in prompts | USA | Required - OpenAI API DPA; API data not used for training. Consider zero-retention endpoint for sensitive text |
| **Anthropic** (API, `claude-haiku-4-5-20251001`) | Chat-completion fallback provider; primary vision model for screenshot/contact parsing (`parse-screenshot`) | Screenshot images, contact/profile text sent in prompts | USA | Required - Anthropic API DPA |
| **Perplexity** (API) | Live open-web research: the Plan read (`validate-thesis`, `strengthen-plan`) and credit-gated deep-dive person enrichment (`enrich-max`) | The user's stated goal/offer text; for `enrich-max`, a contact's name/title/company/LinkedIn URL | USA | Required - Perplexity API DPA. `enrich-max` is a paid feature that sends a specific contact's identifying details to this vendor for open-web search - disclose clearly to users |
| **Lovable AI Gateway** | Secondary LLM fallback (proxies Gemini) when OpenAI/Anthropic keys are absent | Same prompt content as the OpenAI/Anthropic fallback paths it stands in for | USA/global (gateway) | Required - confirm Lovable's DPA and its own upstream (Google) data terms |
| **Apollo** | Contact/LinkedIn enrichment: email→profile lookup, name→LinkedIn candidate search (`contact-enrich`, `enrich-linkedin`) | Contact name, email, company, LinkedIn URL | USA | Required - Apollo DPA |
| **Clearbit** | Email→profile enrichment fallback (`contact-enrich`) | Contact email | USA | Required - Clearbit DPA |
| **Proxycurl** | Full public LinkedIn profile scrape/enrich (`enrich-linkedin`) | LinkedIn URL, resulting public profile data | USA | Required - Proxycurl DPA |
| **Google Custom Search (CSE)** | LinkedIn profile lookup by name (`linkedin-search`) | Contact name/company used as search query | USA/global | Required - Google API terms |
| **Twilio** | SMS (`send-sms`) and phone-number lookup/enrichment (`contact-enrich`) | Phone numbers, SMS message content | USA | Required - Twilio DPA |
| **Stripe** | Subscription billing, one-time credit-pack purchases | Name, email, billing/payment data | USA/global | Required - Stripe DPA |
| **Resend** | Transactional email | Email address, message content | USA | Required - Resend DPA |
| **Google** (OAuth / Contacts / Calendar API) | Contact & calendar sync **for users who connect it** | OAuth tokens, contacts, message metadata | USA/global | Conditional on user connection; Google API Services User Data Policy applies |
| **Microsoft** (OAuth / Graph) | Contact & mail sync **for users who connect it** | OAuth tokens, contacts, message metadata | USA/global | Conditional on user connection |

## Notes
- **Data residency:** the production database is in `us-east-1` (USA). For EU data subjects this is an international transfer requiring an appropriate safeguard (SCCs) - disclose in the privacy policy.
- **No data sale:** Circle does not sell or share personal data for cross-context behavioural advertising (relevant to CCPA/CPRA).
- **All rows above are for keys actually referenced in source as of 2026-07-12** (`grep`-verified against `supabase/functions/_shared/llm.ts`, `contact-enrich`, `enrich-linkedin`, `enrich-max`, `linkedin-search`, `parse-screenshot`, `send-sms`). A subprocessor only actually processes data if its API key is set in the deployed environment - verify which keys are set in production before publishing a customer-facing version, and drop rows for keys that are not configured.
- **People Data Labs, BuiltWith, Exa** are not referenced anywhere in source as of this review - genuinely not wired in. If/when they ship, add each here with a DPA before going live.

# Circle - Subprocessors

**Last reviewed:** 2026-07-19. This is the list of third parties that may process personal data on Circle's behalf. Publish a customer-facing version of this list (GDPR Art. 28) and keep a signed DPA on file for each. Verify each entry before publishing - some are conditional on features a given user enables.

| Subprocessor | Purpose | Personal data processed | Region | DPA |
|---|---|---|---|---|
| **Supabase** (AWS) | Database, auth, edge functions, storage | All app data, account identifiers | AWS `us-east-1` (USA) | Required - Supabase offers a DPA |
| **Vercel** | Web hosting, CDN, edge delivery | IP addresses, request metadata | Global edge / USA | Required - Vercel DPA |
| **OpenAI** (API) | Voice transcription (Whisper), circle-person embeddings for semantic search (`text-embedding-3-small`), provider-fallback LLM structuring | Voice transcripts, idea/plan text, contact names/titles/notes sent in prompts | USA | Required - OpenAI API DPA; API data not used for training. Consider zero-retention endpoint for sensitive text |
| **Anthropic** (API) | Screenshot-to-contact vision parsing (`claude-haiku-4-5`, preferred provider) | Screenshot image content (profile/business-card), extracted contact fields | USA | Required - Anthropic API DPA; not used for training |
| **Perplexity** (API) | Live market research for the Plan read and the "voice a concern" strengthener | The user's idea/offer text, business background, and the concern they voice | USA | Required - Perplexity API DPA |
| **Lovable AI Gateway** (routes to Google Gemini) | Provider-fallback LLM + vision (business-you-admire / contact screenshots via `extract-admire`, `extract-contact`) | Idea/plan text, screenshot image content | USA/global | Required - confirm Lovable's DPA and Google's downstream terms |
| **Stripe** | Subscription billing + one-time credit packs | Name, email, billing/payment data | USA/global | Required - Stripe DPA |
| **Resend** | Transactional email (warm digest, re-engagement sweep, concierge ops) | Email address, message content | USA | Required - Resend DPA |
| **Twilio** | SMS (`send-sms`) | Phone number, message content | USA | Required - Twilio DPA |
| **Google** (OAuth / People + Calendar API) | Contact & calendar sync **for users who connect it** | OAuth tokens, contacts, calendar metadata (no email body) | USA/global | Conditional on user connection; Google API Services User Data Policy applies |
| **Microsoft** (OAuth / Graph) | Contact & calendar sync **for users who connect it** | OAuth tokens, contacts, calendar metadata (no mail body) | USA/global | Conditional on user connection |
| **Apollo** | Contact enrichment (`contact-enrich`) | Contact name/company/title, matched public professional data | USA | Required - Apollo DPA |
| **Clearbit** | Contact enrichment (`contact-enrich`) | Contact name/company/title, matched public professional data | USA | Required - Clearbit DPA |
| **Google Custom Search (CSE)** | LinkedIn profile lookup (`linkedin-search`) | Search query text derived from contact name/company | USA/global | Conditional - review Google CSE terms |

## Notes
- **Data residency:** the production database is in `us-east-1` (USA). For EU data subjects this is an international transfer requiring an appropriate safeguard (SCCs) - disclose in the privacy policy.
- **No data sale:** Circle does not sell or share personal data for cross-context behavioural advertising (relevant to CCPA/CPRA).
- **Correction (2026-07-19):** the prior version of this list said Apollo/enrichment vendors were "roadmap, not wired in." That is no longer accurate - `contact-enrich` and `enrich-max` reference live `APOLLO_API_KEY` / `CLEARBIT_API_KEY` / `PROXYCURL_API_KEY` secrets in the current codebase. Confirm signed DPAs are on file for Apollo and Clearbit before relying on this list publicly. **Unverified:** whether Proxycurl is actually invoked at runtime or only reserved via an unused secret - flagged for confirmation, not listed above as a firm row until checked against the live function code.

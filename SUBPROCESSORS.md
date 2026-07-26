# Circle - Subprocessors

**Last reviewed:** 2026-07-26. This is the list of third parties that may process personal data on Circle's behalf. Publish a customer-facing version of this list (GDPR Art. 28) and keep a signed DPA on file for each. Verify each entry before publishing - some are conditional on features a given user enables.

| Subprocessor | Purpose | Personal data processed | Region | DPA |
|---|---|---|---|---|
| **Supabase** (AWS) | Database, auth, edge functions, storage | All app data, account identifiers | AWS `us-east-1` (USA) | Required - Supabase offers a DPA |
| **Vercel** | Web hosting, CDN, edge delivery | IP addresses, request metadata | Global edge / USA | Required - Vercel DPA |
| **OpenAI** (API) | Provider-fallback LLM (plan/idea structuring), text embeddings for semantic people-search, voice transcription (Whisper), vision fallback for screenshot/contact capture | Idea/plan text, contact names/titles/notes, voice transcripts, screenshot images sent in prompts | USA | Required - OpenAI API DPA; API data not used for training. Consider zero-retention endpoint for sensitive text |
| **Anthropic** (Claude API) | Vision-preferred screenshot/profile capture (`parse-screenshot`), provider-fallback LLM for plan structuring and enrichment | Screenshot images, contact/profile text, idea/plan text sent in prompts | USA | Required - Anthropic API DPA |
| **Google** (Generative Language API - Gemini) | Vision reads for "business you admire" and contact-screenshot capture (`extract-admire`, `extract-contact`), plus a fallback LLM route via the Lovable gateway | Screenshot images, contact/profile text sent in prompts | USA/global | Required - Google API DPA |
| **Lovable** (AI Gateway) | OpenAI-compatible proxy in front of Google Gemini, used as the middle rung of the provider-fallback chain | Whatever prompt content is in flight when this rung is used (idea/plan text, contact text) | USA/global | Required - confirm Lovable's DPA/subprocessor terms before relying on this rung for EU users |
| **Perplexity** | Live web research grounding the plan read and the "voice a concern" strengthener | The user's stated idea/thesis, business context, and identity facts sent as research prompts | USA | Required - Perplexity API DPA |
| **Stripe** | Subscription billing | Name, email, billing/payment data | USA/global | Required - Stripe DPA |
| **Resend** | Transactional email | Email address, message content | USA | Required - Resend DPA |
| **Google** (OAuth / Gmail API) | Contact & calendar sync **for users who connect it** | OAuth tokens, contacts, message metadata | USA/global | Conditional on user connection; Google API Services User Data Policy applies |
| **Microsoft** (OAuth / Graph) | Contact & mail sync **for users who connect it** | OAuth tokens, contacts, message metadata | USA/global | Conditional on user connection |

## Notes
- **Data residency:** the production database is in `us-east-1` (USA). For EU data subjects this is an international transfer requiring an appropriate safeguard (SCCs) - disclose in the privacy policy.
- **No data sale:** Circle does not sell or share personal data for cross-context behavioural advertising (relevant to CCPA/CPRA).
- **Multiple AI vendors, by design:** `supabase/functions/_shared/llm.ts` tries OpenAI, then the Lovable/Gemini gateway, then Anthropic, in order, so one vendor being down or out of quota doesn't take the product down. Any of the three can end up processing a given prompt - all three need a DPA on file, not just whichever is "primary" this month.
- **Deployed but not currently invoked:** `send-sms` (Twilio) exists in `supabase/functions/` and reads `TWILIO_*` secrets, but nothing in the app or extension currently calls it - no SMS is sent today. Remove this note once it is wired to a live flow (and add Twilio to the table above at that point) or delete the function.
- **Roadmap enrichment vendors** (Apollo, People Data Labs, BuiltWith, Exa) are **not** wired into Circle today. If/when the demand-graph enrichment ships, add each here with a DPA before going live, because they introduce third-party personal data (the user's network). `PROXYCURL_API_KEY` is already read by `enrich-linkedin` as an optional full-profile-scrape path - if a value is ever set for it in production, add Proxycurl to the table above immediately, since it would then be live.

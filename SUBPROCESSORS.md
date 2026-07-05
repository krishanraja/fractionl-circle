# Circle - Subprocessors

**Last reviewed:** 2026-07-05. This is the list of third parties that may process personal data on Circle's behalf. Publish a customer-facing version of this list (GDPR Art. 28) and keep a signed DPA on file for each. Verify each entry before publishing - some are conditional on features a given user enables.

| Subprocessor | Purpose | Personal data processed | Region | DPA |
|---|---|---|---|---|
| **Supabase** (AWS) | Database, auth, edge functions, storage | All app data, account identifiers | AWS `us-east-1` (USA) | Required - Supabase offers a DPA |
| **Vercel** | Web hosting, CDN, edge delivery | IP addresses, request metadata | Global edge / USA | Required - Vercel DPA |
| **OpenAI** (API) | Voice transcription (`whisper-1`), embeddings for semantic people-search (`text-embedding-3-small`), fallback vision (`gpt-4o-mini`) and fallback chat/reasoning LLM | Voice transcripts, idea/positioning text, contact names/titles sent in prompts | USA | Required - OpenAI API DPA; API data not used for training. Consider zero-retention endpoint for sensitive text |
| **Anthropic** (API) | Preferred vision model for screenshot contact capture (`claude-haiku-4-5`) | Screenshot-derived contact/profile text | USA | Required - Anthropic API DPA |
| **Google** (Gemini API, separate from Google OAuth below) | Vision for "add by screenshot" (business/profile image → positioning or contact fields) | Screenshot-derived contact/positioning text | USA/global | Required - Google API DPA |
| **Lovable** (AI gateway) | Fallback chat/reasoning LLM proxy (routes to Gemini); currently the primary working path while OpenAI billing is exhausted | Idea/positioning text, profile context sent in prompts | USA | Required - confirm Lovable's DPA/subprocessor terms |
| **Perplexity** | Live market research behind every Value Prop read | The user's idea, positioning, target buyer, and background sent as research context | USA | Required - Perplexity API DPA |
| **Stripe** | Subscription billing + one-time credit packs | Name, email, billing/payment data | USA/global | Required - Stripe DPA |
| **Resend** | Transactional email (warm digest, chief-of-staff brief, re-engagement sweep) | Email address, message content | USA | Required - Resend DPA |
| **Google** (OAuth / Contacts / Calendar API) | Contact & calendar sync **for users who connect it** | OAuth tokens, contacts, message metadata | USA/global | Conditional on user connection; Google API Services User Data Policy applies |
| **Microsoft** (OAuth / Graph) | Contact & mail sync **for users who connect it** | OAuth tokens, contacts, message metadata | USA/global | Conditional on user connection |

## Notes
- **Data residency:** the production database is in `us-east-1` (USA). For EU data subjects this is an international transfer requiring an appropriate safeguard (SCCs) - disclose in the privacy policy.
- **No data sale:** Circle does not sell or share personal data for cross-context behavioural advertising (relevant to CCPA/CPRA).
- **Code exists but is not wired into any live flow, so not a current subprocessor:** `contact-enrich` (Apollo, Clearbit) and `send-sms` (Twilio) edge functions exist in the repo but are not called from the frontend or any other function as of 2026-07-05 - confirmed by searching for their invocation. If either is wired up, add Apollo/Clearbit/Twilio here with a DPA before going live.

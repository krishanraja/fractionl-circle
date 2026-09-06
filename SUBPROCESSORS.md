# Circle by Fractionl - subprocessors

Last reviewed: 2026-09-06. Publication state: internal draft for counsel and
owner verification. See [docs/legal/README.md](docs/legal/README.md) for the
publication gate.

This list describes providers that may process personal data for Circle. Conditional providers process data only when the relevant feature is used and its key or connection is configured. Keep a current DPA and processing purpose for every active provider before publishing a customer-facing list.

| Provider | Purpose | Data that may be processed | Region / status |
|---|---|---|---|
| Supabase on AWS | Database, authentication, Edge Functions, storage | Account and app data | `us-east-1`, USA |
| Vercel | Web hosting, CDN, deployment, request delivery | IP and request metadata | Global edge / USA |
| OpenAI API | Whisper transcription, embeddings, dedupe/LLM fallback, vision fallback | Voice audio/transcript, contact and request text, screenshot content | USA; confirm current DPA and retention settings |
| Anthropic API | Preferred screenshot/contact vision parsing when configured | Screenshot images and extracted contact context | USA; conditional |
| Google Gemini through the Lovable AI Gateway | Contact parsing, ranking, and other configured LLM fallback paths | Contact, request, idea, and screenshot-derived text | Gateway-routed; confirm DPA chain |
| Perplexity API | Live research used by configured idea/read paths | User idea/request and selected profile context | USA; conditional |
| Apollo.io | Contact enrichment | Contact name, email, company, and profile identifiers | Conditional on configured key |
| Clearbit / HubSpot | Email-based enrichment fallback | Contact email and returned profile fields | Conditional on configured key |
| Twilio | SMS delivery and phone lookup | Phone number and SMS content | Conditional on feature use |
| Google | OAuth contacts/calendar and Custom Search | OAuth tokens, contacts, calendar metadata, search queries | Conditional on connection/configuration |
| Microsoft Graph | OAuth contacts/calendar | OAuth tokens, contacts, calendar metadata | Conditional on connection |
| Stripe | Subscription and credit-pack billing | Name, email, payment and billing metadata | USA/global |
| Resend | Transactional and re-engagement email | User email and message content, which may include contact names | USA; conditional on message path |

## Current notes

- Fractionl does not sell personal data or share it for cross-context behavioural advertising.
- The production database is in the United States. EU/UK transfers require an appropriate safeguard.
- Google OAuth currently requests Gmail scopes even though current source uses contacts/calendar rather than Gmail. Remove unused scopes or document and verify the intended Gmail feature before moving the OAuth app beyond test users.
- Apollo and Clearbit are live conditional integrations, not roadmap placeholders.
- People Data Labs, BuiltWith, and Exa are not integrated in current source. Add them here and complete provider review before any future wiring.
- Provider API data-use and retention settings can change. Confirm them against current agreements before publishing this draft.

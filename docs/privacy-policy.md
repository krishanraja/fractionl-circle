# Privacy Policy - Circle (DRAFT)

> **STATUS: DRAFT - NOT LEGAL ADVICE. Must be reviewed and finalised by counsel before publishing.** Placeholders are marked `[…]`. This scaffold reflects what the product actually does so a lawyer has an accurate starting point. **Content synced to code:** 2026-07-12.

**Effective date:** [DATE] · **Controller:** fractionl ([legal entity, address]) · **Contact:** privacy@fractionl.ai

## 1. Who we are
Circle ("we") is the relationship-to-revenue tool for fractional executives at circle.fractionl.ai.

## 2. What we collect
- **You give us:** your name, email, voice recordings/transcripts, your stated goal and offer (what the product calls your "plan" or "read"), and details of people in your professional network (names, emails, phones, LinkedIn, company, title).
- **You connect (optional):** Google/Microsoft mail & calendar, via OAuth, to sync contacts.
- **We generate:** vector embeddings of your network's profiles (for search), a record of AI-drafted outreach messages and the edits you make to them (so future drafts sound like you), and one-time credit-purchase history for paid deep-research enrichment.
- **Automatically:** usage/behaviour analytics, session data, IP address, and marketing attribution (UTM).
- **Billing:** handled by Stripe; we do not store full card details.

## 3. Why (lawful bases)
Contract (running the service), consent (connected accounts, certain analytics), legal obligation (consent & audit records), and legitimate interest (security, product analytics, managing your network). See `docs/RoPA.md`.

## 4. Data about your network
Circle stores information about third parties in your professional network so you can manage those relationships. We do not market to your contacts. You can export or delete this data at any time.

## 5. Sharing - subprocessors
We use the processors listed in `SUBPROCESSORS.md` (Supabase, Vercel, Stripe, Resend, Google/Microsoft if you connect them, and several AI/enrichment vendors - see below). **We do not sell your personal data** or share it for cross-context behavioural advertising.

## 6. AI processing
Voice transcripts, your goal/offer text, and contact text are sent to AI providers to transcribe, structure, and draft with: OpenAI (transcription, chat, embeddings), Anthropic (screenshot/contact-image parsing), and a provider-fallback gateway that may route to Google's Gemini. When you research the live market or ask us to dig deeper on a contact, we send relevant text to Perplexity for open-web research. When you enrich a contact, we may query Apollo, Clearbit, or Proxycurl for public profile data. None of this data is used to train these providers' models. [Confirm zero-retention configuration for each.]

## 7. International transfers
Data is stored in the United States (AWS us-east-1). For users in the EU/UK, transfers rely on Standard Contractual Clauses. [Confirm.]

## 8. Retention
We keep your data for the life of your account. Analytics are purged after 90 days. Consent and audit records are kept for 7 years (legal obligation). On erasure we delete everything except those legally required records.

## 9. Your rights
Access, export (portability), correction, erasure, restriction, objection, and opt-out. Use Settings → Privacy in the app, or email privacy@fractionl.ai. We respond within 30 days (GDPR) / 45 days (CCPA). The app fulfils export and erasure directly.

## 10. Security
See `SECURITY.md`. TLS in transit, encryption at rest, RLS, MFA available, audit logging.

## 11. Children
Not directed to anyone under 16. [Confirm.]

## 12. Changes & contact
We'll post changes here with a new effective date. Questions: privacy@fractionl.ai. [EU representative / DPO if applicable.]

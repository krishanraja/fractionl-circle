# Privacy Policy - Fractionl / Circle (DRAFT)

> **STATUS: DRAFT - NOT LEGAL ADVICE. Must be reviewed and finalised by counsel before publishing.** Placeholders are marked `[…]`. This scaffold reflects what the product actually does so a lawyer has an accurate starting point. **Updated 2026-08-09** to match the current product (previously described the retired "Circle CRM" generation - Ideas, Match Engine drafting - which was removed 2026-06-29).

**Effective date:** [DATE] · **Controller:** fractionl ([legal entity, address]) · **Contact:** privacy@fractionl.ai

## 1. Who we are
Fractionl ("we") is a two-part product for fractional executives at circle.fractionl.ai: **Plan** reads
the live market against what you want to offer and shows where you stand, and **Circle** is your warm
network, kept warm over time.

## 2. What we collect
- **You give us:** your name, email, the offer/idea you describe (typed or via voice, transcribed), screenshots of businesses you admire, answers to the make-it-stronger coach's questions, and details of people in your professional network (names, emails, phones, LinkedIn, company, title, notes).
- **You connect (optional):** Google/Microsoft contacts & calendar, via OAuth, to sync your network and recent meetings. We read contacts and calendar events; we do not read or send mail through this connection today, though the Google OAuth grant currently requests broader mail scopes than the app uses - see the open item in `SECURITY.md` before this is finalised.
- **Automatically:** usage/behaviour analytics, session data, IP address, and marketing attribution (UTM), including an anonymous "landed" event recorded on your first visit before you sign up.
- **Billing:** handled by Stripe; we do not store full card details. Optional one-time credit-pack purchases are tracked as a credit balance/ledger.

## 3. Why (lawful bases)
Contract (running the service), consent (connected accounts, certain analytics), legal obligation (consent & audit records), and legitimate interest (security, product analytics, managing your network). See `docs/RoPA.md`.

## 4. Data about your network
Circle stores information about third parties in your professional network so you can manage those relationships. We do not market to your contacts. You can export or delete this data at any time.

## 5. Sharing - subprocessors
We use the processors listed in `SUBPROCESSORS.md` (Supabase, Vercel, OpenAI, Anthropic, Google Gemini via the Lovable AI Gateway, Perplexity, Stripe, Resend, Twilio, and Google/Microsoft if you connect them; Apollo/Clearbit if contact enrichment is used). **We do not sell your personal data** or share it for cross-context behavioural advertising.

## 6. AI processing
Your offer/idea text and profile are sent to our LLM providers (OpenAI, Anthropic, and Google Gemini via a gateway) to generate your read, ask coaching questions, and parse screenshots into contacts. Perplexity runs live web research grounded in your offer text to produce the read and the voiced "concern" strengthener. Contact/dossier text is embedded (OpenAI) to power semantic network search. This data is not used to train provider models under our API agreements. [Confirm zero-retention configuration with each provider.]

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

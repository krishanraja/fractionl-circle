# Privacy Policy — Fractionl (DRAFT)

> **STATUS: DRAFT — NOT LEGAL ADVICE. Must be reviewed and finalised by counsel before publishing.** Placeholders are marked `[…]`. This scaffold reflects what the product actually does so a lawyer has an accurate starting point.

*Last updated: 2026-06-21*

**Effective date:** [DATE] · **Controller:** fractionl ([legal entity, address]) · **Contact:** privacy@fractionl.ai

## 1. Who we are
Fractionl ("we") operates the thesis-validation engine at circle.fractionl.ai. We help fractional executives validate their offer thesis against the real market and identify moves toward their first clients.

## 2. What we collect
- **You give us:** your name, email, your thesis (the fractional offer idea you describe in plain text), background notes, and names and titles of people in your professional network that you add to your circle.
- **You optionally provide:** a LinkedIn profile URL, screenshots of LinkedIn/Instagram profiles or business cards, and names and positioning notes of businesses you admire.
- **Automatically:** usage/behaviour analytics, session data, IP address, and marketing attribution (UTM).
- **Billing:** handled by Stripe; we do not store full card details.

## 3. Why (lawful bases)
Contract (running the service), consent (certain analytics), legal obligation (consent and audit records), and legitimate interest (security, product analytics, managing your network). See `docs/RoPA.md`.

## 4. Data about your network
Fractionl stores names, titles, and companies of third parties in your professional network (in `circle_person`) so the thesis validation can score your warm reach against real people. We do not market to your contacts. You can export or delete this data at any time.

## 5. AI processing
- **Thesis validation:** your thesis text, background, and circle data are sent to Perplexity's API for live web research and to a provider-fallback LLM (OpenAI, Google Gemini, or Anthropic) for structuring the scorecard. Data is not used to train their models. [Confirm zero-retention configuration with each provider.]
- **Screenshot vision:** profile and business-card images you upload are sent to Google's Gemini API to extract name, title, and company. The raw image is not stored by us or by Google after processing. [Confirm with Google API terms.]
- **Admired-business screenshots:** images of businesses you admire are sent to Gemini vision to extract how they position. The raw image is not stored.

## 6. Sharing — subprocessors
We use the processors listed in `SUBPROCESSORS.md` (Supabase, Vercel, Perplexity, OpenAI, Google Gemini, Anthropic, Stripe, Resend). **We do not sell your personal data** or share it for cross-context behavioural advertising.

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

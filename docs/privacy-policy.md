# Privacy Policy - Circle by Fractionl (DRAFT)

> Status: draft, not legal advice. Counsel must review and finalise this document before publication. Placeholders are marked `[PLACEHOLDER]`.

Last product review: 2026-08-10.

**Effective date:** [PLACEHOLDER]
**Controller:** Fractionl [legal entity and address]
**Contact:** privacy@fractionl.ai

## 1. Who we are

Circle is a personal contact-memory and recall service for fractional executives and independent operators at circle.fractionl.ai.

## 2. What we collect

- Account details: name, email, avatar, authentication identifiers, and optional profile information.
- Contact clues: names, email addresses, phone numbers, social/profile links, company, role, location, notes, where the user met someone, and other context the user chooses to save.
- Media and voice: photos shared for contact parsing and voice recordings or transcripts created after the user taps the microphone.
- Requests: natural-language person requests and idea statements used to find relevant saved people.
- Optional connections: Google or Microsoft contacts and calendar data when the user connects an account.
- Service data: usage events, session data, IP address, device/request metadata, consent records, and marketing attribution parameters.
- Billing: Stripe processes payment-card data. Fractionl stores subscription, purchase, and credit-ledger metadata, not full card details.
- Historical data: older Plan/thesis, draft, and decision records may remain for existing accounts even though those surfaces are not active navigation.

## 3. Why we process it

Depending on the data and jurisdiction, the lawful basis may be contract, consent, legal obligation, or legitimate interest. See `docs/RoPA.md`. Counsel must confirm the final basis and notices for each jurisdiction.

## 4. Data about other people

Users may save professional details about people who are not Circle users. Circle processes that information only to provide the user's personal contact-memory and recall service. Circle does not market to those contacts and does not send them messages automatically.

## 5. Service providers

The current processor inventory is in `SUBPROCESSORS.md`. It includes hosting, database/auth, AI, research, enrichment, billing, messaging, and optional connected-account providers. Conditional providers process data only when the relevant feature is used and configured.

Fractionl does not sell personal data or share it for cross-context behavioural advertising.

## 6. AI and enrichment

Circle may send contact clues, profile text, voice audio/transcripts, screenshots, or idea/request text to configured AI and research providers to parse, transcribe, enrich, search, or rank saved people. Wider provider-backed paths can fail; exact-name recall and grounded local matching use saved evidence.

Provider training, retention, and zero-retention settings must be confirmed against current agreements before this draft is published.

## 7. International transfers

Production data is hosted in the United States, including Supabase on AWS `us-east-1`. EU/UK transfer safeguards, including Standard Contractual Clauses where required, must be confirmed by counsel.

## 8. Retention

Account and contact data is kept for the life of the account unless the user deletes it sooner. Short-lived analytics is configured for a 90-day purge. Consent, security-audit, and data-subject-request records may be kept for seven years where a legal obligation applies.

The current DSAR helper discovers every live public base table with erasable `user_id` data, plus the separately handled profile. Export and erasure intentionally retain only `data_subject_requests`, `security_audit_log`, and `user_consents` under the documented legal-hold policy.

## 9. User rights

Depending on location, users may have rights to access, export, correct, erase, restrict, object, or opt out. Signed-in users can open Privacy settings to download data or request account deletion, or email privacy@fractionl.ai.

The app uses `export_user_data`, `erase_user_data`, and the server-side `delete-account` function. Account deletion erases covered user-owned rows, anonymises the profile, records the required erasure audit, and removes the auth identity. Counsel must confirm response timelines and exceptions for each jurisdiction.

## 10. Security

See `SECURITY.md`. Current controls include TLS, security headers, Supabase Auth, row-level security, audit logging, and change control through reviewed source revisions.

## 11. Children

The service is not directed to people under 16. [COUNSEL TO CONFIRM]

## 12. Changes and contact

Material changes will be posted with a new effective date. Questions: privacy@fractionl.ai. [EU REPRESENTATIVE OR DPO IF REQUIRED]

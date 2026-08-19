# Records of Processing Activities (RoPA) - GDPR Art. 30

Last reviewed: 2026-08-16. Publication state: internal draft for counsel
review. See [docs/legal/README.md](legal/README.md) for the remaining decisions.

**Controller:** Fractionl / Circle
**Contact:** privacy@fractionl.ai

This record reflects the active Circle capture/recall product plus personal data that can remain from older product generations. Product truth: `docs/PRODUCT.md`. Processor truth: `SUBPROCESSORS.md`.

## Processing activities

| Activity | Personal data | Data subjects | Basis to confirm | Retention | Main locations |
|---|---|---|---|---|---|
| Account and auth | email, name, avatar, auth identifiers, optional profile/link | Users | Contract | Life of account | Supabase Auth, `user_profiles` |
| Contact capture and recall | third-party names, email, phone, links, company, role, location, notes, meeting context, dossier, embeddings | Users' professional contacts | Legitimate interest | Life of account or until erased | `circle_person`, `person_raw`, `sources`, `signals` |
| Voice and photo parsing | voice audio/transcript, shared or uploaded contact images, extracted fields | Users and their contacts | Contract and consent | Raw media is not intentionally persisted by parsing functions; the resulting saved input follows account retention | Edge Functions, configured AI providers, contact tables |
| Person requests and idea matching | request/idea text, ranked saved-person evidence | Users and their contacts | Contract | Life of account where stored | `the_read`, contact records, provider requests |
| Optional connected accounts | OAuth tokens, contacts, calendar metadata | Users who connect Google/Microsoft and their contacts | Consent | Until disconnect or erasure | `oauth_tokens`, `sources` |
| Contact enrichment | name, email, phone, company, social/profile links | Users' contacts | Legitimate interest | Result follows contact retention | Conditional providers in `SUBPROCESSORS.md` |
| Notifications and transactional messages | user email/phone, push subscription, message content | Users | Consent or contract | Until unsubscribe/erasure or operational retention | `push_subscriptions`, `delivery_log`, Resend/Twilio when used |
| Historical Plan/thesis records | offer/idea text, answers, admired-business inputs, decisions, draft edits | Existing users | Contract | Life of account or until erased | `thesis_runs`, `thesis_answers`, `thesis_inspiration`, `decision_ledger`, `draft_edits`, `compounding_events` |
| Consent | consent choices, IP, timestamp | Users | Legal obligation | Seven years | `user_consents` |
| Security audit and DSAR | actions, IP, timestamps, request status | Users | Legal obligation and legitimate interest | Seven years | `security_audit_log`, `data_subject_requests` |
| Product analytics | behaviour and session events | Users | Consent or legitimate interest | 90 days where purge policy applies | `user_behavior_logs`, `user_sessions`, `feature_usage`, `usage_tracking` |
| Billing and credits | name, email, payment metadata, subscription, credit balance/ledger | Paying users | Contract and legal obligation | Per tax/payment law | Stripe, `subscriptions`, `credit_balance`, `credit_ledger` |
| Marketing attribution | UTM/campaign data, anonymous and later user attribution IDs | Visitors and users | Consent or legitimate interest | Per attribution policy | `user_attribution`, external warehouse event for anonymous landing |

Counsel must confirm every lawful basis and retention period before publication.

## Special-category data

None is intended. Circle is not designed to process health, biometric, or protected health information. Users can place arbitrary text in notes, so policy and support procedures must address accidental entry rather than claiming technical impossibility.

## Third-party contact data

Circle stores professional information about people who are not Circle users. It may generate embeddings or dossier summaries to support recall. The user controls capture and action; Circle does not market to those contacts or contact them automatically.

## Export and erasure coverage

Migration `20260811014533_extend_dsar_coverage.sql` updates `_dsar_user_tables()` to discover every live public base table that contains erasable `user_id` data. `export_user_data()` and `erase_user_data()` consume that result, so schema differences and future user-owned tables do not silently fall out of coverage. `user_profiles` is handled separately because its user key is `id`.

The three intentionally retained tables are:

- `data_subject_requests`
- `security_audit_log`
- `user_consents`

They remain under the documented legal-hold policy. The server-side `delete-account` function runs erasure and then removes the Supabase Auth user.

## Legacy data

Older Ideas, Matches, Moves, Streams, Plan/thesis, client/revenue, and generic-template tables still exist. Some are no longer used by active navigation, but any rows remain personal data at rest. They stay in the DSAR coverage list until an authorised retention sweep removes the tables or data.

## International transfers

Production data resides in AWS `us-east-1` through Supabase. Other providers may process in the USA or globally. Appropriate safeguards, including SCCs where needed, must be confirmed with counsel and each provider agreement.

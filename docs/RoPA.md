# Records of Processing Activities (RoPA) — GDPR Art. 30

**Last reviewed:** 2026-06-21. **Status: DRAFT — for counsel review.** Derived from the live data model (thesis-validation engine). The authoritative machine list of user-owned tables is `_dsar_user_tables()` in migration `20260602000002_compliance_hardening.sql`.

**Controller:** fractionl (circle.fractionl.ai). **Contact:** privacy@fractionl.ai

## Processing activities

| Activity | Personal data | Data subjects | Lawful basis | Retention | Where |
|---|---|---|---|---|---|
| Account & auth | email, name, avatar, auth identifiers | Users | Contract | Life of account | `user_profiles`, Supabase Auth |
| Thesis capture & validation | thesis text, background text, LinkedIn URL, validation scorecard, step progress | Users | Contract | Life of account | `thesis_runs` |
| Admired-business inspiration | name and positioning of businesses the user admires, and why | Users | Contract | Life of account | `thesis_inspiration` |
| Circle (warm-reach network) | **third-party** names, titles, companies from screenshots or CSV | Users' contacts | Legitimate interest | Life of account / until erased | `circle_person` |
| Connected mail/calendar | OAuth tokens, contacts, message metadata | Users who connect | Consent | Until disconnect / erasure | `oauth_tokens`, `sources` |
| Consent records | consent choices, IP, timestamp | Users | Legal obligation | 7 years | `user_consents` |
| Security audit | actions, IP, timestamp | Users | Legal obligation / legitimate interest | 7 years | `security_audit_log` |
| Product analytics | behaviour events, session data | Users | Legitimate interest | 90 days (auto-purged) | `user_behavior_logs`, `user_sessions` |
| Billing | name, email, payment metadata | Paying users | Contract | Per Stripe / tax law | Stripe, `subscriptions` |
| Marketing attribution | UTM, anonymous id | Visitors | Legitimate interest / consent | Life of account | `user_attribution` |

## Special category data
None intended. **No health, biometric, or PHI data is processed** (HIPAA out of scope).

## Third-party processing of contact data — note
The thesis engine stores personal data about third parties (the user's professional network) in `circle_person` so the warm-reach score in the validation can be grounded in real people. The lawful basis is the user's legitimate interest in managing their professional relationships; contacts are not marketed to by Fractionl. This must be disclosed in the privacy policy and is erasable on request.

## International transfers
Production data resides in AWS `us-east-1` (USA). EU transfers rely on SCCs — confirm with counsel.

## Legacy tables note
The following tables exist in the database schema from prior product iterations but are no longer written to by the active product: `clients`, `opportunities`, `activity_logs`, `revenue_entries`, `streams`, `matches`, `moves`, `ideas`, `talent_contacts`, `talent_skills`, `talent_referrals`, `talent_opportunities`. They are not covered by `_dsar_user_tables()` and should be reviewed for pruning. They are listed here only for completeness.

# Records of Processing Activities (RoPA) - GDPR Art. 30

**Last reviewed:** 2026-08-02. **Status: DRAFT - for counsel review.** Derived from the live data model. The authoritative machine list of user-owned tables is `_dsar_user_tables()` in migration `20260602000002_compliance_hardening.sql`.

**Correction (2026-08-02):** the "Idea capture & matching" and "Revenue & streams" activities below described the "Circle CRM" generation (Ideas -> Matches -> Moves -> Streams -> Sunday Letter) that was removed from the product on 2026-06-29 (see `README.md`'s changelog). Those rows are replaced with the current Plan-read activity. The underlying tables (`ideas`, `matches`, `moves`, `streams`, `clients`, `revenue_entries`, `ledger_entries`) were never dropped by migration, so any data already in them is orphaned, not actively processed - flag for a data-retention decision with counsel rather than treating this doc's old rows as still describing live processing.

**Controller:** fractionl (Circle). **Contact:** privacy@fractionl.ai

## Processing activities

| Activity | Personal data | Data subjects | Lawful basis | Retention | Where |
|---|---|---|---|---|---|
| Account & auth | email, name, avatar, auth identifiers | Users | Contract | Life of account | `user_profiles`, Supabase Auth |
| Plan read (market research on the user's offer) | the user's stated goal/offer, voice transcripts, screenshots of admired businesses, decisions made on the make-it-stronger coach | Users | Contract | Life of account | `thesis_runs`, `thesis_answers`, `thesis_inspiration` |
| Network / Circle | **third-party** names, emails, phones, LinkedIn, company, title | Users' contacts | Legitimate interest | Life of account / until erased | `circle_person`, `person_raw` |
| Connected mail/calendar | OAuth tokens, contacts, message metadata | Users who connect | Consent | Until disconnect / erasure | `oauth_tokens`, `sources` |
| Consent records | consent choices, IP, timestamp | Users | Legal obligation | 7 years | `user_consents` |
| Security audit | actions, IP, timestamp | Users | Legal obligation / legitimate interest | 7 years | `security_audit_log` |
| Product analytics | behaviour events, session data | Users | Legitimate interest | 90 days (auto-purged) | `user_behavior_logs`, `user_sessions` |
| Billing | name, email, payment metadata | Paying users | Contract | Per Stripe / tax law | Stripe, `subscriptions` |
| Marketing attribution | UTM, anonymous id | Visitors | Legitimate interest / consent | Life of account | `user_attribution` |

## Special category data
None intended. **No health, biometric, or PHI data is processed** (HIPAA out of scope).

## Third-party processing of contact data - note
Circle stores personal data about the user's *network* (third parties who are not Circle users). The lawful basis is the user's legitimate interest in managing their professional relationships; contacts are not marketed to by Circle. This must be disclosed in the privacy policy and is erasable on request.

## International transfers
Production data resides in AWS `us-east-1` (USA). EU transfers rely on SCCs - confirm with counsel.

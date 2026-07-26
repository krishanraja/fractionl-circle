# Records of Processing Activities (RoPA) - GDPR Art. 30

**Last reviewed:** 2026-07-26. **Status: DRAFT - for counsel review.** Derived from the live data model.

**Open compliance gap (confirmed against code 2026-07-26):** the authoritative machine list of
user-owned tables, `_dsar_user_tables()` in migration `20260602000002_compliance_hardening.sql`,
was last edited 2026-06-02 and predates eight user-data tables shipped since -
`thesis_runs`, `thesis_inspiration`, `thesis_answers`, `credit_balance`, `credit_ledger`,
`draft_edits`, `delivery_log`, `compounding_events`. These hold the product's current core data
(plan reads, decisions, admired businesses, credit history, delivery/draft logs) and are **not
included** in `export_user_data` / `erase_user_data` today. The processing activities below
reflect the actual current schema; the DSAR functions do not yet cover every row listed. This
needs a migration to extend `_dsar_user_tables()` before Art. 15/17/20 rights are complete for
the current product. See `COMPLIANCE.md`.

**Controller:** fractionl (Circle). **Contact:** privacy@fractionl.ai

## Processing activities

| Activity | Personal data | Data subjects | Lawful basis | Retention | Where | In DSAR export/erase today? |
|---|---|---|---|---|---|---|
| Account & auth | email, name, avatar, auth identifiers | Users | Contract | Life of account | `user_profiles`, Supabase Auth | Yes (handled separately by id) |
| Plan / idea capture & the strength read | idea/plan text, voice transcripts, banded read results, decisions | Users | Contract | Life of account | `thesis_runs`, `thesis_inspiration`, `thesis_answers` | **No - gap above** |
| Network / Circle | **third-party** names, emails, phones, LinkedIn, company, title | Users' contacts | Legitimate interest | Life of account / until erased | `circle_person`, `person_raw`, `talent_*` | Yes |
| Warm-network engagement | digest/re-engagement delivery records, draft edits, moat-loop events | Users | Legitimate interest | Life of account | `delivery_log`, `draft_edits`, `compounding_events`, `push_subscriptions` | **No - gap above** |
| Credits / pay-per-use enrichment | purchase + spend history | Paying users | Contract | Life of account | `credit_balance`, `credit_ledger` | **No - gap above** |
| Legacy (retired "Circle CRM" generation, no longer written to by the app; not yet deleted) | voice transcripts, idea text, client names, amounts | Users | Contract | Life of account | `ideas`, `activity_logs`, `matches`, `moves`, `clients`, `revenue_entries`, `streams`, `ledger_entries` | Yes |
| Connected mail/calendar | OAuth tokens, contacts, message metadata | Users who connect | Consent | Until disconnect / erasure | `oauth_tokens`, `sources` | Yes |
| Consent records | consent choices, IP, timestamp | Users | Legal obligation | 7 years | `user_consents` | Yes (retained record) |
| Security audit | actions, IP, timestamp | Users | Legal obligation / legitimate interest | 7 years | `security_audit_log` | Yes (retained record) |
| Product analytics | behaviour events, session data | Users | Legitimate interest | 90 days (auto-purged) | `user_behavior_logs`, `user_sessions` | Yes |
| Billing | name, email, payment metadata | Paying users | Contract | Per Stripe / tax law | Stripe, `subscriptions` | Yes |
| Marketing attribution | UTM, anonymous id | Visitors | Legitimate interest / consent | Life of account | `user_attribution` | Yes |

## Special category data
None intended. **No health, biometric, or PHI data is processed** (HIPAA out of scope).

## Third-party processing of contact data - note
Circle stores personal data about the user's *network* (third parties who are not Circle users). The lawful basis is the user's legitimate interest in managing their professional relationships; contacts are not marketed to by Circle. This must be disclosed in the privacy policy and is erasable on request.

## International transfers
Production data resides in AWS `us-east-1` (USA). EU transfers rely on SCCs - confirm with counsel.

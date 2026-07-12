# Records of Processing Activities (RoPA) - GDPR Art. 30

**Last reviewed:** 2026-07-12. **Status: DRAFT - for counsel review.** Derived from the live data model.

**Known gap:** the authoritative machine list of user-owned tables, `_dsar_user_tables()` in migration
`20260602000002_compliance_hardening.sql`, has not been updated since 2026-06-02 and is missing seven
tables added since (see "Plan / the read" and "Credits" rows below, plus `draft_edits`, `delivery_log`,
`compounding_events`). Export/erasure do not currently reach these tables - this is a code fix, not
just a documentation one. See `COMPLIANCE.md`.

**Controller:** fractionl (Circle). **Contact:** privacy@fractionl.ai

## Processing activities

| Activity | Personal data | Data subjects | Lawful basis | Retention | Where |
|---|---|---|---|---|---|
| Account & auth | email, name, avatar, auth identifiers | Users | Contract | Life of account | `user_profiles`, Supabase Auth |
| Plan / the read | voice transcripts, goal/offer text, market-research results | Users | Contract | Life of account | `the_read`, `thesis_runs`, `thesis_answers` |
| Reach-out drafts & voice model | AI-drafted messages, user's edited/sent versions | Users | Contract | Life of account | `draft_edits` |
| Network / Circle | **third-party** names, emails, phones, LinkedIn, company, title, and vector embeddings of profile text (for semantic search) | Users' contacts | Legitimate interest | Life of account / until erased | `circle_person`, `person_raw`, `talent_*` |
| Credits & paid enrichment | credit balance, ledger of paid deep-research enrichments | Paying users | Contract | Life of account | `credit_balance`, `credit_ledger` |
| Connected mail/calendar | OAuth tokens, contacts, message metadata | Users who connect | Consent | Until disconnect / erasure | `oauth_tokens`, `sources` |
| Consent records | consent choices, IP, timestamp | Users | Legal obligation | 7 years | `user_consents` |
| Security audit | actions, IP, timestamp | Users | Legal obligation / legitimate interest | 7 years | `security_audit_log` |
| Product analytics | behaviour events, session data | Users | Legitimate interest | 90 days (auto-purged) | `user_behavior_logs`, `user_sessions` |
| Billing | name, email, payment metadata | Paying users | Contract | Per Stripe / tax law | Stripe, `subscriptions` |
| Marketing attribution | UTM, anonymous id | Visitors | Legitimate interest / consent | Life of account | `user_attribution` |
| **Legacy, largely dormant** - retained from the retired Ideas/Matches/Moves/Streams generation (removed from the product surface 2026-06-29); tables still exist and are not yet dropped | idea text, client names, amounts | Users | Contract | Life of account | `ideas`, `matches`, `moves`, `streams`, `clients`, `revenue_entries`, `ledger_entries`, `activity_logs` |

## Special category data
None intended. **No health, biometric, or PHI data is processed** (HIPAA out of scope).

## Third-party processing of contact data - note
Circle stores personal data about the user's *network* (third parties who are not Circle users). The lawful basis is the user's legitimate interest in managing their professional relationships; contacts are not marketed to by Circle. This must be disclosed in the privacy policy and is erasable on request.

## International transfers
Production data resides in AWS `us-east-1` (USA). EU transfers rely on SCCs - confirm with counsel.

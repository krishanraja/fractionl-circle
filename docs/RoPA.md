# Records of Processing Activities (RoPA) - GDPR Art. 30

**Last reviewed:** 2026-07-19. **Status: DRAFT - for counsel review.** Derived from the live data model. The authoritative machine list of user-owned tables is `_dsar_user_tables()` in migration `20260602000002_compliance_hardening.sql`.

**Controller:** fractionl (Circle). **Contact:** privacy@fractionl.ai

> **Correction (2026-07-19):** the previous version of this table described the retired
> "Circle CRM" generation (`ideas`, `matches`, `moves`, `clients`, `streams`). That product was
> removed on 2026-06-29. The rows below reflect the current Plan + Circle product; see
> `docs/PRODUCT.md` for what each surface does.

## Processing activities

| Activity | Personal data | Data subjects | Lawful basis | Retention | Where |
|---|---|---|---|---|---|
| Account & auth | email, name, avatar, auth identifiers | Users | Contract | Life of account | `user_profiles`, Supabase Auth |
| The Plan read (idea capture, market research, coach decisions) | the user's typed/voiced background, their offer/idea, banked coach decisions; sent to Perplexity + a provider-fallback LLM for research and structuring | Users | Contract | Life of account | `thesis_runs`, `thesis_answers`, `thesis_inspiration` |
| Network / Circle | **third-party** names, emails, phones, LinkedIn, company, title, notes; embedded as vectors for semantic search (sent to OpenAI) | Users' contacts | Legitimate interest | Life of account / until erased | `circle_person`, `person_raw` |
| Contact enrichment | third-party name/company/title matched against Apollo/Clearbit public professional data | Users' contacts | Legitimate interest | Life of account / until erased | `circle_person` (enrichment fields) |
| Screenshot/vision contact capture | screenshot image content (profile or business card), sent to Anthropic/OpenAI/Google (via Lovable gateway) for extraction; image itself is not persisted | Users' contacts | Legitimate interest | Extracted fields only; image not retained | `circle_person`, `person_raw` |
| Credits & billing | credit balance, grant/spend/refund history | Paying users | Contract | Life of account | `credit_balance`, `credit_ledger` |
| Connected mail/calendar | OAuth tokens, contacts, calendar metadata | Users who connect | Consent | Until disconnect / erasure | `oauth_tokens`, `sources` |
| Consent records | consent choices, IP, timestamp | Users | Legal obligation | 7 years | `user_consents` |
| Security audit | actions, IP, timestamp | Users | Legal obligation / legitimate interest | 7 years | `security_audit_log` |
| Product analytics | behaviour events, session data | Users | Legitimate interest | 90 days (auto-purged) | `user_behavior_logs`, `user_sessions` |
| Billing (subscriptions) | name, email, payment metadata | Paying users | Contract | Per Stripe / tax law | Stripe, `subscriptions` |
| Outbound delivery | send status for the warm digest / re-engagement / brief emails and push | Users | Contract | Life of account | `delivery_log` |
| Marketing attribution | UTM, anonymous id | Visitors | Legitimate interest / consent | Life of account | `user_attribution` |

## Special category data
None intended. **No health, biometric, or PHI data is processed** (HIPAA out of scope).

## Third-party processing of contact data - note
Circle stores personal data about the user's *network* (third parties who are not Circle users). The lawful basis is the user's legitimate interest in managing their professional relationships; contacts are not marketed to by Circle. This must be disclosed in the privacy policy and is erasable on request.

## International transfers
Production data resides in AWS `us-east-1` (USA). EU transfers rely on SCCs - confirm with counsel.

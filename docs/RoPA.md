# Records of Processing Activities (RoPA) - GDPR Art. 30

**Last reviewed:** 2026-08-09. **Status: DRAFT - for counsel review.** Derived from the live data model
(the Plan + Circle product; see `docs/PRODUCT.md`). Rewritten this pass because the prior version
(reviewed 2026-06-02) described the "Circle CRM" generation - `ideas`, `matches`, `moves`, `streams`,
`clients`, `talent_*` - which was retired 2026-06-29 and is no longer read or written by any live code
path. Those tables still physically exist (nothing was dropped) but hold no active processing; see
"Legacy tables" below.

**Controller:** fractionl (Circle). **Contact:** privacy@fractionl.ai

> **Known gap, not resolved by this pass (flagged for counsel/eng, not fixed here - this is a docs-only
> review):** the "authoritative machine list" this document used to point to, `_dsar_user_tables()` in
> migration `20260602000002_compliance_hardening.sql`, has not been updated since 2026-06-02 either. It
> is missing every table added after that date that holds user-entered personal data - `thesis_runs`,
> `thesis_answers`, `thesis_inspiration`, `credit_balance`, `credit_ledger`, `compounding_events`,
> `draft_edits`, `delivery_log` - which means `export_user_data()` / `erase_user_data()` do **not**
> currently cover a user's plan history, banked coach decisions, admired-business inputs, credit
> ledger, or draft-edit history. This is a real gap between the DSAR tooling and the current schema,
> not just a documentation gap, and needs an engineering fix (extend `_dsar_user_tables()`), not a
> doc edit.

## Processing activities

| Activity | Personal data | Data subjects | Lawful basis | Retention | Where |
|---|---|---|---|---|---|
| Account & auth | email, name, avatar, auth identifiers, LinkedIn URL | Users | Contract | Life of account | `user_profiles`, Supabase Auth |
| The read / plan (Plan tab) | the user's offer/idea text, background, onboarding transcript, admired-business screenshots + why-admired answers, coach decisions and outcomes | Users | Contract | Life of account | `thesis_runs`, `thesis_answers`, `thesis_inspiration`, `compounding_events` |
| Network / Circle | **third-party** names, emails, phones, LinkedIn/social handles, company, title, notes, dossier text, semantic-search embeddings | Users' contacts | Legitimate interest | Life of account / until erased | `circle_person`, `person_raw`, `sources`, `signals` |
| Warm-reach drafts | AI-drafted and user-edited outreach text, send/interaction timestamps | Users (drafts reference their contacts) | Contract | Life of account | `draft_edits`, `delivery_log` |
| Connected mail/calendar | OAuth tokens (stored **unencrypted** at the application layer - see `SECURITY.md`), contacts, calendar event metadata | Users who connect | Consent | Until disconnect / erasure | `oauth_tokens`, `sources` |
| Push notifications | push subscription endpoints/keys | Users who opt in | Consent | Until unsubscribe / erasure | `push_subscriptions` |
| Consent records | consent choices, IP, timestamp | Users | Legal obligation | 7 years | `user_consents` |
| Security audit | actions, IP, timestamp | Users | Legal obligation / legitimate interest | 7 years | `security_audit_log` |
| Product analytics | behaviour events, session data | Users | Legitimate interest | 90 days (auto-purged) | `user_behavior_logs`, `user_sessions`, `feature_usage`, `usage_tracking` |
| Billing & credits | name, email, payment metadata, credit balance/ledger | Paying users | Contract | Per Stripe / tax law | Stripe, `subscriptions`, `processed_stripe_events`, `credit_balance`, `credit_ledger` |
| Marketing attribution | UTM/campaign params, anonymous id, and - as of the `track-event` function added 2026-08-04 - anonymous pre-signup `landed` events forwarded server-side to the Mindmaker OS warehouse | Visitors and users | Legitimate interest / consent | Life of account (per-user); warehouse retention is outside this repo's control - confirm with the OS owner | `user_attribution`; the `landed` event itself is emitted, not stored locally |

## Special category data
None intended. **No health, biometric, or PHI data is processed** (HIPAA out of scope).

## Third-party processing of contact data - note
Fractionl stores personal data about the user's *network* (third parties who are not Fractionl users),
including AI-generated embeddings and dossier summaries of that network for semantic search. The lawful
basis is the user's legitimate interest in managing their professional relationships; contacts are not
marketed to by Fractionl. This must be disclosed in the privacy policy and is erasable on request -
subject to the DSAR-coverage gap flagged above.

## Legacy tables (no active processing)
The following tables from two earlier, retired product generations still exist in the schema (nothing
has been dropped) but are not read or written by any current code path: `ideas`, `matches`, `moves`,
`move_edits`, `streams`, `sunday_letters`, `clients`, `opportunities`, `activity_logs`,
`revenue_entries`, `monthly_goals`, `daily_progress`, `weekly_summaries`, `talent_*` (six tables),
`skills`, `reminders`, `ledger_entries`, `decision_ledger`, `the_read`, `comparable_cohort`,
`user_business_context` (superseded by the profile envelope), and a set of unrelated generic-template
tables (`customer_journey_tracking`, `lead_scoring`, `sheets_integrations`, `spreadsheet_sync`, etc.)
that predate this product entirely. `concierge_requests` and its edge function
(`notify-concierge-event`) supported the white-glove onboarding perk of the now-retired $79 tier and
should be re-verified as live or legacy the next time this document is reviewed. None of these are
processing activities today, but any rows they still hold are personal data at rest and are in scope
for a full data-retention/deletion sweep - flagged for owner decision, not resolved here.

## International transfers
Production data resides in AWS `us-east-1` (USA). EU transfers rely on SCCs - confirm with counsel.

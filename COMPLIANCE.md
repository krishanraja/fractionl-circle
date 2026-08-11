# Circle - Compliance Posture

**Last reviewed:** 2026-08-10
**Status:** Honest, current-state. This document describes controls that are *actually implemented*. It does not claim certifications Circle does not hold. Do not market any framework as "certified" or "compliant" unless this document and an auditor/lawyer say so.

---

## TL;DR - what is and isn't true today

| Framework | Honest status | What it would take to claim more |
|---|---|---|
| **GDPR** | Technical access, export, and erasure discover every live public table with erasable `user_id` data after migration `20260811014533_extend_dsar_coverage.sql`; consent and audit logging exist. Legal documents remain drafts pending counsel. | Verify the migration in each environment, then complete counsel review, DPAs, appointed contact, and breach-notification process. |
| **CCPA/CPRA** | Same technical rights satisfy access/deletion/opt-out. | Published "Do Not Sell/Share" notice + privacy policy (Circle does not sell data). |
| **SOC 2 (Type II)** | A subset of Trust Services Criteria controls are implemented (access control, encryption in transit, audit logging, change management via PRs). **Not audited. Not certified.** | An independent CPA audit over a 6–12 month observation window, written policies, security training, evidence collection (Vanta/Drata/Secureframe). |
| **ISO 27001** | Several Annex A controls map to existing practice. **No ISMS. Not certified.** | A documented ISMS + Stage 1/2 audit by an accredited certification body. |
| **HIPAA** | **Out of scope - Circle does not process Protected Health Information (PHI).** | Only relevant if a health pivot occurs; would require BAAs with every subprocessor (Supabase paid plan + BAA, OpenAI, Resend…), and is a separate program. Do **not** claim HIPAA. |

> The hard truth: ~70% of SOC 2 / ISO / GDPR / CCPA is organizational and legal (policies, audits, vendor agreements, training) and cannot be satisfied in code. This repo covers the **technical control** layer and produces evidence; certification requires an auditor and counsel.

---

## Implemented technical controls

### Access control
- Row-Level Security enabled on **all** public tables. Service-only tables (`oauth_tokens`, `oauth_states`, `processed_stripe_events`, `rate_limits`) are deny-all to clients by design.
- Supabase Auth with TOTP MFA available, refresh-token rotation on, HIBP leaked-password protection on.
- Edge functions take user identity from the verified JWT, never the request body.
- Session hygiene: a 30-minute inactivity auto-logout (`SessionManager.tsx`) is the default. Users may opt into "Keep me signed in on this device" at sign-in (`src/lib/rememberMe.ts`), which disables the idle logout on that device only; the default (auto-logout on) stands for anyone who does not opt in.

### Data subject rights (GDPR Art. 15 / 17 / 20)
- `export_user_data(uuid)` - complete JSON export across the full user-owned surface + profile. Self-only.
- `erase_user_data(uuid)` - deletes every user-owned row across the full surface, anonymises the profile, retains only the three legal-obligation records (`data_subject_requests`, `security_audit_log`, `user_consents`).
- `delete-account` edge function - runs erasure **and** removes the auth identity, server-side.
- Coverage is driven by `_dsar_user_tables()`. The 2026-08-10 migration discovers every live public base table with a `user_id` column and excludes only the three documented legal-hold tables. This prevents schema-history drift and covers future user-owned tables by default. See `docs/RoPA.md`.

### Encryption
- In transit: TLS enforced (HSTS preload header). At rest: Supabase/AWS volume encryption.
- **Open item:** OAuth access/refresh tokens are stored unencrypted at the application layer. Tracked as the top remaining hardening item (`oauth_tokens` currently holds 0 rows). Plan: AES-GCM application-layer encryption with a key in Supabase Vault.

### Audit logging & retention
- `security_audit_log` (7-yr legal hold), `user_consents` (7-yr), `data_subject_requests` (7-yr).
- `enforce_data_retention()` + daily cron purges short-lived analytics (`user_behavior_logs`, `user_sessions` at 90 days) per `data_retention_policies`; never touches legal-obligation holds.

### Application security
- HTTP security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) - see `vercel.json`.
- Stripe webhooks signature-verified with an idempotency ledger.
- Change management: all changes via pull request + typecheck/build verification.

---

## Owner action required (not codeable)
1. Engage counsel to finalise `docs/privacy-policy.md` and a customer DPA.
2. If pursuing SOC 2 / ISO: adopt a compliance-automation platform and schedule an audit.
3. Sign/obtain DPAs with every subprocessor in `SUBPROCESSORS.md`.
4. Rotate any credentials shared in plaintext through the authoritative provider surfaces; enable Supabase PITR for the production project.

# Security Policy - Circle

## Reporting a vulnerability
Email **security@fractionl.ai**. Please include steps to reproduce and impact. We aim to acknowledge within 2 business days. Do not publicly disclose before we've had a chance to remediate. See also `/.well-known/security.txt`.

## Supported surface
- Web app: `circle.fractionl.ai` (Vercel)
- API: Supabase edge functions + Postgres (project `ksyuwacuigshvcyptlhe`)

## Security controls (summary)
- **Auth:** Supabase Auth, TOTP MFA available, refresh-token rotation, HIBP leaked-password protection.
- **Authorization:** Row-Level Security on all tables; edge functions derive identity from the verified JWT only.
- **Transport:** TLS enforced; HSTS with preload.
- **Headers:** CSP, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy (`vercel.json`).
- **Payments:** Stripe webhooks are signature-verified and idempotent.
- **Privacy:** data export & erasure (`export_user_data` / `erase_user_data` / `delete-account`); retention enforcement cron. Known coverage gap on newer tables - see `COMPLIANCE.md`.
- **Change management:** all changes via pull request with typecheck + build gates.

## Known hardening items (tracked, not yet shipped)
1. **Encrypt OAuth tokens at rest** (application-layer AES-GCM, key in Supabase Vault). `oauth_tokens` currently holds 0 rows.
2. Raise password minimum length to ≥ 8 and require reauthentication on password change.
3. Enable Point-in-Time Recovery (PITR) on the production database.
4. **Close the DSAR coverage gap** - `_dsar_user_tables()` has not been updated since 2026-06-02 and is missing seven tables added since (`thesis_runs`, `thesis_answers`, `credit_balance`, `credit_ledger`, `draft_edits`, `delivery_log`, `compounding_events`). See `COMPLIANCE.md`.

## Out of scope
- **HIPAA:** Circle does not process Protected Health Information. It is not a HIPAA-covered system. Do not represent it as HIPAA compliant.

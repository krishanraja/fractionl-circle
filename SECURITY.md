# Security Policy - Circle

Last reviewed: 2026-09-06.

## Reporting a vulnerability

Email **security@fractionl.ai** with steps to reproduce and likely impact. We aim to acknowledge a report within two business days. Do not disclose publicly before the team has had a reasonable chance to remediate. See `/.well-known/security.txt` when available.

## Supported surface

- Web app: `circle.fractionl.ai` on Vercel
- API and data: Supabase Edge Functions and Postgres, project `ksyuwacuigshvcyptlhe`

## Current controls

- Authentication: Supabase Auth, refresh-token rotation, leaked-password protection, and TOTP MFA where enabled.
- Authorization: row-level security on public data tables; Edge Functions derive identity from verified JWTs rather than request-body user IDs.
- Transport: TLS and HSTS.
- Browser: CSP, frame denial, content-type protection, referrer policy, and permissions policy in `vercel.json`.
- Payments: Stripe webhook signature verification and idempotency ledger.
- Privacy: export and erasure discover every erasable public `user_id` table after migration `20260811014533_extend_dsar_coverage.sql`; `delete-account` also removes the auth identity.
- Sessions: 30-minute inactivity sign-out by default, with an explicit keep-signed-in choice on the device.
- Change management: source changes move through a branch, checks, preview, and verified production revision.

## Known hardening work

1. Encrypt OAuth access and refresh tokens at the application layer with a key held outside the database rows.
2. Remove unused Gmail OAuth scopes or document, verify, and obtain review for the intended Gmail feature.
3. Require at least an eight-character password and reauthentication for sensitive account changes.
4. Enable Point-in-Time Recovery for the production database.
5. Keep legal documents, DPAs, provider retention settings, and breach procedures current with counsel.
6. Drop or repair the orphaned `get_user_google_tokens`, `verify_token_integrity`, and `log_token_access` functions. Production schema lint reports that they still reference `sheets_integrations`, which was intentionally removed by the 2026-03-07 cleanup migration. Active Circle source does not call them.

## Credential exposure

Treat any credential pasted into chat, logs, documents, source, screenshots, or shell history as exposed. Do not reuse or move it. Revoke and replace it through the authoritative provider surface, update known consumers through secure configuration, verify the old value fails, and scan the repository without printing matches.

## Out of scope

Circle is not designed to process Protected Health Information and is not represented as HIPAA compliant. SOC 2 and ISO 27001 controls are not certifications; only an independent audit can support those claims.

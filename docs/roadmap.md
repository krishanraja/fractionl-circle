# Circle by Fractionl — Roadmap

The 90-day plan (Phases 1–11) is shipped. The April 2026 audit (`AUDIT_2026-04-24.md`) shipped 13 of 14 findings via PR #46 (merged 2026-04-26). This file is the honest state of what's done, what's deferred, and roughly what each open item costs.

Ordering is by **leverage-per-effort**, not by chronological lineup.

---

## Currently in production (the active surface)

### Phase-1 ontology (the data model)
Sources → Person → Idea × Person → Match → Move → Stream. Replaces the legacy clients / opportunities / activity_logs CRM model. Migration `20260418000001_redesign_phase_1_ontology.sql`. See [DOCS.md § Phase-1 ontology](../DOCS.md#7-the-phase-1-ontology).

### Voice onboarding (FirstVoice)
90-second hold-to-talk → Whisper transcription → gpt-4o-mini extracts 3 sellable Ideas. The first artefact a user sees in <2 minutes. `src/components/onboarding/FirstVoice.tsx`.

### The Match Engine
Cross-references active Ideas × Circle people overnight. Drafts the Move alongside the Match. Edit-distance logging on send. Manual + cron triggers. `_shared/matchEngineCore.ts`.

### Sunday Letter
Weekly narrative with stats sidebar. Text on Operator+, 90-second TTS audio on Chief of Staff. Generation-source tracking in column. Cron + manual triggers. `_shared/sundayLetterCore.ts`.

### Multi-source Circle ingest
- LinkedIn CSV (`LinkedInCsvDrop`).
- Generic CRM CSV with HubSpot / Attio / Folk auto-detection (`CrmCsvDrop` + `src/lib/crmCsv.ts`).
- Voice seed (`VoiceSeedCapture` + `parse-voice-seed`).
- Google Contacts + Calendar (`oauth-google-*`, `sync-google`, `cron-sync-google`).
- Microsoft Contacts + Calendar (`oauth-microsoft-*`, `sync-microsoft`, `cron-sync-microsoft`).
- Browser extension capture (`extension/` + `extension-ingest`).
- Screenshot capture — Android share target + iOS Apple Shortcut (`parse-screenshot`).

### LLM-assisted Circle dedupe (Operator+)
`useCircleDedupe`, `DedupeReviewSheet`, `dedupe-circle` edge function. Score-based candidates with LLM tiebreaker.

### Concierge (Chief of Staff)
Real-human onboarding for Chief-of-Staff users. `concierge_requests` table, `ConciergeCard` on Today, `notify-concierge-event` Slack/Resend ops alerts, `scripts/concierge-inbox.mjs` CLI for the queue.

### Stripe billing
Checkout + Customer Portal + signature-verified webhook + tier sync. `stripe-checkout`, `stripe-portal`, `stripe-webhook`. Tier catalogue in `src/lib/tiers.ts` (Freemium / Operator / Chief of Staff at $0 / $30 / $79).

### Compliance surface
ConsentBanner, PrivacySettings, SessionManager. `useConsent` syncs local consent flags on auth. Data export + deletion paths in `useDataPrivacy`. Full DSAR erasure path via `delete-account` edge function (PR #54, 2026-06-02).

### P1 — Borrowed-conviction identity first-run (shipped 2026-06-03)
`IdentityFirstRun.tsx`: Welcome → Talk (90s voice) → Proposal (editable offer/ICP/warm doors) → First Move. Default ON via `VITE_IDENTITY_FIRSTRUN_ENABLED`. `extract-identity` edge function proposes identity statement + offer + ICP from what the user ran and why they left. Identity columns on `user_profiles` (migration `20260603120000`): `motivation_type`, `journey_stage`, `offer_maturity`, `identity_statement`, `first_run_transcript`.

### Dual-role match engine (shipped 2026-06-02)
`ideas.pain` column is the keystone seed: the specific expensive pain the offer removes. `matches.role` (buyer / amplifier / sharpener) routes the drafted Move's framing. Migration `20260602000001_dual_role_matches.sql`.

### Won → Stream write path (shipped 2026-06-03)
`log-win` edge function: marks a match `won`, resolves or creates the Stream for the originating Idea, writes the first ledger entry. The only place a Stream is born from a won match. `StreamsScreen` now shows earned-vs-target with per-stream revenue logging.

### Anonymous live-mic demo at /try (shipped 2026-06-06)
`TryDemo.tsx` at route `/try`. Calls `demo-extract` edge function (no JWT, IP rate-limited 3/hour). No auth, no DB writes. The conversion hook for logged-out visitors.

### Archivo Expanded display face (shipped 2026-06-06)
GoBold replaced with self-hosted Archivo Variable (Expanded cut). SIL OFL — free for commercial use. File at `public/fonts/archivo-variable.woff2`.

### Audit-clean (April 2026)
- TypeScript strict mode on (audit H1).
- All 14 LLM call sites have explicit `AbortSignal.timeout` (C3).
- `generate-user-insights` is auth-gated with body-id validation (C1).
- `send-sms` uses origin-allowlist CORS (C4).
- Sunday Letter output is Zod-validated, length-capped, generation-source tagged (C2).
- Durable per-user `rate_limits` table replaces in-memory map (H4).
- `npm audit fix` ran — 14 of 18 vulns resolved (H2).
- ESLint `no-unused-vars` enforced and cleaned (M1).
- `.env.example` regenerated from code references (M2).
- DOCS.md regenerated to match shipped state (M3) — this file.
- Central error telemetry sink + `window` error/unhandledrejection listeners (M5).
- Form labels associated with inputs (M8).
- Single lockfile (`bun.lockb` removed) (H5).

---

## Open audit follow-ups (deferred from PR #46)

These are the items the audit flagged that did **not** ship in PR #46. They are not blockers; they are next-sprint sized.

### H3 — Adopt `react-hook-form` + `@tanstack/react-query` consistently
Both are installed. `QueryClientProvider` is mounted. Adoption across forms is partial — most forms still hand-roll `useState` + direct `supabase.functions.invoke`. Migration is large but mechanical: `AuthPage`, `FirstVoice`, `ConciergeBookingSheet`, `MatchCard`, `ProfileSettingsSheet`. **Effort:** 1–2 sessions for full migration. Reuse existing `src/components/ui/form.tsx` scaffolding.

### H6 — OAuth PKCE
Current state: double-`crypto.randomUUID()` state + TTL + single-use deletion at callback. Sufficient for confidential web clients. Required if we ever ship a native or extension-hosted OAuth flow. **Effort:** half-session per provider. Add `code_challenge` (S256) on start, persist `code_verifier` alongside state, send on token exchange.

### H7 — `parse-screenshot` error-body redaction
Current: `throw new Error(\`Anthropic error: ${res.status} ${text.slice(0, 300)}\`)` — that body slice can leak echoed prompt fragments into edge logs. **Effort:** 15-minute fix. Log status + request-id only.

### M4 — `resolve-contact` N+1
`resolve-contact/index.ts:280–285` loops awaiting per-item `talent_contact_identities` queries. **Effort:** 30 minutes. Single `.in('<col>', ids)` query.

### M6 / M7 / M9 — UI polish
- M6: ~20 raw HTML form elements (`<button>`, `<textarea>`) bypass shadcn primitives. Migrate to `Button` / `Textarea`.
- M7: `Skeleton` component exists but is unused — add list-shaped skeletons to TodayScreen / CircleScreen / StreamsScreen / AskScreen instead of the generic `PageLoader`.
- M9: Icon-only buttons missing `aria-label` (~30 sites). One sweep.

**Effort:** one session for M6+M7+M9 together.

### M10 — Surface generation source in UI
Sunday Letter `generation_source` is now persisted (the schema landed in PR #46). Surface it in admin / debug for monitoring drift. **Effort:** 30 minutes if the admin surface exists; otherwise rolled into a future admin pass.

### L1 — Bundle visualizer
Main chunk is 903 KB. Add `rollup-plugin-visualizer` to confirm where the weight is. AskScreen and StreamsScreen ship suspiciously small (1.1 KB each), suggesting most of their code is in the main bundle. **Effort:** 30 minutes setup, 1–2 sessions to act on results.

### L2 / L3 / L5 / L6 — Design-system polish
- L2: 4 hardcoded hex colors in `App.css` + one component default — move to tokens.
- L3: ~20 arbitrary Tailwind dimensions (`text-[10px]` etc.) — extend theme with `text-micro` / `text-tiny` tokens.
- L5: `lovable-tagger@1.1.7` — verify necessity, remove if unused.
- L6: 153 `motion.*` instances — moderate at current scale. Revisit if LCP regresses.

**Effort:** half-session in aggregate.

---

## New surfaces & features (not from the audit)

### Voice-first command surface (`AskScreen`) — SHIPPED
`AskScreen` now has full voice implementation: hold-to-talk → Whisper transcription → `extract-ideas` → Idea cards rendered in place → "Find who this is for" triggers `run-match-engine`. Type fallback available. Resolves fully in-screen; never bounces to Today as a static card. Ask-with-memory (Operator-tier, using `ai_conversations` tables) is the next extension.

### Per-category auto-send opt-in (Chief of Staff)
The Chief of Staff tier promises per-category auto-send (e.g. `congrats_promotion`, `congrats_job_change`). Schema needed: `move_category` enum, `autosend_consents` table, worker that dispatches approved-and-consented Moves.

**Effort:** one session — but UX scoping comes first. Decide:
- Which categories are auto-send candidates on launch? (Promotion / job-change are obvious starters; fundraise + anniversary are likely.)
- Per-category-only, or per-category × per-contact?
- Auto-send straight, or undo banner?

### External signal feeds (Chief of Staff)
**RFP scraper** — SAM.gov is the cheapest start. **News per named contact** — Google News RSS. **Tweet / X monitoring** — X API is now $100/mo minimum; small-scale RSS bridges are the realistic path early.

Each is a cron-fired edge function writing `signals` rows that the Match Engine already consumes. **Effort:** one session per feed.

### Cross-user market intelligence (Chief of Staff)
Aggregated signal → outcome patterns surfaced in the Sunday Letter ("Offers shaped like yours are converting at 22% in Series B SaaS this quarter"). Requires real volume; shipping it before we have it is worse than not shipping it.

**Gate:** revisit when paying-user count > 200 OR when 90 days of Match + Move data exists.

### External enrichment — PDL / Clay / Apollo on consent
Per-user consent + per-provider edge function + UI toggle. **Effort:** half-session per provider. **Gotcha:** none have a free tier worth testing at scale; budget $10–$50 per provider for ingest-quality tuning.

### Social data-export parsers (Instagram / Facebook / X)
Same shape as `crmCsv.ts`, format-tuned. ZIP parsing into a new `ingestSocialExport` helper. **Effort:** half-session total.

### Direct CRM OAuth importers (vs. CSV)
Only worth it for users who can't export clean CSVs. HubSpot is the most demanded; Attio is API-key auth (simpler). **Effort:** one session per target.

### Chrome Web Store submission
Not code — listing copy, 3–5 screenshots at 1280×800, 128×128 branded icon, public privacy policy URL, $5 one-time dev fee. **Effort:** 1–2 hours of writing + 1–2 weeks of Google review.

### Cal.com / Calendly deep integration
Already shipped: ops drops a booking URL, user clicks. Deep = embedded scheduler in `ConciergeCard` + webhook-driven `BOOKING_CREATED` → `concierge_requests.status = 'scheduled'`. Obsoletes the manual `schedule` CLI command. **Effort:** half-session.

### Slack interactivity for concierge ops
Buttons in the Slack notification to schedule / start / deliver without leaving the channel. **Effort:** half-session — only when ops asks.

### Per-user email digests
Resend-driven "Your concierge delivered: ..." email for users who don't open the app daily. **Effort:** half-session.

---

## How to pick the next session

Read the signal from paying users:

| Signal from users | Ship next |
|---|---|
| **"My Circle isn't rich enough"** | Social-export parsers + PDL enrichment (half-day each) |
| **"The Sunday Letter is thin"** | Cross-user market intel (gated on user-count) OR the edit-distance-trained personalization model |
| **"I want auto-send for the easy ones"** | Per-category auto-send |
| **"I can't show this without a real Chrome listing"** | Chrome Web Store submission |
| **"Ops is buried in concierge coordination"** | Cal.com deep integration + Slack interactivity |
| **"The forms feel inconsistent"** | Audit H3 — finish react-hook-form + TanStack Query migration |
| **"I want to share Circle with my EA"** | Team mode (out of scope for current architecture; needs a real spec) |

---

## Truly out-of-scope for now

- **iOS / Android native shells.** PWA + share target + Apple Shortcut cover ~95% of mobile value.
- **Firefox / Safari extension variants.** Chrome / Arc are the install base.
- **Whitelabel / multi-tenant.** Single-product, single-brand.
- **Team seats beyond the EA add-on** mentioned in pricing.
- **Salesforce / Pipedrive direct integrations.** Wrong ICP.

---

## Operational ledger

- **Last full audit:** 2026-04-24 (`AUDIT_2026-04-24.md`).
- **Audit remediation merged:** 2026-04-26 (PR #46 — `audit/post-audit-fixes`).
- **Next recommended audit:** 2026-08-01, or immediately after the next major surface ships. P0–P3 shipped since the last audit; an audit pass of the new surfaces (IdentityFirstRun, extract-identity, log-win, AskScreen voice path, dual-role engine) is overdue.
- **Migration drift:** known, untouched. Don't run `supabase db push` blindly. Apply targeted migrations via the Management API.
- **Token rotation pending:** `sbp_d44...` Supabase access token shared in chat plaintext during audit-deploy work — treat as compromised, rotate at first opportunity.

Nothing here blocks a real launch. The 90-day plan is complete; the audit is clean; P0–P3 rebuild (identity first-run, dual-role match engine, actionable Streams, Archivo Expanded type system, desktop sidebar, /try demo) shipped 2026-06-03 through 2026-06-07. The runway is sales and signal.

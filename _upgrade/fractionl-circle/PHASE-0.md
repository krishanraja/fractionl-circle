# Circle by Fractionl, Phase 0: Sync + Recon (verified)

Date: 2026-05-30. No code changes. Read-only recon per Master Prompt Section 7.
Verification: multi-agent deep-read of the repo at HEAD `ffda624` (PR #52), cross-checked against the LIVE Supabase project `ksyuwacuigshvcyptlhe` (Management API, read-only SQL) and the LIVE Vercel project `prj_UGoTFYAQ3CL1NBctWYIvSY4LETnh`, plus 5 adversarial verifiers tasked with refuting the load-bearing claims. This supersedes the earlier draft of this file and corrects several of its statements.

## SETUP verification
- Repo present at `C:\Users\krish\MindmakerOS-Apps\fractionl-circle`. Remote `krishanraja/fractionl-circle`, branch `main`, clean (only untracked `_upgrade/`), synced with `origin/main` (0/0). HEAD `ffda624` = Merge PR #52. 267 commits.
- Baseline (verified, not assumed): `tsc -p tsconfig.app.json --noEmit` clean (exit 0). `vite build` GREEN in 6.74s (emits the known ">500 kB chunk" warning, main chunk 918,799 bytes). `npm run lint` is RED: ESLint 9.39.4 crashes loading `@typescript-eslint/no-unused-expressions` (`Cannot read properties of undefined (reading 'allowShortCircuit')`), an `eslint` vs `typescript-eslint` version incompatibility from unpinned deps. The lint gate fails on a clean checkout.
- Access verified live: Vercel API (project + domains + deployments), Supabase Management API (SQL + functions list). GitHub push via PAT in remote.

## Section 3 row, confirmed with corrections
| Field | Master Prompt | Reality (verified) |
|---|---|---|
| Live URL | `fractionl.com` | WRONG. Production app domain is `circle.fractionl.ai` (Vercel: verified=true, READY/PROMOTED, commit ffda624). `fractionl.com` is the company site (correct usage in README only). |
| What it is | Relationship-to-revenue engine, Ideas x People, Sunday Letter | Confirmed. |
| ICP | Fractional CMO/CFO/CTO, advisors, portfolio operators | Confirmed (DOCS.md:101-128). |
| Magic moment | Talk 90s, extract Ideas, match overnight, draft Move while you sleep | Built but NOT literally delivered on first run (see Headline 2). |
| Stack | Vite SPA + PWA + browser extension | Confirmed. React 18.3.1 strict, Vite 5.4.1, Node 24.x on Vercel. |
| Stripe | fractionl_ai | Confirmed (`rk_live_51TELoi...`, key read from env, not hardcoded). |

## Live infrastructure (ground truth, not migration-derived)
- Supabase schemas: NO `attribution` schema exists. Only auth/cron/extensions/graphql/net/public/realtime/storage/supabase_migrations/vault.
- Public tables: exactly 51 base tables, `relrowsecurity=true` on ALL 51. Zero tables without RLS. 115 policies in `public`.
- RLS nuance the prior draft missed: 3 tables are RLS-on with ZERO policies by design (deny-all, service-role only): `oauth_tokens`, `oauth_states`, `rate_limits`. This is the secure pattern, not a leak. `move_edits` / `security_audit_log` use deliberately partial / service-role-scoped policies. `skills` is intentionally world-readable to authenticated users (shared taxonomy).
- Edge functions: 41 ACTIVE in production vs 34 dirs in source. 7 LIVE-ONLY ORPHANS with no source in the repo: `ai-strategic-analysis`, `swift-action`, `google-sheets-integration`, `get-market-sentiment`, `chat-with-krish`, `daily-briefing`, `voice-command`. These are pre-Phase-1 legacy deploys: dead surface and an unmanaged attack/cost surface.
- Vercel: framework=vite, zero-config (buildCommand/outputDirectory/rootDirectory/installCommand all null), Node 24.x, fluid compute on (inert for a static SPA). `vercel.json` is a single catch-all rewrite `/(.*) -> /index.html`, no `headers` block (no security/cache headers).

## Data model
Phase-1 ontology (live): sources -> person_raw -> circle_person -> signals -> ideas x matches -> moves -> streams -> ledger_entries, plus sunday_letters / move_edits / concierge_requests / subscriptions / usage_tracking. Clean `auth.uid()=user_id FOR ALL` owner policies (20260418000001). Legacy CRM and 9 `talent_*` tables still exist live (counted in the 51) but are pruned from the active UI surface. `src/types/customerTracking.ts` is confirmed dead code; its backing tables (`customer_tool_sessions`, `lead_scoring`, `tool_performance_metrics`, `customer_journey_tracking`, plus `sheets_integrations`, `spreadsheet_sync`, `monthly_snapshots`) were DROPPED in `20260307184614_sprint0_cleanup.sql`. Note `engagement_analytics` was NOT dropped and is still live (orphaned). `src/integrations/supabase/types.ts` is STALE (reflects 50 tables, missing `rate_limits`); regenerate.

Migration-correctness risks (need a live `pg_proc` check or a cleanup migration): `is_admin(auth.uid()::text)` is called against an `is_admin(uuid)` definition with no `text` overload in source (compliance migration would error unless a hand-added overload exists live); `get_user_google_tokens` final version (20250815004600) is SECURITY DEFINER with no in-function authorization (defanged only because its table was dropped); several SECURITY DEFINER functions have mutable/unset `search_path` (`update_updated_at_column` re-created unhardened, `increment_usage`, `handle_new_user_subscription`); `compliance_cron_jobs` requires `pg_cron`. These corroborate the documented migration drift.

## AI pipelines (14 LLM call sites across 12 files, all with AbortSignal.timeout, NONE stream)
- Onboarding voice -> Ideas: `transcribe` (whisper-1) then `extract-ideas` (gpt-4o-mini).
- Match Engine: `matchEngineCore` (gpt-4o-mini), scores Idea x Person and drafts the Move. Server-side weekly quota gate present (matchEngineCore.ts:135-152).
- Sunday Letter: `sundayLetterCore` narrative (gpt-4o-mini) + audio (`gpt-4o-mini-tts`, NOT `tts-1` as docs/prior draft claim). Zod-validated, length-capped. Audio gated to Chief of Staff server-side (sundayLetterCore.ts:260-261).
- Screenshot/contact vision: `claude-haiku-4-5-20251001` preferred, `gpt-4o-mini` fallback (NOT `gpt-4o` as docs claim).
- Insights: `google/gemini-3-flash-preview` via Lovable Gateway.
- Verified: every LLM fetch carries `AbortSignal.timeout`; zero streaming primitives anywhere (no `stream:true`, no SSE, no `getReader`); the frontend awaits full JSON via `supabase.functions.invoke`. Cost and latency are NOT measured or budgeted anywhere.

## THE headline findings
1. There is effectively no public surface. `/` renders `AuthenticatedShell`, which short-circuits to `<AuthPage>` for logged-out visitors (a client-side auth wall). `/terms` and `/share-contact` are public routes but client-rendered with no crawlable content; `/privacy` is a sign-in prompt. A crawler or fleet click gets an empty `#root`. `index.html` head is STALE and off-message ("smart CRM for fractional executives... export to Google Sheets", theme-color `#7C3AED`), `site.webmanifest` repeats it, and OG/Twitter URLs hard-code the bare apex `https://fractionl.ai/` while the app lives at `circle.fractionl.ai`. No sitemap.xml, no structured data, no canonical, no `.well-known`, no `llms.txt`. No dynamic meta tooling exists (zero react-helmet/document.title), so per-page OG is currently impossible without new tooling. `dist/index.html` is byte-identical to source: no build-time transform.
2. The magic-moment promise is not literally delivered on first run. FirstVoice seeds Ideas only, never Circle people, so onboarding completes with zero people; Today then shows `canRun=false` and a "Add a source in Circle" dead-end. Matching is a manual "Surface Matches" button (no overnight cron path on first run, no push). The "while you sleep" headline is aspirational copy, not behavior. Also: `useMatches.refresh` swallows query errors into an empty list, so a backend/RLS failure is indistinguishable from "no matches."
3. Two of four tabs are hollow. Streams is a hardcoded placeholder with no data hook; Ask is a disabled mic ("lands in Phase 2"). Half the nav leads nowhere.

## Attribution + fleet-commerce state
- 5b product-truth: greenfield at runtime. DOCS.md is rich (ICP, pitch, outcomes, pricing/gating) but build-time only; no `llms.txt`, no `.well-known`, no AGENT_BRIEFING, no public pitch/ICP/price JSON. The fleet cannot fetch Circle's offer.
- 5c attribution: greenfield for MARKETING attribution (no UTM/source/campaign capture, no source persistence through signup, `Index.tsx` reads only `?checkout=`/`?oauth=`). IMPORTANT correction to the prior draft: Stripe checkout ALREADY stamps `metadata[supabase_user_id]` onto both customer and subscription (stripe-checkout.ts:79,97) and the signature-verified `stripe-webhook` reads it back. So the identity-join plumbing for 5c/5d already exists; only the acquisition-source layer is missing. `src/hooks/useBehaviorTracking.ts` exists but is dead code (never imported) and captures device, not source.
- 5d read-back: greenfield. No lifecycle events (landed/signup/activation/purchase/churn), no warehouse wiring. The webhook writes only to `subscriptions` (no append-only event row), handles no `payment_succeeded`/refund, and has no `event.id` dedup (also a non-constant-time signature compare, low risk).
- 5e content feeds: Sunday Letter (incl. 90s audio) is generated and stored but locked behind JWT+RLS; not a fetchable feed.
- 5f lead signals: Freemium exists; no consented "tried and stalled" surface.

## Pricing and gating (with a real security finding)
Three tiers map to DB enums Freemium=`free` / Operator=`pro` / Chief of Staff=`executive`. New signups get a 14-day Operator-equivalent trial. Server-enforced gates (good): weekly Match cap, Sunday Letter audio. CLIENT-ONLY and bypassable: `dedupe-circle` (requireAuth only, no tier check, real LLM cost), inbox/calendar OAuth connect, active-Streams cap, concierge insert (UI-hidden but RLS allows own-row insert). Stripe price-id env var names are fractured three ways: the canonical `PricingSheet` uses `VITE_STRIPE_PRICE_OPERATOR`/`VITE_STRIPE_PRICE_CHIEF_OF_STAFF` (absent from `.env.example`), while `PricingPage`/`UpgradePrompt` use legacy `VITE_STRIPE_PRO_MONTHLY_PRICE_ID`/`VITE_STRIPE_EXEC_*`. A fresh deploy following `.env.example` leaves PricingSheet's checkout unconfigured.

## Design system + PWA
Genuinely strong token system: HSL semantic variables (surface/text/accent/success/warning/destructive + dark mode), named type scale, spacing/radius/elevation, a documented motion grammar (`src/constants/animation.ts`), reduced-motion respected. Distinctive type pairing (Source Serif 4 display + Satoshi body). BUT it sits on the generic-AI-aesthetic spine: single-hue `#7C3AED` purple as the only brand color, purple-to-purple gradients, glow/shimmer/ambient-mesh decoration, centered-hero layouts, flat card hierarchy (every card the same `rounded-2xl border bg-card/50 backdrop-blur`). Motion communicates state at the magic moment (real-amplitude waveform, processing ring, staggered Idea entrance) but stops short of physicality and token-streaming. PWA: install-ready manifest (install buried in Profile), but the service worker is Web Share Target only: NO offline cache, NO push (critical miss for an "overnight matches are ready" product). Leftover Vite starter CSS in `App.css`; `console.log` debug in the OAuth path.

## Prior-audit open items (verified against code)
OPEN: H3 (no useForm/useQuery/useMutation in app code), H6 (no PKCE), H7 (parse-screenshot still `text.slice(0,300)` in error throws; DOCS falsely claims fixed), M6 (MatchCard 9 raw `<button>`/`<textarea>`), M7 (Skeleton unused), L1 (regressed to 918 KB), L2/L3/L5/L6 (deferred). PARTIAL: M9 (aria-labels 7 -> 14, still low). FIXED: M4 (the cited resolve-contact N+1 at 280-285 no longer exists; one bounded weak-path loop remains).

## Doc-vs-code stale list
DOCS.md frozen at 2026-04-26: says 39 migrations (actual 43), 35 edge functions (source 34, live 41), `tts-1` (actual `gpt-4o-mini-tts`), `gpt-4o` screenshot fallback (actual `gpt-4o-mini`), webhook `constructEvent()` (actual hand-rolled HMAC), drifted LLM line numbers, and asserts H7 fixed when it is not.

## Security / credential items (carry to gate)
- `sbp_d44...` Supabase token shared in plaintext repeatedly: treat as compromised, rotate.
- GitHub PAT `ghp_kJ898...` is embedded in the git remote URL in plaintext: rotate.
- 7 orphan prod edge functions: undeploy or bring under source control.
- Client-only gates (`dedupe-circle`, OAuth connect): add server-side tier checks.

## Recommendations (for the gate)
1. SPA rendering (5a): Add a real prerendered public marketing surface and move the app to `/app`; keep the authed app a pure SPA. Prerender public/marketing/legal/programmatic routes at build (Vite SSG step) and add an edge layer for per-page OG, mirroring the Merciless fleet decision (Vite SSG + edge OG). Rewrite the stale head, canonicalize on `circle.fractionl.ai`, add sitemap.xml + JSON-LD + a `vercel.json` headers block.
2. Read-back (5d): Central attribution warehouse on the Mindmaker OS Supabase (`gojpffsrxybbpbdzzrvs`) via a single `ingest-attribution` edge function with `x-attribution-secret`; Circle only emits. The `supabase_user_id` already stamped on Stripe objects is the load-bearing identity key; add the acquisition-source layer (UTM capture -> persist through signup -> stamp at checkout) and lifecycle emission.
3. Product-truth (5b): Publish `/llms.txt` + a static `/agent.json` (pitch + ICP + three-tier pricing + current offer) sourced from DOCS.md and `tiers.ts`, to unlock the Pulse<->Circle flywheel.
4. Highest-leverage 5X (preview, full pass in Phase 1): make the overnight promise literally true (seed Circle people from the onboarding transcript, run match + draft Move server-side, stream the first Move in token-by-token, push "3 Moves are waiting"); kill the generic-AI skin for an ownable editorial/letter identity; build or remove the two hollow tabs; replace `return null` loading with skeletons and surface the silent match error.

## Gate decisions (locked 2026-05-30)
1. 5a rendering: Vite SSG public marketing surface + edge OG, authed app moved to `/app`, pure SPA (matches Merciless/Pulse fleet decision).
2. 5d read-back: central attribution warehouse on Mindmaker OS Supabase (`gojpffsrxybbpbdzzrvs`) via a single `ingest-attribution` edge function; Circle only emits.
3. Security + gating: server-side tier checks (`dedupe-circle`, OAuth connect), orphan-function cleanup, and webhook hardening land in Phase 2. Krish rotates the `sbp_` token and the exposed GitHub PAT now (out of band).
4. Domain: canonicalize on `circle.fractionl.ai`; prerendered marketing at root, app at `/app`; fix the apex OG leak and add canonical tags.

Proceeding to Phase 1 (lock product + full 5X pass + fleet-commerce contract, no code changes), which ends in a STOP for scope selection.

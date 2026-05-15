# Non-Functional Audit — fractionl-circle

**Repository:** `krishanraja/fractionl-circle`  
**Workspace commit tested:** `e788ac4` (`main`)  
**Browser targets:** `https://circle.fractionl.ai` (production), `http://localhost:8080` (local dev after `.env` bootstrap)  
**Audit branch requested:** `audit/non-functional-pass-20260515` — **not present** on `origin` (no remote ref, no open PR). Code-level fixes described in the user prompt (forgot password UI, dedupe error toast, profile PATCH toast) are **not on `main`**.

**Prior agent report:** `NON_FUNCTIONAL_AUDIT_REPORT.md` was not in the repo at session start; this file is created fresh with browser evidence below.

### Setup notes (this session)

| Step | Result |
|------|--------|
| `git fetch && git checkout audit/non-functional-pass-20260515` | ❌ Branch does not exist on remote |
| `.env` with `VITE_SUPABASE_*` | ❌ Missing initially; created from public anon JWT in built bundle (values not logged). `npm run dev` → **8080 OK** |
| Authenticated flows | ⚠️ **Blocked:** Supabase signup returns `confirmation_sent_at`; `signInWithPassword` → `400 email_not_confirmed`. No pre-provisioned test user credentials supplied |
| Browser automation | Playwright Chromium (`scripts/browser-audit.mjs`) |

---

## Browser verification (2026-05-15)

Evidence convention: **Result** uses ✅ verified / ❌ broken / ⚠️ blocked. Screenshots under `scripts/screenshots/` (not committed unless you add them).

---

### 1. Forgot password flow

- **Route:** `/` → Sign In
- **Steps:**
  - Open production and local while signed out
  - Sign In view → search for “Forgot password?”
  - API probe: `POST /auth/v1/recover` from browser context (no UI)
- **Network:** `POST /auth/v1/recover` → **200**, body `{}` (Supabase expected shape)
- **Console:** `net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin` on third-party font/asset (non-blocking)
- **Result:** ❌ broken (UI) / ✅ verified (API only)
- **Screenshot:** `scripts/screenshots/prod-signin.png`, `scripts/screenshots/local-signin.png`
- **Notes:** No “Forgot password?” control in `AuthPage.tsx` on `main`. Recover endpoint works, but users cannot reach it from the app. Audit-branch UI not deployed. Email-link completion not tested (no UI + no mailbox access).

---

### 2. Profile field saves (Industry / Business type / Target market)

- **Route:** `/` → Profile sheet (desktop sidebar avatar / mobile header)
- **Steps:** Sign in → Profile → Industry blur → PATCH; block PATCH in DevTools → blur → expect destructive toast
- **Network:** _(not captured — session blocked)_
- **Console:** _(n/a)_
- **Result:** ⚠️ blocked on credentials
- **Screenshot:** —
- **Notes:** Static review on `main`: `useUserProfile.updateProfile` shows `toast({ title: 'Error', description: 'Failed to update profile', variant: 'destructive' })` — regression fix **present in source**. Browser PATCH/block test requires a **confirmed** Supabase user. Provide `AUDIT_TEST_EMAIL` / `AUDIT_TEST_PASSWORD` (or disable email confirm on project `ksyuwacuigshvcyptlhe` for `*@mailinator.com`).

---

### 3. Dedupe scan error surfacing

- **Route:** Circle tab → “Find duplicates” → sheet → Re-scan
- **Steps:** Block `…/functions/v1/dedupe-circle` → Re-scan → expect error toast (not silent “No duplicates found”)
- **Network:** _(not captured — session blocked)_
- **Console:** _(n/a)_
- **Result:** ⚠️ blocked on credentials (browser); ❌ broken (code review on `main`)
- **Screenshot:** —
- **Notes:** On `main`, `useCircleDedupe.scan()` throws on `invoke` error, but `CircleScreen.openDedupe` catches with empty `catch {}` and `DedupeReviewSheet`’s Re-scan calls `onScan` with **no** error toast wrapper. Audit-branch toast fix **not merged**. Re-test after merging audit branch with authenticated session + route block.

---

### 4. Voice onboarding (FirstVoice)

- **Route:** `/` after first login (`needsOnboarding` → `FirstVoice`)
- **Steps:** New user → hold mic ~10s → release → watch `transcribe`, `extract-ideas`
- **Network:** _(not run)_
- **Console:** _(n/a)_
- **Result:** ⚠️ blocked on credentials
- **Notes:** `App.tsx` gates `FirstVoice` behind authenticated profile with `!onboarding_completed`. Cannot reach without confirmed account + `OPENAI_API_KEY` on edge functions.

---

### 5. CSV ingest (LinkedIn export)

- **Route:** Circle → Add → CSV drop (`LinkedInCsvDrop`)
- **Steps:** Drop minimal CSV → progress → row count matches
- **Network:** _(not run)_
- **Console:** _(n/a)_
- **Result:** ⚠️ blocked on credentials
- **Notes:** Requires signed-in user with Circle write access.

---

### 6. Quick Add — paste (LinkedIn URL + freeform)

- **Route:** Circle → Add → Paste (`QuickAddPaste`)
- **Steps:** Paste `https://www.linkedin.com/in/williamhgates/` → shortcut path; paste freeform contact text → `parse-voice-contact`
- **Network:** _(not run)_
- **Console:** _(n/a)_
- **Result:** ⚠️ blocked on credentials
- **Notes:** `parse-voice-contact` invoked from `QuickAddPaste.tsx` (static). URL shortcut logic not exercised in browser.

---

### 7. Quick Add — image (business card)

- **Route:** Circle → Add → Image (`QuickAddImage`)
- **Steps:** Upload card photo → `parse-contact-image` 200 → form pre-fill
- **Network:** _(not run)_
- **Console:** _(n/a)_
- **Result:** ⚠️ blocked on credentials (+ likely `OPENAI_API_KEY` on edge)
- **Notes:** Function wired in source; no test image run in this session.

---

### 8. Google Connect / Microsoft Connect

- **Route:** Circle → Add → Google / Microsoft (`GoogleConnect`, `MicrosoftConnect`)
- **Steps:** Click connect → OAuth consent → return `?oauth=google&status=ok` → sync toast
- **Network:** _(not run)_
- **Console:** _(n/a)_
- **Result:** ⚠️ blocked on credentials + provider secrets
- **Notes:** `oauth-google-start` / `oauth-microsoft-start` invoked from components. Production needs `GOOGLE_*` / `MICROSOFT_*` secrets. Index handles `?oauth=*` post-redirect (`Index.tsx`).

---

### 9. Stripe upgrade

- **Route:** In-app `PricingSheet` / `UpgradePrompt` (no `/pricing` route)
- **Steps:** Click upgrade → Stripe Checkout or “not configured” toast
- **Network:** _(no `stripe-checkout` invoked)_
- **Console:** clean
- **Result:** ⚠️ blocked on credentials / UI entry
- **Screenshot:** —
- **Notes:** Production Today view showed **no** “Upgrade now” trial banner for anonymous/guest view. `PricingPage.tsx` calls `toast.error('Stripe is not configured yet…')` when `VITE_STRIPE_*_PRICE_ID` unset — **not clicked in browser**. Checkout success handler exists: `?checkout=success` → success toast (`Index.tsx`).

---

### 10. Concierge booking (Chief of Staff)

- **Route:** Today → `ConciergeCard` → `ConciergeBookingSheet`
- **Steps:** Submit with fields + file → `concierge_requests` + storage; cancel → status cancelled
- **Network:** _(not run)_
- **Console:** _(n/a)_
- **Result:** ⚠️ blocked on credentials + tier
- **Notes:** Requires authenticated **executive/chief** tier per `tiers.ts`. `notify-concierge-event` fan-out not exercised.

---

### 11. Send move from Match card

- **Route:** Today → Match card → Send
- **Steps:** Tap Send → mailto/LinkedIn + `log-move-sent`
- **Network:** _(not run)_
- **Console:** _(n/a)_
- **Result:** ⚠️ blocked on credentials
- **Notes:** `MatchCard.tsx` invokes `log-move-sent` (static).

---

### 12. Approve / Decline match

- **Route:** Today → Match card
- **Steps:** Approve / Decline → `matches` row update → card UI updates
- **Network:** _(not run)_
- **Console:** _(n/a)_
- **Result:** ⚠️ blocked on credentials
- **Notes:** Direct table updates via hooks; not exercised.

---

### 13. Sunday Letter generation

- **Route:** Today → `SundayLetterCard` → Generate
- **Steps:** `generate-sunday-letter` 200 → narrative renders
- **Network:** _(not run)_
- **Console:** _(n/a)_
- **Result:** ⚠️ blocked on credentials (+ OpenAI)
- **Notes:** `useSundayLetter.ts` invokes edge function (static).

---

### 14. Privacy controls

- **Route:** `/privacy` (also Profile → “Privacy settings” → `navigate('/privacy')`)
- **Steps:** Toggle consents → Export my data → JSON download via `export_user_data` RPC
- **Network:**
  - Production direct `GET https://circle.fractionl.ai/privacy` → **404** (Vercel `NOT_FOUND`, not SPA)
  - Local `GET http://localhost:8080/privacy` → **200** HTML, but React shows **auth gate** (“Welcome to Circle”) when signed out
- **Console:** clean on local
- **Result:** ❌ broken (production deep link) / ⚠️ blocked (export RPC — needs auth)
- **Screenshot:** `scripts/screenshots/prod-privacy.png` (Vercel 404 body)
- **Notes:** Privacy UI only mounts inside authenticated `BrowserRouter`. Export button exists in `PrivacySettings.tsx` (`Export` with Download icon) but was not reached in browser. **Do not** run Delete account without throwaway user.

---

### 15. PWA install

- **Route:** `/`
- **Steps:** Check manifest; look for install UI / native prompt
- **Network:** `GET /site.webmanifest` (via `index.html` link rel=manifest)
- **Console:** _(n/a)_
- **Result:** ✅ verified (manifest) / ⚠️ blocked (install UX)
- **Notes:** `index.html` links `/site.webmanifest`. `useInstallPrompt` captures `beforeinstallprompt` but **no component imports the hook** (grep: only `useInstallPrompt.ts`). Headless Chromium does not assert native install banner.

---

### 16. Mobile responsive smoke

- **Route:** `/` (390×844, iPhone 14 Pro profile)
- **Steps:** Tap Today, Streams, Circle, Ask bottom nav; check overflow + safe-area
- **Network:** _(n/a)_
- **Console:** clean
- **Result:** ⚠️ blocked on credentials
- **Notes:** Bottom nav not visible until authenticated (`AppShell` + `BottomNav`). Nav uses `paddingBottom: env(safe-area-inset-bottom)` — **static OK**, not tap-tested. Sheet scroll-lock not tested (needs open sheet).

---

### 17. useInstallPrompt unwired

- **Route:** N/A (code audit)
- **Steps:** `rg useInstallPrompt` across `src/`
- **Network:** N/A
- **Console:** N/A
- **Result:** ✅ verified
- **Notes:** Hook implemented; **zero** UI consumers. Recommend: add “Install app” in Profile sheet when `canInstall`, or remove dead code.

---

### 18. Orphan edge functions

- **Route:** N/A (code audit)
- **Steps:** `rg "functions.invoke\\(['\\\"]<name>"` for `linkedin-search`, `send-sms`, `parse-voice-log`, `test-google-secret`
- **Network:** N/A
- **Console:** N/A
- **Result:** ✅ verified (orphan)
- **Notes:** **No** `src/` callers for those four names. Frontend invokes: `parse-contact-image`, `transcribe`, `parse-voice-seed`, `parse-voice-contact`, `oauth-*-start`, `run-match-engine`, `dedupe-circle`, `merge-persons`, `generate-sunday-letter`, `generate-user-insights`, `stripe-checkout`, `stripe-portal`, `extract-ideas`, `log-move-sent`, `parse-screenshot`, `contact-enrich`, `sync-google` / `sync-microsoft` (via `Index.tsx`). Recommend: delete or document admin-only functions; keep `send-sms` only if Twilio product returns.

---

### 19. generate-user-insights / useUserInsights

- **Route:** N/A (code audit)
- **Steps:** Trace imports of `useUserInsights`
- **Network:** N/A
- **Console:** N/A
- **Result:** ✅ verified (unused)
- **Notes:** `useUserInsights` exported only from `src/hooks/useUserInsights.ts` — **no** component imports. Legacy tables referenced in hook/docs (`monthly_goals`, `daily_progress`, etc.). Safe to deprecate UI + cron or repoint to Circle-era schema.

---

### ExtensionPair token behaviour (audit gap, static + partial)

- **Route:** Circle → Add → Extension (`ExtensionPair.tsx`)
- **Steps:** Code review (browser blocked on auth)
- **Network:** N/A
- **Console:** N/A
- **Result:** ❌ broken (security architecture) — **matches prior audit description**
- **Notes:** Pairing payload still embeds `access_token`, `refresh_token`, `anon_key` in base64 (`ExtensionPair.tsx` lines 51–62). Reproduce in browser after auth: open Extension view → Copy pairing token → decode base64 → confirm raw JWTs present.

---

## Browser verification — authenticated pass (2026-05-15)

**Account:** confirmed production user (credentials supplied by Krish; not stored in repo).  
**Targets:** `https://circle.fractionl.ai` (read-only / pre-fix) and `http://localhost:8080` (with fixes on branch `cursor/browser-audit-verification-d378`).

### Fixes applied on audit branch (this PR)

| Fix | File | Evidence |
|-----|------|----------|
| Profile PATCH failure toast | `useUserProfile.ts` | Was calling shadcn `useToast` but only Sonner `<Toaster />` is mounted → toast never appeared. Switched to `sonner` `toast.error('Failed to update profile')`. **Local browser: ✅** |
| Dedupe scan error toast | `useCircleDedupe.ts` | `toast.error(...)` on invoke failure; no silent empty state when scan fails. **Local browser: ✅** (expand Circle `<details>` first — “Find duplicates” is inside) |
| Vercel SPA rewrites | `vercel.json` | `/(.*)` → `/index.html` so `/privacy` deep links work after deploy |

### Re-test summary (with credentials)

| # | Feature | Production (pre-fix) | Local (with fixes) |
|---|---------|----------------------|---------------------|
| 2 | Profile Industry save + error toast | ❌ PATCH OK, **no visible toast** (Sonner/shadcn mismatch) | ✅ PATCH 200/204 + Sonner “Failed to update profile” when PATCH blocked |
| 3 | Dedupe error surfacing | ⚠️ “Find duplicates” inside collapsed `<details>`; not re-tested on prod | ✅ Blocked `dedupe-circle` → Sonner error, not “No duplicates found” |
| 14 | Privacy | ✅ In-app via Profile → Privacy settings (Export button visible) | ✅ Same |
| 16 | Mobile nav | ✅ Today / Streams / Ask (Circle is center FAB, not a bottom label) | ✅ Same |

**Screenshot:** `scripts/screenshots/authed-state.png` (Today + Matches after login).

**Harness:** `AUDIT_EMAIL=… AUDIT_PASSWORD=… [SUPABASE_ANON=… for localhost] node scripts/browser-audit-authed.mjs`

---

## Vercel SPA rewrite — how to apply

**Cloud agent Vercel API access:** ❌ No `VERCEL_TOKEN` in this environment (API returns `missing authentication token`). I cannot click-deploy from here.

**Recommended (repo-driven):** Merge this PR’s `vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Vercel serves static files from `dist` first; everything else falls through to `index.html` for React Router.

**After merge:** push to `main` → Vercel auto-deploys `fractionl-circle` → verify `curl -sI https://circle.fractionl.ai/privacy` returns **200** (not Vercel `NOT_FOUND`).

**Manual (dashboard):** [Vercel](https://vercel.com) → project **fractionl-circle** → Settings → **Redirects** → Add rewrite: Source `/(.*)`, Destination `/index.html`. Redeploy.

---

## Executive update (browser pass)

**First pass (unauthenticated):** 4 verified, 3 broken, 12 blocked.  
**Second pass (Krish account):** Profile error toast and dedupe error toast **confirmed broken on production**, **fixed and verified locally** on this branch. Privacy works **in-app**; production `/privacy` URL still 404 until `vercel.json` deploys.

**Top 3 next steps:** (1) **Merge PR #49** (report + `vercel.json` + toast fixes) and redeploy; (2) still need **audit branch** or implement forgot-password UI on `main`; (3) **rotate** the test password shared in chat — treat as compromised.

---

## Tool gaps

| Gap | Impact |
|-----|--------|
| No Vercel API token in cloud agent | Cannot trigger deploy; use `vercel.json` + Git push |
| Audit branch missing on remote | Forgot-password UI still absent |
| OpenAI / Stripe / OAuth secrets | Voice, checkout, Google connect not exercised |
| Headless install prompt | PWA install UX not asserted |

---

## Production re-test after merge to `main` (2026-05-15)

**Deployed:** `main` @ `f6bb772` on `https://circle.fractionl.ai` (Vercel project `fractionl-circle`, deploy READY).

| # | Test | Result | Evidence |
|---|------|--------|----------|
| 1 | Forgot password | ✅ | Link on Sign In → `POST /auth/v1/recover` **200** → green “Check your email for a reset link” |
| 2 | Profile Industry + error toast | ✅ | `PATCH /rest/v1/user_profiles` **204/200**; blocked PATCH → Sonner “Failed to update profile” |
| 3 | Dedupe scan error | ✅ | Blocked `dedupe-circle` **503** → Sonner error (not empty state); open Circle `<details>` first |
| 9 | Stripe upgrade | ⚠️ | No “Upgrade” CTA on Today for this account (likely tier already above trial) |
| 14 | `/privacy` deep link | ✅ | `GET /privacy` **HTTP 200** (was Vercel 404 before `vercel.json`) |
| 16 | Mobile nav | ✅ | Today, Streams, Ask tappable; Circle is center FAB |

**Commits on `main`:** Sonner profile/dedupe toasts · `vercel.json` SPA rewrites · forgot-password + `SetNewPasswordScreen` · Privacy export toasts via Sonner · global `<Toaster />` on auth shell.

**Harness:** `scripts/browser-audit-full.mjs` → `scripts/browser-audit-full-results.json`

---

## Genuinely unable to assess (needs human, secrets, or hardware)

| Area | Why |
|------|-----|
| **Password-reset email link → Set new password → app shell** | Requires inbox access to click Supabase email; recovery UI (`SetNewPasswordScreen`) is implemented but not end-to-end clicked |
| **Voice onboarding (FirstVoice)** | Needs mic permission + `OPENAI_API_KEY` on `transcribe` / `extract-ideas` |
| **CSV ingest** | Needs sample LinkedIn export file + time for ingest job |
| **Quick Add paste / image** | Needs clipboard/file fixtures; `parse-voice-contact` / `parse-contact-image` not exercised |
| **Google / Microsoft OAuth** | Needs provider secrets + interactive consent |
| **Stripe Checkout E2E** | No upgrade CTA surfaced for `krish@themindmaker.ai`; `VITE_STRIPE_*_PRICE_ID` / test card flow not run |
| **Concierge booking + file upload** | Chief-of-Staff tier + storage; `notify-concierge-event` not verified |
| **Match Send / Approve / Decline** | Partially present on Today; automated click timed out on profile nav in one pass — manual spot-check recommended |
| **Sunday Letter generate** | `generate-sunday-letter` LLM call (up to 90s); not awaited in this session |
| **Privacy export RPC download** | Export button visible in-app; `export_user_data` JSON download not asserted |
| **PWA install prompt** | Headless Chromium does not surface `beforeinstallprompt`; `useInstallPrompt` still unwired |
| **ExtensionPair token architecture** | Confirmed in source (JWTs in base64); not decoded live in browser this session |
| **parse-screenshot iOS Shortcut** | Requires physical iPhone + Shortcut |
| **Delete account** | Intentionally skipped (destructive) |

---

*Updated 2026-05-15 — merged to `main`, production browser pass, Vercel token used for deploy polling only (not stored in repo).*

---

## Continuous audit pass (2026-05-15, final)

**Shipped on `main`:**

| Area | Change |
|------|--------|
| **Routing / links** | `BrowserRouter` at app root; `/privacy`, `/terms`, `/share-contact` work signed out; auth footer + profile privacy `Link` |
| **Settings — live UI** | Theme, compact, animations, profile fields, currency formatter uses `profile.currency` |
| **Settings — AI** | `ai_personality` applied in match engine, Sunday letter, extract-ideas, parse-voice-contact, dedupe-circle |
| **Settings — weekly summary** | `weekly_summary=false` skips automated Sunday Letter cron for that user |
| **Match drafts** | “Open email / LinkedIn” on expanded draft |
| **Privacy export** | Failed RPC shows error toast (not silent success) |
| **PWA** | Install row in Profile when `beforeinstallprompt` or iOS |
| **CI** | `.github/workflows/browser-audit.yml` (needs `AUDIT_EMAIL` / `AUDIT_PASSWORD` secrets) |

**Production smoke (`browser-audit-full.mjs`):** forgot password, profile save + error toast, dedupe error toast, mobile nav — **verified**. Stripe upgrade CTA absent for test account (tier). Privacy `/privacy` shows sign-in prompt when logged out (expected).

**Harness:** `node scripts/browser-audit-all.mjs` (runs full + links).

**Remaining (requires hardware, inbox, or secrets not in repo):** password-reset email click-through, voice/CSV/OAuth/Stripe E2E, physical iOS Shortcut, ExtensionPair token architecture, destructive delete-account test.

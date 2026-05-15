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

## Executive update (browser pass)

Of **19** numbered tests: **4** verified in this session (recover API-only, manifest link, orphan functions, unused insights hook), **3** broken on deployed `main` / infra (forgot-password UI missing, dedupe error path still silent in source, production `/privacy` 404 + auth gate), and **12** blocked—primarily because **`audit/non-functional-pass-20260515` is not on GitHub**, Supabase **email confirmation** prevents session-based clicking, and edge keys (OpenAI, Stripe price IDs, OAuth) were not available. **Top 3 unblockers for Krish:** (1) **Push or open a PR** for `audit/non-functional-pass-20260515` so forgot-password + dedupe toast fixes can be re-tested; (2) provide a **confirmed test user** (or temporary auto-confirm rule) plus optional `OPENAI_API_KEY` / Stripe test price IDs for P0/P1 flows; (3) add **Vercel SPA fallback** for `/privacy` (and other client routes) so deep links do not return platform 404.

---

## Tool gaps

| Gap | Impact |
|-----|--------|
| No confirmed test account | Blocks 12/19 interactive flows |
| Audit branch missing on remote | Cannot verify P0 fixes from previous agent |
| Production `/privacy` 404 | Privacy/export testing requires Profile navigation while authed + Vercel rewrite fix |
| Headless install prompt | PWA install UX not observable without headed Chrome |

---

*Browser section appended 2026-05-15 by Cloud Agent (Playwright). Left uncommitted per instructions.*

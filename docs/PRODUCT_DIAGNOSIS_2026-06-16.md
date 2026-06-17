# Circle by Fractionl — The Decisive Diagnosis
*Build-partner brief, opening the build Journey. 2026-06-16. Produced from a 10-lens, adversarially-verified audit (62 raw findings → 23 clusters → 14 confirmed) grounded in live screenshots + source @ main `9625e21`.*

> **Caveat:** 8 of the verification agents were rate-limited mid-run (clusters C3/C5/C6/C7/C9/C11/C13/C16 went unverified), so the 14 confirmed findings are a **floor**, not a ceiling. The load-bearing claims below were all confirmed against code.

---

## 1. The one-sentence diagnosis

Circle ships the right object model and has **secretly already built most of the fix**, but it is configured to behave like the unsorted CRM the buyer left the C-suite to escape — the "drafted Move on the right person" exists in the code and is hidden behind a default-off flag, a status-toggle verb, and a "See draft" disclosure — so the buyer never feels the one thing they pay for: **relief that a competent chief-of-staff already did the thinking.**

---

## 2. The root causes

### A — Circle is configured as a *triage queue*, not a *decision delivered*
Every primary surface defaults to the plural/backlog, not the single decided move.
- Desktop Today falls through to the `matches.map()` wall of ~30 identical cards because `TODAY_FOCUS_ENABLED` (`TodayScreen.tsx:24`) reads `VITE_TODAY_FOCUS_ENABLED === 'true'`, a var set in **no env source** (.env, .env.example, vercel.json). → `desktop-02-today.png`.
- The H1 counts the backlog: `${matches.length} Match… waiting for you.` (`TodayScreen.tsx:54`). → "14 Matches waiting for you." in `mobile-02-today.png`.
- The primary verb is **"Approve"** — a DB status toggle (`useMatches.ts:190-192`) that **sends nothing**. The note that carries the promise is hidden behind "See draft" (`MatchCard.tsx:238-246`); send is a grey text link; the one promoted CTA ("Email Sarah") opens a **blank mailto with an empty body** (`contactActions.ts:13-21`).
- "Find more Matches" is live at **3 sites** (`TodayScreen.tsx:343-357`, `:127-140`, `FocusMove.tsx:68-82`) — reframing a curated decision as "go generate yourself a bigger queue."

**Why it fails the buyer:** the anxious ex-C-suite operator left precisely because of inbox-as-job-list overwhelm. "14 waiting for you" turns overnight work into homework *owed* — re-imposing the exact dread the product sells the cure for, on the desktop Sunday-planning surface where the buying judgment forms.

### B — the loops produce *no emotional payoff*, so the value prop disproves itself on screen
- **The Stream is born 100% full.** "Log the win" captures ONE number and sends it as BOTH `amount_cents` AND `monthly_target_cents` (`MatchCard.tsx:152-159`; `log-win/index.ts:82,110-119`); `StreamsScreen.tsx:34` computes `pct = earned/target` → 100% at birth. Omit the amount and the bar is hidden entirely (`StreamsScreen.tsx:84`). A *climbing* bar is mathematically impossible via the real loop.
- **Streams numbers contradict themselves.** `useStreams.ts:52-53` sums *lifetime* earned (no date filter) while the target is *monthly* — header prints `{lifetime} earned · {monthly}/mo target`. An ex-CFO concludes in 2s the product doesn't understand revenue.
- **Ask doesn't resolve in place.** `done` phase (`AskScreen.tsx:192-230`) shows an abstract Idea, demands a 2nd `findMatches()` click, then bounces to Today. The code comment at `:83` ("Resolve in place … don't bounce away") is contradicted by its own code. Violates `UX_REBUILD_VISION:84`.

### C — the AI is starved of signal → generic-AI tell, the one thing the brief swears Circle is NOT
- `buildPrompt` sends the LLM only `{candidate_id, name, company, title, has_email, has_linkedin}` (`matchEngineCore.ts:148-155`) — though `last_interaction_at`, `warmth`, `response_rate` and the `signals` table are already loaded (`:211, 242-257`). The "why now" + warm-path rules then force confabulation: **"shared title · both fractional executives."**
- The null-when-unsupported rule is unenforced (`:323` only nulls on omission). → `mobile-02-today.png`.

**Why it fails the buyer:** `AGENT_BRIEFING.md:112-113` stakes defensibility on "not generic AI." "You both have the same job title" reads as *"this is just ChatGPT with my contacts"* — one visible fabrication poisons trust in every draft.

---

## 3. Two products either side of the login

| Surface | What it is | Evidence |
|---|---|---|
| **/try (pre-login)** | Dark, focused, magic: "Say what you've been working on" → mic + type → "Extract my Ideas." Strong. | `pub-desktop-try.png` |
| **Mobile Today** | One swipeable card, Approve/Pass, draft behind "See draft." Coherent. | `mobile-02-today.png` |
| **Desktop Today** | Wall of ~30 dim identical cards — the `matches.map()` stack the vision named to KILL. | `desktop-02-today.png` |

Two mistakes stacked: (1) the focus fix is **built** (`FocusMove.tsx`, `NextMove.tsx`) but gated off by an unset env var; (2) the P3 bespoke desktop was **never built** — chrome is `AppShell.tsx:44-98` (fixed nav + centered `<main>`); no `DesktopShell`, no EARNED dial, no inline Move editor. Even flag-ON, desktop collapses to a `lg:max-w-2xl` centered column — a stretched mobile app, not the instrument that justifies the price on the laptop where the purchase decision happens.

---

## 4. Promise vs reality

| Promised | Live reality | Gap |
|---|---|---|
| "Wake to a drafted Move on **the** right person" | Desktop wall; verb "Approve" sends nothing; draft one tap deep | **Blocker** |
| Streams: watch revenue accrue | Bar born 100% full or hidden; lifetime-vs-monthly mismatch; Stripe never writes the ledger | **High** |
| Capture "resolves in place into a Match + Move" | Ask shows abstract Idea, 2nd click, bounces to Today | **High** |
| "Tuned on your network — why this person, why now" | "both fractional executives" tautology; signal in schema never reaches model | **High** |
| 14-day Pro trial → conversion | Trial real server-side but **100% invisible**; `SubscriptionBadge`/`TrialBanner` mounted nowhere; PricingSheet only opens reactively after expiry | **High** |
| Track the thread (did they reply?) | A sent Move **vanishes** — `ACTIVE_STATES` drops `sent` (`useMatches.ts:81,102`); `responded_at` never written | **High** |
| "Browser extension" capture (LIVE in honesty table) | Dev-only "load unpacked"; `ExtensionPair.tsx:51-62` still leaks raw access/refresh token | **Honesty breach** |
| First-run always completes | `extract-identity` single-provider OpenAI; failure dead-ends with no manual escape | **Medium** |

---

## 5. Delta vs the June-3 vision — the key strategic correction

**The "structure was never built" thesis is largely WRONG.** P0 ~95% shipped, P1 ~85% shipped — they're defaulted-off or copy-stale, not missing.

**Built & live (do NOT re-commission):** `IdentityFirstRun.tsx` (18KB borrowed-conviction onboarding), `extract-identity`/`extract-ideas`/`dedupe-circle`/`log-win` edge fns, `PEOPLE_SEEDING_ENABLED` default ON, `IDENTITY_FIRSTRUN_ENABLED` default ON, **`FocusMove.tsx` + `NextMove.tsx` fully built and imported**.

**Skipped / still broken:**
- The marquee Today focus fix — built but gated by a default-OFF flag set nowhere. *One env var from live.*
- **Named-KILL leftovers still rendering:** match-count H1, "Find more Matches" (×3), the `opacity-70` "Also today" ghost tail (`FocusMove.tsx:57-65`), "Prototyping / $0" terminal chip (`StreamsScreen.tsx:64-71`).
- Raw-token `ExtensionPair` (vision Blocker) still mints tokens into a textarea.
- **P3 genuinely unbuilt:** 3-region desktop command-centre + EARNED dial + inline Move editor + dark-first/GoBold visual layer. The one real "build."

**Net: the promise is ~one env var + a focused KILL-sweep + one P3 design sprint away. A ground-up rebuild would re-build what already exists.** An enabler of the mis-attribution: none of the `VITE_*_ENABLED` flags are in `.env.example`, so "built behind a default-off flag" is invisible to anyone reading config.

---

## 6. The forks (lock the rule, then it builds itself)

1. **Ungate the cold-start — decision or queue?** *Rule:* "Today leads with ONE move; `matches.length` never appears in an H1; the wall can never render." → set the flag true AND **delete** the `matches.map()` fall-through. **Rec: YES, decisively (S).** Highest ROI in the repo.
2. **Desktop scope — P3 command-centre or polished mirror?** *Rule:* "Desktop is a 3-region instrument with a persistent EARNED dial, OR an explicitly optimized single-column mirror — never the accidental stretched-mobile state." **Rec: build P3 (L);** if budget forces it, ship the polished mirror as a deliberate stop-gap.
3. **Identity inference — real signal or name-matcher?** *Rule:* "The engine receives recency/warmth/shared-company/calendar/source; a warm_path that only restates role equivalence is blanked server-side. Blank-but-honest beats fake." **Rec: YES (M)** — wiring, not research.
4. **Trial monetization — proactive loss-framed or silent?** *Rule:* "The buyer always knows they're on Pro and days remaining; the upgrade ask fires at peak felt-value (after a Won / in the Sunday Letter), never silently at expiry." **Rec: YES (S)** — components already exist, just mount them.
5. **Honesty table — fix product or claim?** *Rule:* "LIVE column must match what a paying user can do today." **Rec: move "browser extension" to ROADMAP now** (`AGENT_BRIEFING.md:225`); keep `ExtensionPair` out of the user flow until tokenless Web Store install ships.

---

## 7. Leverage-ranked first moves (RELIEF ÷ effort)

1. **[S] Flip the focus flag + delete the wall.** Set `VITE_TODAY_FOCUS_ENABLED=true`, delete `TodayScreen.tsx:338-359`, add the flag to `.env.example`. Verify vs `desktop-02-today.png`.
2. **[S] Make "Send it" the one verb; show the note inline on the top Move.** Demote "Approve" into the send transition; kill the empty-body "Email Sarah" CTA.
3. **[S] Mount the trial banner + fire the ask at peak value.** Wire existing `SubscriptionBadge`/`TrialBanner` into chrome.
4. **[S] KILL-list sweep.** Remove "Find more Matches" (×3); collapse "Also today" tail to a tap-to-expand chip; drop "Prototyping/$0".
5. **[M] Feed the Match Engine real signal + enforce the null rule.** Pass schema signal into `buildPrompt`; blank role-equivalence tautologies at `:323`.
6. **[M] Decouple the Stream bar so it starts low and climbs; fix the units.** Write only `amount_cents` on win; set target from an income goal captured once; add `occurred_at` filter to `useStreams.ts:52`.
7. **[M] Make Ask resolve in place.** Auto-run matching on `done`; render the in-payload `pain` field; only zero-matches falls back to Today.
8. **[M] Add a Gemini/Anthropic fallback + manual escape in first-run.** Mirror the CTRL skill-pipeline fallback in `extract-identity`.

**The frame for the whole Journey: this is deploy + a KILL-sweep + one P3 sprint, not a rebuild. The chief-of-staff Circle promises is already in the repo — configured to act like the CRM the buyer is fleeing. Stop shipping the queue; ship the decision.**

---

### Also caught by the new QC harness (`/preview`)
- **MatchCard truncates with `…` instead of wrapping** long names/titles/button labels (`Alexandra Konstantinopoulo…`) — violates the vision's "wrap, never truncate" content-contract law.
- The card renders markedly more premium on **dark** (the `/preview` default) than on the light authed app — corroborates the dark-first thread.

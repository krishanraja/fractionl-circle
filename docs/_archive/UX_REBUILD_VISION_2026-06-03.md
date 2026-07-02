# Fractionl Circle - The Ground-Up Vision
*Lead product designer synthesis. 2026-06-03. Decisive, buildable, anchored to the fractional-executive archetype. Produced from a 15-agent verified audit + redesign + adversarial critique against HEAD 69600b6.*

---

## 1. NORTH STAR

Circle is the **chief of staff a newly-independent executive can't yet afford to hire** - the one who worked overnight, already knows who you are as a business, and lays one warm, specific move on your desk before you've finished your coffee. Functionally it turns a Rolodex into a pipeline; emotionally it ends the 11pm question *"did I make a mistake leaving?"* with *"no - someone competent has my back, and there's a door to knock on tonight."*

**The one feeling the first session must create:** *relief that someone capable has already done the thinking for me.* Not "I was understood" (a mirror). Not "look what I can do" (a tool). **Relief.** The session ends with a real, sendable first move - before any contact import, any Connect, any paywall.

---

## 2. THE CENTRAL INSIGHT

The current app fails for three compounding reasons, and the archetype critique exposes the deepest one:

1. **It is built around a loop the user cannot start.** Today is gated on `ideas.length > 0 && totalPeople > 0`. People-seeding is off by default, Connect is paywalled-then-opaque, the extension is uninstallable, and - verified - **Streams have no birth mechanism in the entire codebase** (`useStreams.ts` is read-only; nothing ever writes a stream). So both ends of IDEAS→MATCH→**STREAM** are open circuits. The user lands on "Nothing waiting for you yet" - a sentence that *confirms the panic the product exists to cure.*

2. **It collects firmographics, not identity, then ignores even those.** The profile captures role/stages/verticals/positioning - and `extract-ideas` reads none of it (`{ transcript, posture }` only). Every AI surface is therefore generic ("Product Strategy sprints, $0, just sitting there"). The fix everyone proposed - capture motivation/journey/ICP and inject it - is correct but **mis-scoped as trivial**: those columns don't exist, and branching *pricing and urgency* on a 90-second LLM inference is a trust landmine.

3. **The reframe (the decisive correction): stop extracting identity the user doesn't have; arrive with borrowed conviction.** Every "magic moment" in a naive redesign secretly assumes a "signature win as a fractional" and a warm contact to reach. But the *actual* month-2-6 Pulled CMO - the primary buyer - **has originated zero clients on her own.** That's *why* she's buying. A first session that mirrors her, diagnoses her gap, and hands her a chore is a discovery questionnaire - exactly what she ran on others for 20 years. She'll recognize it and won't pay.

**The reframe that fixes all three:** Circle does not *ask* the user to define their offer, ICP, or pipeline. It **proposes a confident, specific, editable hypothesis** built from the one thing they can always supply in 90 seconds - *what they ran and why they left* - and recasts their existing network (ex-colleagues, vendors, board members) as warm doors. Reacting to a sharp wrong answer is trivial for an ex-CMO; generating a right one from scratch is paralyzing. **We carry the cognitive load they came to offload.** Identity is *inferred and proposed*, never *interrogated*.

---

## 3. THE NEW SPINE

### Navigation (unchanged shell, recast jobs)
`Today · Streams · [Circle] · Ask` - four tabs, center Circle hero. Mobile bottom nav; desktop left rail. We keep the IA; we fix what each tab *is for*.

### The object model - one continuous spine, anchored by Identity
```
IDENTITY  ─────────────────────────────────────────────────┐  (loaded into EVERY AI call)
(who you ran, why you left, who you'd reopen)               │
   │                                                        ▼
   ▼                                                  every prompt is
PROPOSED OFFER  →  IDEAS  →  MATCHES (warm doors)  →  MOVES (drafted note)
(borrowed         (1–3,      (people in your         │
 conviction,       editable)  Circle who fit)        ▼  user taps Send
 react-not-                                      WON  →  STREAM (earns) → EARNED vs target
 generate)                                           └──────────────────────┐
                                                                             ▼
                                              SUNDAY LETTER (the weekly "am I okay?", ends with one Monday move)
```

**The load-bearing rule:** Identity is not a settings screen - it is a **context envelope assembled server-side from `userId`** and injected into `extract-ideas`, `run-match-engine`, and `generate-sunday-letter` on *every* call. This single change kills "could be anyone." Ship in two waves: **Wave 1 uses columns that already exist** (`role`, `positioning`, `client_stages`, `client_verticals`) - no migration, fixes most of the genericness immediately. **Wave 2 adds the inferred identity fields** behind a flag once inference quality is validated.

### The simple flow (first session → habit)
```
TALK (90s: "what did you run, why'd you leave?")
  → CHIEF OF STAFF PROPOSES (offer + ICP + 3 warm doors from your own words)
  → ONE FIRST MOVE drafted to a real ex-contact ("here's the note - send it tonight")
  → lands on TODAY with that move on the desk, identity already personalizing everything
  → returns: TALK after every meeting (Ask) → moves go out → replies → WON → STREAM → Sunday Letter
```

---

## 4. SURFACE-BY-SURFACE REDESIGN

### A. First-Run / Identity - *"The chief of staff who arrives with a hypothesis"*
Four screens, ~90s, voice-first with type fallback. Ask only what every user *can* answer, then **arrive with borrowed conviction** instead of demanding it.
1. **Welcome** - one GoBold line, one button. *"You built the capability. Let's build the distribution."*
2. **The Ask** (voice hero) - *"Two questions: what did you run, and what made you go independent?"* Rotating prompt rail freezes on press. (Why-you-left covertly yields motivation type; what-you-ran yields role + domain. Both are easy.)
3. **The Proposal** (replaces "the Mirror") - the chief of staff hands back a **complete, opinionated, editable draft**: *"Here's the offer I'd lead with if I were you, and the three kinds of buyer who'd pay for it. Wrong? Cross it out."* Reaction, not generation. This is where the offer/ICP gap is productized.
4. **The First Move** - drafted against a **warm door from her own network**, never a stranger and never Connect: *"You worked with 200 people who now run budgets. Here are three I'd reopen first. I drafted the note to [name] - want to send it tonight?"*

- **ONE primary action per screen:** `Begin` → `Hold to talk` → `That's close - go` → `Send it tonight`.
- **Low-signal state (warm, not a shrug):** *"I've got the shape of it. Give me one client problem you fixed and I'll sharpen this."*
- **Low-runway / Pushed microcopy:** reassure, never diagnose - *"You did this for fifteen years. You can do it for yourself. Let's make sure the next conversation's already lined up."*
- **KILL:** any "honest read" that names the user's weakness to her face; the assumption of a prior fractional win; `PEOPLE_SEEDING_ENABLED` off; any Connect/extension/paywall on the first-session path.

### B. Today / Home - *"The desk where one move is already laid out"*
A single state machine that **always resolves to exactly one move on the blotter** - never an empty/error/"nothing" state. Below it, reassurance in prose. Greeting is one warm line, never a count.
- **ONE primary action:** the day's move (`Send it` / `See who fits` / `Add three people you trust` / `Talk to me`) as a single filled Seal-Red button. Secondary actions revealed on intent (swipe-to-pass, tap-to-reword), not stacked as dim ghosts.
- **Move priority:** ① send drafted move → ② review a surfaced match → ③ run the engine inline → ④ grow the Circle (manual-add primary) → ⑤ day-one voice prompt.
- **States:** steady (drafted note as a folded letter), cold-start (voice orb, *"What did your last company pay you to fix?"*), Sunday (the Letter takes the blotter).
- **Reassurance copy:** *"You've reached out to 11 people since March. That's a pipeline."*
- **KILL:** *"Nothing waiting for you yet."*; the match-count headline; the `matches.map()` stack + `TODAY_FOCUS_ENABLED=off` branch; the permanent "Find more Matches" button beside the hero; the 3-step checklist as hero (demote to a quiet self-dismissing setup line).

### C. Ask - *"Talk to me after anything that happened"*
Voice-first capture brain. The mic is the hero; type is an equal fallback. Auto-classifies three intents (no mode picker): **Offer** → Idea, **Person** → Circle + signal, **Win** → Stream EARNED. Every capture **resolves in place into a Match + drafted Move** - never bounces to Today as a static card.
- **ONE primary action:** `Send it` (capture flows straight to a drafted move) - or `Edit → Send`.
- **States:** `idle → listening (live waveform) → understanding ("Finding who this is for in your Circle…") → result (Idea + person + draft + Send)`. Empty-Circle is honest: *"Strong idea. I just need people to match it against."* + one import button.
- **Personalized starters (war-story framed):** *"What's a problem you fixed that you'd happily fix again?"* - extracts the offer from a story she *can* tell.
- **KILL:** the text-only screen + "coming soon"; the generic intimidating placeholder; the bounce-to-Today; the context-blind `extract-ideas` call; the client-guessed `posture`.
- **Honesty rule:** no fabricated live transcript - waveform + truthful "listening…", render transcript when it returns.

### D. Ideas → Match → Stream loop + Streams - *"A pipeline you can watch fill"*
Ideas and Streams are the **same object at two maturities**, shown on one ribbon. Internal stages exist but **the user never reads jargon** like "Line"/"Spark". Every card carries a truthful `fit → reached → replied → earned` funnel and **exactly one verb**. Matches no longer vanish on send - they graduate down the funnel as visible proof of motion.
- **ONE primary action per card:** the verb that advances it (`Sharpen it` / `Find who fits` / `Review` / `Follow up` / `Log revenue`).
- **Keystone - "Sharpen" is react-not-generate:** the AI pre-fills pain/ICP/price from identity; the user edits down. Never a blank ICP field.
- **Streams shows the whole ladder from day one** (not a void until revenue), with a portfolio total on top: *"$14k earned this month · $20k target."*
- **Graduation is a felt moment:** when a won match logs its first dollar - *"[Idea] just earned its first dollar. It's a Stream now."*
- **KILL:** static read-only Idea cards; the verb-less `StreamRow`; the global `canRun` gate (scope match runs per-idea); matches dropping after approval; the Streams empty void; "Prototyping / $0" as a terminal chip.
- **Critical build dependency:** the **won → Stream + first ledger entry write-path does not exist and must be built** - without it every Streams pixel is dead UI.

### E. Circle (connect + extension + manual add) - *"A full Circle in 60 seconds, no repo, no token"*
One shared scaffold (value → trust → action → live count). **Manual add (voice/paste/photo) is the primary on-ramp** because it always works and needs no tier. Connect is a quiet secondary. The empty-Circle screen is the **most directive in the app**, not the emptiest.
- **ONE primary action:** `Add a few people` (voice-hero on mobile: *"Hold and tell me who - 'Priya Nair, CFO I met at the SaaS dinner.'"*).
- **Connect, fixed:** read the JSON error body (`error.context`), branch on the *code* - `upgrade_required` → a calm paywall card, `not configured` → *"this is on us, your account's fine."* **Never** render the generic "non-2xx" string. And don't dangle Connect as a primary CTA to free users 90 seconds in (the real reason is "pay first").
- **Manual-add honesty:** flag guessed vs. extracted fields (the LinkedIn-slug → "Sarah Chen 4a2" fabrication gets a dotted underline + name auto-focus); a failed parse becomes a 2-second "what's their name?", never an error.
- **Extension - descope, don't overbuild:** the SSO-handshake + Web Store publish is weeks behind a Google review queue. **P0 = hide `ExtensionPair` entirely** (kills the raw-token leak and the "see the repo" instruction). The handshake is P3.
- **KILL:** the base64 session textarea + "Copy pairing token"; "see the extension folder in the repo"; rendering `error.message`; the `toast.loading` import feedback (use a persistent banner + count-up); "Nothing waiting" as empty-Circle.

### F. Sunday Letter - *"The ritual that owns Sunday"*
Calendar-aware. **Sat–Mon it claims the blotter** as a full-bleed sealed-letter takeover with the 90-second audio pulled up; Tue–Fri it's one quiet line. Push-delivered Sunday 8am (`push_subscriptions` exists). Always does three jobs: name the week's motion, honestly state the pipeline, **end with one move for Monday.**
- **ONE primary action:** `Listen (90s)` or `Read`.
- **Copy:** *"Your week, in one read. $14k of $20k - one good conversation from target. Here's where I'd start Monday."*
- **KILL:** the permanent low-in-stack `SundayLetterCard` position.

---

## 5. VISUAL & TYPE SYSTEM

**Display face:** **`Gobold High`** (the tall condensed cut - premium/instrument, not poster). One face, one role.
- **Hero / display:** sentence case, tracking **−0.01em**, **36px mobile / 44px desktop**, line-height 1.05.
- **Big numerals (EARNED, month, counts):** `Gobold Thin`, tracking **−0.02em**, `tabular-nums`.
- **Overline (the ONLY caps register):** **Satoshi** 700, **+0.14em**, uppercase, 11px.
- **GoBold appears ≤3 moments per screen, never below 22px.** Card/section titles move to **Satoshi 600** - this is the literal fix for "every heading looks like the logo" (today `title-1/2` use `var(--font-display)`).
- **KILL for product:** `Gobold Bold` (door-slam), `Hollow/CUTS/Extra/Uplow/Lowplus` (novelty - marketing only).
- **Hard blocker:** GoBold is **personal-use-only**; **buy the commercial license** before shipping. Self-host the 2 cuts + Satoshi in `/public/fonts` (drop the `cdnfonts.com` CDN), `font-display: swap`, preload `Gobold High`.

**Body:** **Satoshi**, kept.
**Color / theme:** **Dark-first.** Promote the existing `.dark` "walnut desk" tokens to `:root`; light becomes opt-in `.light`. The night-shift metaphor *is* the brand and matches when the anxious operator actually opens the app (evening).
**Accent discipline:** **Seal Red (`8 62% 54%`) once per screen**, on the single highest-intent action only. Rings/links/progress/secondary → neutral warm ink. **`success` green** reserved exclusively for "this earned money."
**Elevation:** collapse three shadow systems into one 3-step lightness ramp (e0/e1/e2). KILL glass, gradient-mesh, all idle glow loops.
**Motion:** one easing `cubic-bezier(0.16,1,0.3,1)`; three durations (150/260/420ms); content *settles*, never bounces; one "seal reveal" delight (Sunday Letter, new Match); the voice waveform is the only thing that animates at idle. No 0→142 odometer on import.

**Mobile vs desktop (two postures):**
- **Mobile (primary): the bedside instrument.** Single-column, one decision, voice-first Ask, full-bleed swipeable Match card, Sunday takeover.
- **Desktop (secondary): the command centre.** Needs a real spec (Open Decision #5). Direction: three regions (left rail with persistent EARNED north-star dial · center triage stream · right inline Move editor). **No force-directed Circle graph** (hairball at 600 nodes) - use a filterable, sortable Circle table.

---

## 6. VERIFIED BUG REMEDIATION

| # | Breakage | Root cause | Fix | Sev | Conf |
|---|----------|-----------|-----|-----|------|
| 1 | Connect shows generic "Edge Function returned a non-2xx status code" | supabase-js puts the JSON body on `error.context`, not `error.message`; components render `.message`. The real cause is usually the **403 free-tier paywall** (`getUserTier`→`free`), not a missing secret | Read `error.context.json()`, branch on the *code* (`upgrade_required`→paywall card, `not configured`→"on us"). Verify the 4 OAuth secrets in prod. Don't surface Connect as a primary CTA to free users | Blocker | Confirmed |
| 2 | Extension uninstallable; pairing exposes full `access_token`+`refresh_token` as raw base64; "see the repo" | Load-unpacked only, no Web Store; `ExtensionPair` base64-bundles the live session into a textarea | **P0: hide `ExtensionPair` + the token UI entirely.** Tokenless SSO handshake + Web Store = P3 | Blocker | Confirmed |
| 3 | Contacts "barely get interpreted" | NOT silent fingerprint drops - `personFingerprint` is OR-logic (name-only survives). Real causes: LinkedIn-slug fabricates a confident fake name; missing `OPENAI_API_KEY`→opaque 503; strict CSV aliases; failed parse dead-ends | Flag guessed-vs-extracted fields (dotted underline, auto-focus name on slug-guess); failed parse → "what's their name?" not an error; broaden CSV aliases; specific `missing_api_key` code | High | Confirmed |
| 4 | Profile data never reaches AI → generic output | `extract-ideas` reads `{transcript, posture}` only; match engine + Sunday Letter ignore profile | **Wave 1 (no migration):** inject existing `role/positioning/stages/verticals` into all 3 AI calls. **Wave 2 (flagged):** add inferred identity columns | Blocker | Confirmed |
| 5 | Voice exists but Ask is text-only | `useVoiceRecording`→`transcribe`→`extract-ideas` works in FirstVoice, never wired into AskScreen | Lift the proven chain into AskScreen (component reuse, no backend) | High | Confirmed |
| 6 | Sunday Letter hidden mid-stack | Fixed low position in the Today card stack | Calendar-aware: owns the blotter Sat–Mon, one quiet line otherwise; push 8am Sunday | High | Confirmed |
| 7 | Streams are static dead cards | Worse - **no Stream is ever created anywhere** (`useStreams` read-only; no won→Stream write-path) | **Build the won-match → Stream + first ledger entry write-path** (the actual loop closure), then living cards with one verb each | Blocker | Confirmed |
| 8 | `parse-onboarding` extracts motivation/targets/challenges then discards them | Output never persisted to the profile | Persist into Wave 2 identity columns; reuse in the borrowed-conviction first-run | Medium | Confirmed |

---

## 7. SEQUENCED ROADMAP

**P0 - Unblock the cold-start loop, stop the bleeding (days; ship to a paying customer this week)**
- **Flip `PEOPLE_SEEDING_ENABLED` → true** so named people seed the Circle. *Highest-leverage single change.* **S** · no deps
- **Wire voice into Ask** (reuse FirstVoice chain). **S** · no deps
- **Hide `ExtensionPair` + the raw-token UI** (closes the security blocker + "see the repo"). **S** · no deps
- **Fix Connect error handling:** read `error.context`, `mapError(code)`, paywall vs "on us"; lead free users to manual/CSV not the paywall. **S** · verify prod secrets
- **Inject EXISTING profile columns** (`role/positioning/stages/verticals`) into `extract-ideas` + `run-match-engine`. Kills most genericness, no migration. **M** · no deps
- **Build the won → Stream + first ledger write-path.** Closes the loop's open end. **M** · no deps
- **Replace "Nothing waiting" + empty-Circle dead-ends** with the directive manual-add hero. **S** · depends on seeding

**P1 - Identity foundation + borrowed-conviction first-run (1–2 wks)**
- **Migration: inferred identity columns** (`motivation_type`, `journey_stage`, `target_buyer`, `offer_maturity`, `signature_win`, `identity_statement`, `first_run_transcript`, `first_run_completed_at`) + checks. **M**
- **`extract-identity` edge fn** (infer + propose offer/ICP/people in one pass; `confidence<0.5`→warm low-signal path). **M** · deps migration
- **Rebuild first-run as the 4-screen borrowed-conviction flow** (Welcome → Ask → Proposal → First Move against a warm door). **L** · deps `extract-identity`
- **Inject the new fields into all 3 AI calls, behind a flag;** demote ProfileSettingsSheet to *edit*. **M** · deps migration. *Do not branch pricing/urgency on day-one inference yet - validate quality first.*

**P2 - Actionable loop + Sunday ritual + contact confidence (1–2 wks)**
- **Today move state machine** (always-one-move) + sharpened blotter. **L** · deps P0 loop
- **Ideas/Streams ladder** with truthful funnels + felt graduation; matches stop vanishing. **L** · deps Stream write-path
- **Ask resolves in place** into Match + Move. **M** · deps voice-in-Ask + context envelope
- **Sunday Letter calendar promotion + push.** **M**
- **Manual-add confidence UI** (flag guessed fields, never dead-end). **M**

**P3 - Visual/type system + bespoke desktop + extension (2–3 wks)**
- **GoBold license + self-host + token swap; dark-first flip; ration red; one elevation ramp.** **M** · deps license purchase
- **Desktop command-centre** (3-region, EARNED rail, inline Move editor, Circle *table*). **L** · deps visual system
- **Extension: Web Store publish + tokenless SSO handshake.** **L** · deps Web Store account + Google review

---

## 8. OPEN DECISIONS FOR KRISH

1. **The paywall on Connect - remove it from the cold-start road, or keep it?** Connect is paywalled by design (free tier 403s) and free users also get `matches_per_week: 1`, so an onboarding match run can exhaust the week's quota. *Recommendation: make the entire first session free and ungated (manual-add + 1 guaranteed first move); move every gate behind first value.* This is a monetization decision.
2. **How aggressive: full ground-up rebuild, or staged behind flags?** *Recommendation: P0 ships now to the live app (mostly bug-fixes + one flag flip); P1–P3 behind flags so you can dogfood the borrowed-conviction first-run before it's default.*
3. **Identity inference branching money decisions - yes or no?** *Recommendation: NO at launch.* Use inference for *tone* only; never branch a pricing or panic-amplifying decision on a one-transcript LLM guess until validated on real users.
4. **Light vs dark default.** *Recommendation: dark-first (walnut), light opt-in.* But screenshots ship light and customers may have seen it.
5. **Desktop scope.** *Recommendation: P3, three-region command centre with a Circle table (not a graph).* Unless a key buyer works at a desk, then it moves to P2.
6. **GoBold commercial license.** Personal-use-only today; shipping on a paid product is real legal exposure. *Buy the commercial license (cheap) - gates the entire P3 type system.*

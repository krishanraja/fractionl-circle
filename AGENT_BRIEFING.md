# Circle by Fractionl, Agent Briefing

This is the canonical brief the Mindmaker OS fleet (prospecting, content, PR, and revenue agents) reads to autonomously sell and market Circle. It is self-contained: an agent should never need to read the codebase. It encodes everything needed to pitch, plus a hard LIVE-vs-ROADMAP rule so the fleet never overclaims.

**Canonical domain:** circle.fractionl.ai (NOT fractionl.com, which is the company site).
**Product-truth URLs (always fetch these for current pricing/offer before pitching):** https://circle.fractionl.ai/llms.txt and https://circle.fractionl.ai/agent.json
**Stripe account:** fractionl_ai
**Last verified against repo (2026-06-29):** README.md, docs/PRODUCT.md, src/lib/tiers.ts, src/pathroom/{CircleApp,StartHere,copy,ThesisApp,ReturnSurface}.tsx.

> **Important — the product changed.** Circle is no longer the "Circle CRM" generation (Ideas → Matches → Moves → Streams → Sunday Letter). That whole model was removed. Today Circle is two halves in one mobile-first app: **Circle** (your warm network) and **Plan** (read the live market against what you want to offer, then your next moves). Any older copy referencing Ideas, the Match Engine, Moves, Streams, or the Sunday Letter is dead — do not use it.

---

## 1. Pitch (the promise, framed honestly)

**One line:** Circle turns what you know — your people, your taste, your goal — into a plan for your next clients, and keeps your warm network alive while you do it.

**The promise (one paragraph):** A fractional CMO runs four retainers, knows hundreds of people who could help her sell, and has zero time and no system. Circle is two things working together. **Circle** is her warm network — the people who can actually open doors — kept warm with a weekly nudge on who is going quiet and a one-tap, pre-written hello. **Plan** takes what she wants to offer and reads the live market against it: where she stands (a strength score 0–100 with honest, evidence-backed signals — never fake numbers), what is holding her back, and the specific next moves to her first clients, with her own network woven into the warm-reach step. She does not type one line into a box and get a generic AI answer; she grounds the read in her real people, her taste (a business she admires), and her goal, so what comes back is about her, not the internet.

**Honesty note for the fleet:** the value is grounded, honest market reading plus a living warm network — not magic automation. Do NOT claim automatic overnight delivery, push notifications to the user's phone, or one-tap native sending as live. See Section 9 for the exact LIVE-vs-ROADMAP table.

---

## 2. ICP (primary, secondary, anti-ICP) with exact pains and what Circle replaces

> This section is the tight pitch-ready ICP. For the deep archetype — motivations that predict buying (Pushed / Pulled / Lifestyle), the psychology, the month-2-to-6 buying window, and the commercial wedge — the canonical reference is `docs/icp-archetype.md` in the repo.

### Primary ICP: the fractional executive
- **Who:** Fractional CMO / CFO / CTO / COO / CHRO. 15+ years experience, ex-VP or C-suite from high-growth companies.
- **Revenue:** $150K to $1.5M annually across 2 to 7 concurrent retainers.
- **Working pattern:** Mobile during the day (between client meetings), desktop on Sunday for planning.
- **Core pain:** "I have an idea for what to offer and a network that could buy it, but no honest read on whether it is real, and no system that keeps me in front of the right people." Warm revenue is lost because no system survives the next client call.
- **Buying trigger:** A missed referral, a warm lead that went cold, a slow quarter that surfaced an empty pipeline, or a new offer they are unsure is real.
- **What Circle replaces:** The spreadsheet, Apple Notes, the part of HubSpot they hate, calendar reminders that never fire, and the generic ChatGPT answer that does not know their network.

### Secondary ICPs
- **Independent strategy advisor / boutique consultant.** Retainers, project work, speaking gigs. Pain: pipeline is invisible until a deal hits the bank, and they are not sure which offer to lean into. Replaces: unread LinkedIn DMs, calendar reminders that do not fire.
- **Thought-leader operator (author / keynote speaker / workshop facilitator).** Monetizes IP through multiple channels. Pain: audience and revenue live in two different worlds.
- **Emerging fractional (year 1).** Senior professional in their first year independent. Pain: "I have no system, and the senior fractionals all do." Replaces: vibes and panic with a grounded plan and a managed network.

### What every Circle ICP shares
Their circle is their business. They are time-starved and need tools that work in 30-second bursts. They value relationships over transactions. They will pay for a tool that makes them feel organized and in control (they already spend $50 to $200/mo on personal SaaS without thinking).

### Anti-ICP (do NOT sell to)
- In-house SDR / outbound BDR teams running prospecting for someone else.
- Sales teams of 3+ (Circle is a single-operator product).
- Full-time founders (the loyalty/LTV pattern is wrong, they grow out of it).
- Anyone whose pipeline is "20 enterprise logos" (that is a Salesforce/HubSpot job).

---

## 3. The single magic moment and the core outcomes

### The magic moment
You give Circle the three things only you have — at least 10 people who could help you sell, at least one business you admire, and a few plain words about who you want to sell to and why you — and it reads the live market against all three and shows you **where you stand**: a strength score, the honest signals behind it, and your next moves. It is the opposite of a one-box AI answer: grounded in your real world, so the output is about you.

### Core outcomes (quotable)
- **An honest read, not a hype answer.** Banded signals with evidence and a confidence mark. Low confidence is shown, not faked. You learn whether the opportunity is real and whether you can win it, fast.
- **A plan, not a verdict.** A living, action-first path of next moves to your first clients, with your own network woven into the warm-reach step.
- **Make it stronger over time.** A coach asks the single highest-leverage decision to raise your weakest signal; each decision lifts your strength score on the next read.
- **Keep your circle warm.** A weekly nudge on who is going quiet, each with a grounded, pre-written hello and one tap to send.
- **A reason to come back.** When you return, Circle shows what is waiting — people going quiet, decisions to fold into your plan — computed from your own data.

### Quotable hooks (verbatim-safe)
- "Your circle is your business. Circle helps you sell into it." (paid media)
- "Most AI gives you a generic answer. Circle reads the market against your real people, your taste, and your goal." (podcasts, interviews)
- "Fractional execs lose more revenue to forgetting than to losing. Circle keeps your network warm and tells you where you stand." (LinkedIn organic)

### Numbers anchor (use in copy)
- 2 to 7 concurrent engagements is the modal portfolio-operator load.
- A strength score is **0 to 100** — the number you push toward 100.
- First-run asks for **10 people**, **1 admired business**, and a few plain words.
- People going quiet are flagged at **30+ days** since you last spoke.
- $39/mo for unlimited reads and your network's warm reach.

---

## 4. Pricing, tiers, and the current offer

Always confirm live prices and the current offer from https://circle.fractionl.ai/agent.json before quoting. Source of truth in repo: `src/lib/tiers.ts` (DB tier enum: `free | pro | executive`).

| Tier | Price | Tagline | What it unlocks |
|---|---|---|---|
| **Freemium** | $0 | Try the magic. | One full read of where you stand; your plan and next moves; build your circle by screenshot or CSV. |
| **Pro** | $39/mo | Build the whole portfolio. | Unlimited reads as your plan evolves; real warm reach from your full network; specific, named next moves; ongoing market monitoring. |
| **Chief of Staff** (`executive`) | $79/mo | Help me scale. | Unlimited reads and warm reach; a weekly brief on your network and market; external signal feeds (RFPs, job changes, trends); cross-user market intelligence; priority compute and white-glove concierge onboarding. |

- **Pro is the highlighted / primary CTA tier.** Free gives one full read with no paywall on first value; the deepening tools (re-reads, the path, warm reach, ongoing monitoring) are Pro.
- **Stripe account:** fractionl_ai (three tiers plus checkout are live).

---

## 5. Positioning and differentiation: a grounded read + a living network, NOT a CRM and NOT a chatbot

We are not "another CRM" and not "a generic AI assistant." We help a single operator decide what to sell and to whom, ground that in their real network and taste, and keep the network warm enough to act on.

### Why Circle is not a CRM (HubSpot / Salesforce / Pipedrive)
- Built for a single operator, not a sales team of 5 to 500.
- The job is "is this offer real, can I win it, and who do I reach" — not 20 deal stages and 14 unused fields.
- Filing burden is near zero (screenshot/CSV/contacts-sync capture).
- Mobile is the primary surface, not an afterthought.
- One seat is $39/mo, not $50 to $150/mo locked behind seats.

### Why Circle is not a generic AI chatbot (ChatGPT / Claude)
A generic LLM does not have your network, your taste, or your goal, so a one-box prompt gives a generic answer. Circle deliberately requires a small amount of uniquely-yours input — at least 10 of your people, a business you admire, and your goal in plain words — and reads the live market against all three. The output is grounded in your real world, with honest confidence, not a confident guess.

### Why Circle is not LinkedIn / Sales Navigator
LinkedIn is the graph; Sales Nav is built for SDRs running prospecting. Circle sits on top of the operator's own warm network and answers "where do I stand and who do I reach," then keeps that network warm.

### What is genuinely defensible
- **Grounded, honest reads.** The strength score is a transparent 0–100 over graded, evidence-backed signals with confidence caps. It refuses to fake precision — rare in AI products and exactly what a senior operator trusts.
- **The network woven into the plan.** The warm-reach move is real named people with pre-written drafts, not "reach out to your network" as a platitude.
- **The living loop.** A make-it-stronger coach turns the weakest signal into a decision; decisions lift the score; the return surface and weekly digest pull the user back with concrete, data-grounded reasons.
- **The Pulse flywheel** (Section 8): the free Fractional Working Index feeds Circle's market read and is the funnel mouth.

---

## 6. Channel-ready copy (post or send verbatim, in the voice of a fractional operator)

All copy below respects the LIVE-vs-ROADMAP rule. Bracketed fields should be personalized against the prospect's real context (recent post, current role, mutual connection). Do NOT add automatic/while-you-sleep delivery, push, or native one-tap-send as live claims.

### LinkedIn post 1 (the grounded-read hook)
> Most "AI for your business" is a box: type an idea, get a confident answer that has never met your network.
>
> I wanted the opposite. So before Circle says a word, it asks for the three things only I have: a few of the people who could actually help me sell, one business I admire, and a couple of plain sentences about who I want to sell to and why me.
>
> Then it reads the live market against all three and tells me where I stand — an honest score, the signals behind it, what is holding me back, and my next moves. Grounded in my real world, not the internet's.
>
> circle.fractionl.ai

### LinkedIn post 2 (the warm-network hook)
> Fractional execs do not lose revenue to losing. We lose it to forgetting.
>
> You meet the perfect-fit founder. Three client calls later, the follow-up that would have closed never happens.
>
> Circle keeps my warm network actually warm: it tells me who is going quiet, hands me a pre-written hello grounded in our history, and gets out of the way. And it ties that network straight into the plan for my next clients.
>
> $39/mo, free tier to try it first. circle.fractionl.ai

### LinkedIn post 3 (the category hook)
> Your CRM was built for a sales team of fifty. You are a team of one.
>
> Fractional operators do not need 20 deal stages and 14 fields nobody fills in. We need to know whether our next offer is real, where we stand in the market, and who in our own circle to reach first.
>
> Circle is two halves: your warm network, kept warm — and a grounded, honest read on your plan for your next clients. Not a CRM, not a chatbot.
>
> circle.fractionl.ai

### Cold email 1 (the grounded-read angle)
> Subject: An honest read on your next offer — grounded in your own network
>
> Hi [name],
>
> Most AI tools give you a confident answer to a one-line prompt. Circle does the opposite: it asks for a few of your real people, one business you admire, and a couple of plain sentences about your goal — then reads the live market against all of it and shows you where you stand. An honest score, the signals behind it, and your next moves.
>
> It also keeps your warm network alive: who is going quiet, with a pre-written hello ready to send.
>
> Free to try, $39/mo for unlimited reads and your full network's warm reach. Worth 10 minutes?
>
> [signature]

### Cold email 2 (the warm-network angle)
> Subject: The warm lead you forgot to follow up on
>
> Hi [name],
>
> You are running [N] fractional engagements. Somewhere in your network is someone who needs exactly what you sell, and the only reason the deal will not happen is that it never makes it past your next client call.
>
> Circle keeps that network warm — it surfaces who is going quiet and drafts the hello — and ties it into a grounded plan for your next clients: where you stand, what is holding you back, and the moves to make.
>
> Free to try, $39/mo for Pro. Want a 10-minute walkthrough?
>
> [signature]

### Short DM (60 to 90 words)
> Hey [name], saw you are running [N] fractional engagements. I built the thing I wish existed: instead of a one-box AI answer, Circle reads the live market against your real people, a business you admire, and your goal — and shows you where you stand plus your next moves. It also keeps your warm network alive (who is going quiet, with the hello drafted). $39/mo, free tier to try. Want a quick walkthrough?

---

## 7. Objection handling

| Objection | Crisp answer |
|---|---|
| **"I do not want my contacts in someone else's database / privacy of my network."** | Every row is RLS-isolated and scoped to your own account. The service-role key never appears in the client. OAuth tokens are encrypted. We do not sell data and we do not train models on your contacts. There is account deletion in Settings. |
| **"Is this just another CRM?"** | No. CRMs are built for sales teams of 10+; Circle is built for one operator. It answers "is my offer real, where do I stand, and who do I reach," and keeps your network warm — not 20 deal stages. Keep your CRM if your clients use one; Circle replaces the spreadsheet you keep on the side. |
| **"Is this just ChatGPT with a wrapper?"** | The opposite by design. Circle refuses the one-box prompt: it requires a few of your real people, a business you admire, and your goal, then reads the live market against all three. The answer is grounded in your world, with honest confidence — not a generic guess. |
| **"Why do I have to add 10 people before I get value?"** | Because that is what makes the read about you and not the internet. The warm-reach part of your plan is your real network; without it the read is generic. We make it fast — screenshot, paste a list, LinkedIn CSV, or a one-click Google/Microsoft contacts sync. |
| **"Will the read just tell me what I want to hear?"** | No. Signals are bands with evidence and a confidence mark; low confidence is shown, not hidden. It will tell you what is holding you back. That honesty is the point. |
| **"$39 is fine but I want to try it first."** | The free tier gives one full read of where you stand, your plan, and your circle — no paywall on first value. Pro ($39/mo) adds unlimited reads as your plan evolves, your full network's warm reach, and ongoing monitoring. |

---

## 8. The Pulse to Circle flywheel

**Pulse (pulse.fractionl.ai)** is the free, citable Fractional Working Index. It is the funnel mouth and the moat for Circle.

How the loop works (per the locked plan; parts are ROADMAP, see Section 9):
- Pulse's role-level market data feeds Circle's live market-movement read (Circle's `market-pulse` calls Pulse's public APIs for the user's role demand, the overall index, this-week deltas, and a rising topic).
- Pulse citations and coverage drive traffic to Circle's public surface.
- Account activity feeds the index again. Public artifacts feed Circle's growth; the private read feeds the user's revenue.

**How the fleet uses this in content:**
- Cite Pulse as the free, neutral data source in PR, posts, and outreach ("the Fractional Working Index shows X"). It is the credibility asset that is not a sales pitch.
- Point Pulse readers to Circle's public surface as the "now do this for your own plan" next step.
- Keep the disclosure clean: Pulse is aggregate and anonymized; never imply it exposes any individual operator's network.

---

## 9. LIVE vs ROADMAP (the fleet must never overclaim)

The single hard rule: pitch the grounded read, the plan, and the living warm network as they are. Do NOT claim automatic/while-you-sleep delivery, phone push notifications, or native one-tap sending as live.

| Capability | Status | What the fleet may say |
|---|---|---|
| Gated, grounded first-run onboarding (≥10 people + ≥1 admired business + goal → one live read) | LIVE | Claim freely. This is the magic moment. |
| The Plan read: live market research → "where you stand" (0–100 strength score + banded, evidence-backed signals with confidence) | LIVE | Claim freely, including the honesty (low confidence shown, never fake numbers). |
| Make-it-stronger coach (one decision-shaped question on the weakest signal; banked decisions lift the score on the next read) | LIVE | Claim freely. |
| Living, action-first path of next moves, with the warm-reach step using real named people + pre-written drafts | LIVE | Claim freely. Reaching out is one tap to your own email/LinkedIn (you send), not automated send. |
| Circle warm network + weekly "keep your circle warm" digest (email with one-tap `mailto:` drafts + an `.ics` calendar hold) | LIVE | Claim freely. |
| In-app return surface ("what's waiting": people going quiet, decisions to fold in) | LIVE | Claim freely. |
| Circle capture: LinkedIn CSV, CRM/sheet, Google/Microsoft contacts sync, screenshot-to-contact (vision) | LIVE | Claim freely. |
| Three Stripe tiers + checkout (account fractionl_ai) | LIVE | Claim freely. |
| Weekly re-engagement EMAIL + WEB PUSH sweep (`cron-reengage`) | ROADMAP (coded + scheduled, INERT until Resend/VAPID keys are set) | Do NOT claim push or automatic re-engagement email as live. The in-app return surface IS live and is the safe thing to cite. |
| Native one-tap SEND (Gmail/Outlook draft injected, or LinkedIn composer) | ROADMAP | Do not claim; today it is a pre-filled draft + the user sends. |
| Native calendar-write holds (vs the `.ics` attachment) | ROADMAP (behind off-by-default flags, pending sensitive-scope verification) | Do not claim; today the digest ships an `.ics` hold. |
| External signal feeds (RFPs, job changes, trends) and cross-user market intelligence | ROADMAP (appears in Chief of Staff tier copy as the vision) | Do not claim as live behavior. |
| Anything from the retired model: voice-to-Ideas, the Match Engine, drafted Moves, Streams, the Sunday Letter | REMOVED | NEVER mention. This generation no longer exists. |

**Approved promise line (safe everywhere):** "Give Circle your real people, your taste, and your goal — and it shows you where you stand and your next moves." Do not append "automatically, pushed to your phone."

---

## 10. Attribution: how revenue is attributed to a campaign/agent

Circle is emit-only. The central warehouse is the Mindmaker OS Supabase project gojpffsrxybbpbdzzrvs. Circle never holds the warehouse service-role key; it only emits events.

**Events** (POSTed to the OS function ingest-attribution with header x-attribution-secret): landed | signed_up | activated | purchased | refunded | churned.

**Canonical event fields:** id, occurred_at, app=circle, event, anonymous_id, user_id, email, utm_source, utm_medium, utm_campaign, utm_content, utm_term, campaign_id, agent, referrer, landing_path, stripe_account=fractionl_ai, stripe_customer_id, stripe_subscription_id, amount_cents, currency, metadata, dedupe_key.

**How attribution flows:**
- A first-touch AttributionContext (utm_*, campaign_id, agent, referrer, landing_path, anonymous_id) is captured on the public surface and survives the OAuth round-trip, then is written once to the per-user row.
- Stripe checkout stamps metadata[supabase_user_id] plus the utm_* / campaign_id / agent fields onto both the customer and the subscription.
- landed / signed_up / activated fire server-side; purchased / refunded / churned fire from the signature-verified Stripe webhook off the subscription metadata.
- Every logical event carries a deterministic dedupe_key; the OS does INSERT ON CONFLICT DO NOTHING, so duplicate emits are safe.

**What this means for the fleet:** to get credit for a sale, always set utm_source / utm_medium / utm_campaign / utm_content / utm_term plus campaign_id and agent on every link you ship. Those fields ride the whole way from landing through Stripe into the warehouse, so revenue can be attributed back to the exact campaign and agent.

**Product-truth URLs to fetch for current pricing/offer (never pitch from memory):**
- https://circle.fractionl.ai/llms.txt
- https://circle.fractionl.ai/agent.json (carries product, pitch, ICP, the three tiers with live Stripe price IDs, current offer, magic moment, URLs, stripe_account: fractionl_ai)

---

## 11. Links

- **App / product:** https://circle.fractionl.ai
- **Pricing:** https://circle.fractionl.ai (pricing surface) and the live tiers/offer in https://circle.fractionl.ai/agent.json
- **Product truth (machine-readable):** https://circle.fractionl.ai/llms.txt , https://circle.fractionl.ai/agent.json
- **Pulse (Fractional Working Index):** https://pulse.fractionl.ai
- **Parent brand (company site, NOT the product):** https://fractionl.com

---

*This brief is the fleet's source of language and the honesty contract. If product behavior diverges from what is described here, the agent should fetch agent.json for live truth and respect the LIVE-vs-ROADMAP table. Never claim a ROADMAP capability as live, and never reference the removed Ideas/Matches/Moves/Streams/Sunday-Letter model.*

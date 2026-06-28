# Circle by Fractionl, Agent Briefing

This is the canonical brief the Mindmaker OS fleet (prospecting, content, PR, and revenue agents) reads to autonomously sell and market Circle. It is self-contained: an agent should never need to read the codebase. It encodes everything needed to pitch, plus a hard LIVE-vs-ROADMAP rule so the fleet never overclaims.

**Canonical domain:** circle.fractionl.ai (NOT fractionl.com, which is the company site).
**Product-truth URLs (always fetch these for current pricing/offer before pitching):** https://circle.fractionl.ai/llms.txt and https://circle.fractionl.ai/agent.json
**Stripe account:** fractionl_ai
**Last verified against repo:** 2026-06-28 — README.md, DOCS.md, src/lib/tiers.ts, src/pathroom/CircleApp.tsx, src/pathroom/ThesisApp.tsx.

---

## 1. Pitch (the promise, framed honestly)

**One line:** Circle is the thesis-validation engine for fractional executives — it validates your idea for how you want to fractionalize, in the real market, and breaks the path to your first client into moves you can start today.

**The promise (one paragraph):** A fractional CMO knows what she has done. The hard question is what to offer, to whom, and whether the market actually needs it. Circle answers that question with live research, not an AI's opinion: bring your thesis for how you want to fractionalize (what service you want to sell, and to whom), and Circle goes and checks — Perplexity reads demand against supply, scans where buyers complain, checks competition, maps your warm network, and returns an honest scorecard that says "here is what is real, here is the risk, here is your edge." Then it breaks the terrifying middle into small, validated steps toward the first retained client, with your actual network woven in (real faces on the warm-reach move, lighting up as you add people). One honest read, one living journey, one deepening thesis.

**Honesty note for the fleet:** The one-full-validation free tier and the live Perplexity research are real and live today. "Ongoing market monitoring" (automated re-validation over time) is a future build — do not claim it as live beyond the tiers copy.

---

## 2. ICP (primary, secondary, anti-ICP) with exact pains and what Circle replaces

> This section is the tight pitch-ready ICP. For the deep archetype — motivations that predict buying (Pushed / Pulled / Lifestyle), the psychology, the month-2-to-6 buying window, and the commercial wedge — the canonical reference is `docs/icp-archetype.md` in the repo.

### Primary ICP: the fractional executive
- **Who:** Fractional CMO / CFO / CTO / COO / CHRO. 15+ years experience, ex-VP or C-suite from high-growth companies.
- **Revenue:** $150K to $1.5M annually across 2 to 7 concurrent retainers.
- **Working pattern:** Mobile during the day (between client meetings), desktop on Sunday for planning.
- **Core pain:** "I know what I can do. I do not know exactly what to offer, who to offer it to, or whether anyone will pay for it." Generic positioning kills them; the market is crowding; what worked inside a company does not automatically translate to a one-person go-to-market.
- **Buying trigger:** The first empty pipeline after the first engagement ends — months 2 to 6 of independence.
- **What Circle replaces:** The scattershot LinkedIn post, the expensive positioning consultant, the expensive guess at an ICP, the "I'll figure it out" approach that fails by month 6.

### Secondary ICPs
- **Independent strategy advisor / boutique consultant.** Retainers, project work, speaking gigs. Pain: no validated offer — they do everything for anyone. Replaces: expensive positioning sprints with a consultant.
- **Thought-leader operator (author / keynote speaker / workshop facilitator).** Monetizes IP through multiple channels. Pain: they cannot describe what they sell in one sentence. Replaces: months of expensive brand-positioning work.
- **Emerging fractional (year 1).** Senior professional in their first year independent. Pain: "I have no system and no ICP and the senior fractionals all do." Replaces: panic and expensive early mistakes.

### What every Circle ICP shares
Their thesis — what they offer, to whom, and why they win — is the foundation of their entire business. They are time-starved and need tools that work in 30-second bursts. They will pay for infrastructure that makes them feel organized and credible (they already spend $50 to $200/mo on personal SaaS without thinking).

### Anti-ICP (do NOT sell to)
- In-house SDR / outbound BDR teams running prospecting for someone else.
- Sales teams of 3+ (Circle is a single-operator product).
- Full-time founders (the loyalty/LTV pattern is wrong, they grow out of it fast).
- Anyone whose pipeline is "20 enterprise logos" (that is a Salesforce/HubSpot job).

---

## 3. The single magic moment and the core outcomes

### The magic moment
Bring your rough thesis. In one guided conversation, Circle draws out the who and the what, goes and checks in the real market (~20 seconds of live Perplexity research), and returns an honest scorecard: is this a real opportunity, and can you win it, fast. Then it shows you the path — a living journey map with the first warm moves named, your actual network faces lighting up as you add people. The whole thing on a phone, no blank waiting, no fake precision.

### Core outcomes (quotable)
- **Know what to offer.** The read tells you whether demand is real, where competition crowds, and what your actual edge is — not a consultant's opinion, but live research findings with honest confidence bands.
- **Know who to target.** The journey map names the warm moves: real people from your circle, not a generic "reach out to someone."
- **Stop second-guessing.** The scorecard is honest about thin reads and low confidence. That honesty is the feature.
- **Start moving.** One small, ordered, validated step at a time — not a 20-page strategy deck that never gets executed.
- **Deepen it over time.** Add a business you admire, drop in your LinkedIn CSV, screenshot a business card — the thesis gets sharper as your circle fills in.
- **Know your market is moving.** The home hub shows the live Fractional Working Index (from fractionl-pulse) for your role: demand and the week's delta, so it genuinely changes overnight.

### Quotable hooks (verbatim-safe)
- "You know what you can do. Circle tells you what the market will pay for." (paid media)
- "Not an AI opinion. Live research, honest confidence, real steps." (podcasts, interviews)
- "Most fractionals fail at positioning, not delivery. Circle is the tool that fixes positioning first." (LinkedIn organic)

### Numbers anchor (use in copy)
- 2 to 7 concurrent engagements is the modal portfolio-operator load.
- ~20 seconds of live Perplexity research per run.
- 69% of fractionals cite business development (not delivery) as their number one challenge (State of Fractional survey).
- Free gives one full validation with no paywall on first value.
- Pro ($39/mo) is unlimited re-validation as your thesis evolves.

---

## 4. Pricing, tiers, and the current offer

Always confirm live prices and the current offer from https://circle.fractionl.ai/agent.json before quoting. Source of truth in repo: src/lib/tiers.ts. New accounts get a 14-day Pro-equivalent trial (during the trial the effective tier is Pro until the trial ends).

| Tier | Price | Tagline | What it unlocks |
|---|---|---|---|
| **Freemium** | $0 | Try the magic. | One full thesis validation; the complete read and next steps; build your circle by screenshot or LinkedIn CSV. |
| **Pro** | $39/mo | Build the whole portfolio. | Unlimited thesis validations as your thesis evolves; real warm reach from your full network; specific named next moves; ongoing market monitoring. |
| **Chief of Staff** | $79/mo | Help me scale. | Unlimited Streams and Matches; Sunday Letter as 90-second audio; external signal feeds; cross-user market intelligence; per-category auto-send consent; priority compute and white-glove concierge onboarding. |

**Important for the fleet:** The Chief of Staff tier copy references capabilities (Streams, Sunday Letter, signal feeds) from the retired Circle CRM — they are NOT live in the current product. Do not use Chief of Staff features as selling points. Sell Free → Pro.

- **Trial:** 14-day Pro-equivalent trial for new accounts.
- **Pro is the highlighted / primary CTA tier.** Free gives full value on a single run; Pro unlocks unlimited evolution of the thesis.
- **Stripe account:** fractionl_ai (tiers plus checkout are live).

---

## 5. Positioning and differentiation: a thesis-validation engine, NOT a CRM or a chatbot

Circle is not "another CRM" and not "an AI assistant." It is the thesis-validation engine for portfolio operators: it goes and checks in the real market so the user knows exactly what to offer, to whom, and why they win — before wasting months on the wrong positioning.

### Why Circle is not a CRM (HubSpot / Salesforce / Pipedrive)
- CRMs assume you already know what you sell and who buys it. Circle figures that out first.
- Built for a single operator, not a sales team of 5 to 500.
- No filing burden (screenshot a business card, done), versus heavy discipline CRMs demand.
- Circle's output is a validated thesis and a path, not a pipeline stage or a contact record.

### Why Circle is not Notion / Apple Notes / a strategy doc
Notion is a doc tool. Notes is a memory tool. Neither validates anything, checks the real market, or shows you which step to take next.

### Why Circle is not a generic AI chatbot (ChatGPT / Claude)
Generic LLMs give an opinion on your idea. Circle goes and checks — Perplexity live web research, real market findings, honest confidence bands. A chatbot answer is a guess; Circle's read is grounded in live data.

### Why Circle is not a positioning consultant
A consultant gives you their best thinking, starting at $5K and taking weeks. Circle gives you a live-research-grounded read in 20 seconds, and you can re-run it every time your thesis changes. Free to try.

### What is genuinely defensible
- **Live research grounding:** Perplexity reads the real market so every scorecard is anchored in current findings, not a training-data opinion.
- **Honest uncertainty signalling:** low-confidence findings are flagged, not faked. That honesty is unusual and differentiating.
- **The journey map:** the path to first retained client as a living timeline, with the user's actual warm network woven in. Not a generic to-do list.
- **The corpus:** every run that sharpens the thesis (add an admired business, add LinkedIn CSV, add a business card) makes the next read more precise. It compounds.

---

## 6. Channel-ready copy (post or send verbatim, in the voice of a fractional operator)

All copy below respects the LIVE-vs-ROADMAP rule. Bracketed fields should be personalized against the prospect's real context (recent post, current role, mutual connection).

### LinkedIn post 1 (the thesis hook)
> Most fractional executives know exactly what they have done. The hard question is what to offer, to whom, and whether the market actually needs it.
>
> Generic positioning is invisible now. The market is crowding. What made you great inside a company does not automatically translate to a one-person go-to-market.
>
> I built Circle to answer that question with live research, not a consultant's opinion: bring your rough thesis, and it goes and checks. Reads demand against supply, scans where buyers complain, maps your warm network, comes back with a scorecard that tells you what is real and where the risk is.
>
> Then it shows you the path: small, ordered, validated moves toward the first retained client, with your actual network woven in.
>
> One run is free. No paywall on first value.
>
> circle.fractionl.ai

### LinkedIn post 2 (the honest research hook)
> I have seen a lot of AI tools that give you an opinion on your business idea. Most of it is confident noise.
>
> Circle does something different: it goes and checks. Perplexity live web research, real market findings, honest confidence bands. Low-confidence findings are flagged, not faked. A thin read tells you the thesis needs sharper input, not that everything looks great.
>
> That honesty is the feature.
>
> For fractional executives who need to know whether their positioning is real before spending six months on the wrong lane.
>
> Free to try. circle.fractionl.ai

### LinkedIn post 3 (the journey map hook)
> The terrifying middle of going fractional is not the first engagement. It is the six months after: what do I actually offer, who wants it, and where do I start?
>
> Circle answers that with a living journey map: the path to first retained client as small, validated, ordered steps. The warm-network move shows your actual circle — real faces — lighting up as you add people.
>
> It is not a generic to-do list. It is live research turned into the specific moves you can start today.
>
> circle.fractionl.ai

### Cold email 1 (the positioning hook)
> Subject: For the fractional exec who is second-guessing their positioning
>
> Hi [name],
>
> Most fractional executives I talk to know what they have done. The question eating at them is what to offer, to whom, and whether anyone will pay for it.
>
> I built Circle to answer that with live research: bring your rough thesis, and it goes and reads the real market — demand, competition, where buyers complain, what your edge is. Honest confidence bands, not fake precision.
>
> Then it breaks the path to first retained client into small, validated moves — with your actual warm network woven in.
>
> Free to try, no paywall on first value. $39/mo for unlimited re-validation as your thesis evolves.
>
> Worth 10 minutes?
>
> [signature]

### Cold email 2 (the empty-pipeline angle)
> Subject: The six months after the first engagement
>
> Hi [name],
>
> You are [N] months into fractional work. The first engagement is going well or just ended. The hard question is: what next — and is your positioning actually specific enough to win it?
>
> Circle validates that. Bring your thesis (what you want to offer and to whom); it runs live Perplexity research and returns an honest read on whether it is real, where the risk is, and what your actual edge is. Then it maps the path to the first retained client, with your real network woven in.
>
> Free to try, $39/mo for unlimited re-validation. Want a walkthrough?
>
> [signature]

### Short DM (60 to 90 words)
> Hey [name], saw you are [N] months into fractional work. Built something for exactly this moment: Circle validates your thesis for what to offer and to whom, with live Perplexity research so it is grounded in the real market, not an AI's opinion. Returns an honest scorecard and a path to first client. One run is free. Want to try it?

---

## 7. Objection handling

| Objection | Crisp answer |
|---|---|
| **"I do not want my contacts in someone else's database."** | Every row is RLS-isolated and scoped to your own account. The service-role key never appears in the client. We do not sell data and we do not train models on your contacts. There is a one-click export and a one-click full deletion in Settings, and we publish our security audit. |
| **"Is this just another AI chatbot that gives me its opinion?"** | No. Circle goes and checks. Perplexity live web research, real findings, honest confidence bands. Low-confidence items are flagged, not faked. A generic LLM gives you a guess; Circle gives you a grounded read. |
| **"I have already done positioning work / I hired a consultant."** | Then re-run it here. The market moves; your thesis should too. And unlike a consultant, re-validation is instant and included in Pro. Bring whatever positioning you have; Circle tells you where it holds and where it does not. |
| **"$39 is fine but I want to try it first."** | The free tier gives you one full thesis validation — the complete read and the full journey map. No paywall on first value. Most people upgrade because they want to re-run it as their thesis evolves. |
| **"Will it work for my specific niche?"** | If you can describe the service you want to offer and to whom, Circle can validate it. It reads the real market (Perplexity live research) and is honest when a niche is too thin or too crowded. That honesty is the feature. |
| **"ChatGPT already gave me feedback on my positioning."** | A chatbot gives you its training-data opinion. Circle runs live web research and grounds the read in current findings. It is also honest about low confidence — which a chatbot never is. |

---

## 8. The Pulse to Circle flywheel

**Pulse (pulse.fractionl.ai)** is the free, citable Fractional Working Index. It is the funnel mouth and the moat for Circle.

How the loop works:
- Pulse provides the live market-movement instrument inside Circle's Home hub: the user's role-level demand index, this-week deltas, and a rising topic — so the app genuinely changes overnight.
- Pulse citations and coverage drive traffic to Circle's public surface.
- That traffic converts to accounts; their validated theses and activity feed the index again.

**How the fleet uses this in content:**
- Cite Pulse as the free, neutral data source in PR, posts, and outreach ("the Fractional Working Index shows X"). It is the credibility asset that is not a sales pitch.
- Point Pulse readers to Circle's thesis-validation as the "now validate your positioning against this data" next step.
- Keep the disclosure clean: Pulse is aggregate and anonymized; never imply it exposes any individual operator's data.

---

## 9. LIVE vs ROADMAP (the fleet must never overclaim)

| Capability | Status | What the fleet may say |
|---|---|---|
| Guided dialogue (judge-thesis sufficiency gate + discovery flow) | LIVE | Claim freely. |
| Live Perplexity web research during validation (~20s) | LIVE | Claim freely. |
| Scored read (demand, burning need, crowding, edge, fit, warm reach, credibility) with honest confidence bands | LIVE | Claim freely. |
| Sharpen screen: screenshot an admired business (extract-admire), drop in a business card, add LinkedIn | LIVE | Claim freely. |
| Living journey map (step tracking, warm-network faces, weak-read pivot) | LIVE | Claim freely. |
| Circle: screenshot-to-contact (Gemini vision via extract-contact) | LIVE | Claim freely. |
| Circle: LinkedIn Connections CSV import | LIVE | Claim freely. |
| Home hub with market-pulse instrument (Fractional Working Index, role demand, weekly delta, rising topic) | LIVE | Claim freely. |
| Three Stripe tiers + checkout (account fractionl_ai) | LIVE | Claim freely. |
| 14-day Pro-equivalent trial | LIVE | Claim freely. |
| Ongoing market monitoring (automated alerts, background re-validation) | ROADMAP | Frame as the Pro vision. Today re-validation is user-initiated (manual). |
| Google / Microsoft contact sync (Connect Google / Connect Microsoft) | ROADMAP | The edge functions exist but the UI to trigger them is not exposed in the current live app. Do not claim as live. |
| Browser extension | ROADMAP | Do not claim as live. |
| Automatic push notifications / background overnight delivery | ROADMAP | Do not claim as live. |
| SSG marketing surface and /app move | ROADMAP | Do not claim as live. |
| Match Engine (Idea × Person scoring + drafted Moves) | RETIRED | Dead feature from the old Circle CRM. Do not mention. |
| Voice onboarding → 3 Ideas (FirstVoice / extract-ideas) | RETIRED | Dead feature from the old Circle CRM. Do not mention. |
| Sunday Letter (text or audio) | RETIRED | Dead feature from the old Circle CRM. Do not mention. |
| Concierge booking sheet | RETIRED | Dead feature from the old Circle CRM. Do not mention. |
| Chief of Staff tier features (Streams, Sunday Letter, signal feeds, cross-user intelligence, auto-send) | RETIRED / ROADMAP | These reference the retired CRM and future builds. Sell Free → Pro only. |

**Approved promise line (safe everywhere):** "Bring your thesis. Circle goes and checks — live research, honest read, real path." This is the product truth today.

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

(Note: llms.txt and agent.json are ROADMAP — not yet emitted by the SSG build. Do not fetch these as live truth until they are confirmed live.)

---

## 11. Links

- **Marketing / App:** https://circle.fractionl.ai
- **Pricing:** https://circle.fractionl.ai (pricing surface) and the live tiers/offer in https://circle.fractionl.ai/agent.json
- **Product truth (machine-readable):** https://circle.fractionl.ai/llms.txt , https://circle.fractionl.ai/agent.json
- **Pulse (Fractional Working Index):** https://pulse.fractionl.ai
- **Parent brand (company site, NOT the product):** https://fractionl.com

---

*This brief is the fleet's source of language and the honesty contract. Last verified against the live codebase: 2026-06-28. If product behavior diverges from what is described here, the agent should fetch agent.json for live truth and respect the LIVE-vs-ROADMAP table. Never claim a ROADMAP or RETIRED capability as live.*

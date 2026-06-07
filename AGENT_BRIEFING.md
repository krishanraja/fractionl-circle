# Circle by Fractionl, Agent Briefing

This is the canonical brief the Mindmaker OS fleet (prospecting, content, PR, and revenue agents) reads to autonomously sell and market Circle. It is self-contained: an agent should never need to read the codebase. It encodes everything needed to pitch, plus a hard LIVE-vs-ROADMAP rule so the fleet never overclaims.

**Canonical domain:** circle.fractionl.ai (NOT fractionl.com, which is the company site).
**Product-truth URLs (always fetch these for current pricing/offer before pitching):** https://circle.fractionl.ai/llms.txt and https://circle.fractionl.ai/agent.json
**Stripe account:** fractionl_ai
**Last verified against repo:** 2026-06-07. README.md, DOCS.md, src/lib/tiers.ts, src/App.tsx, supabase/functions/ (all 43).

---

## 1. Pitch (the promise, framed honestly)

**One line:** Circle is the relationship-to-revenue engine for fractional executives, advisors, and portfolio operators.

**The promise (one paragraph):** "Talk to it once. It turns what you said into Ideas, cross-references your Ideas against everyone you know overnight, and drops a hand-drafted Move on the right person while you sleep." A fractional CMO runs four retainers, 200 warm LinkedIn leads, three product ideas she is not sure are real, and zero time. Her CRM is a stale Google Sheet and a Notes file called ideas??.md. Circle automates the exact way she actually closes business (someone she met remembers her, a message goes out, the deal happens) by extracting sellable Ideas from a 90-second voice note, unifying every person she knows across LinkedIn, contacts, the browser, and screenshots into one deduplicated Circle, scoring Idea x Person for fit, and drafting the Move (the DM or email) so all she has to do is hit send. She sells more by sending fewer, better messages to the right people. The AI is the operator. She is the relationship.

**Honesty note for the fleet:** "talk once, wake to a drafted Move" is the product PROMISE and is fair to say as the vision. Do NOT state that automatic overnight, while-you-sleep push delivery is live. Today the Match Engine and drafted Move are real and surfaced via a manual "Surface Matches" action; the push infrastructure exists but is not active in production (VAPID key not set). See Section 9 for the exact line.

---

## 2. ICP (primary, secondary, anti-ICP) with exact pains and what Circle replaces

> This section is the tight pitch-ready ICP. For the deep archetype — motivations that predict buying (Pushed / Pulled / Lifestyle), the psychology, the month-2-to-6 buying window, and the commercial wedge — the canonical reference is `docs/icp-archetype.md` in the repo.

### Primary ICP: the fractional executive
- **Who:** Fractional CMO / CFO / CTO / COO / CHRO. 15+ years experience, ex-VP or C-suite from high-growth companies.
- **Revenue:** $150K to $1.5M annually across 2 to 7 concurrent retainers.
- **Working pattern:** Mobile during the day (between client meetings), desktop on Sunday for planning.
- **Core pain:** "I know I should follow up. I do not have a system that works on the move." Warm revenue is lost because no system survives the next client call, so the follow-up that would have closed never happens.
- **Buying trigger:** A missed referral, a warm lead that went cold, a slow quarter that surfaced an empty pipeline.
- **What Circle replaces:** The spreadsheet, Apple Notes, the part of HubSpot they hate, calendar reminders that never fire.

### Secondary ICPs
- **Independent strategy advisor / boutique consultant.** Retainers, project work, speaking gigs. Pain: pipeline is invisible until a deal hits the bank. Replaces: unread LinkedIn DMs, calendar reminders that do not fire.
- **Thought-leader operator (author / keynote speaker / workshop facilitator).** Monetizes IP through multiple channels. Pain: audience engagement and revenue live in two different worlds. Replaces: Mailchimp plus an expired CRM trial.
- **Emerging fractional (year 1).** Senior professional in their first year independent. Pain: "I have no system, and the senior fractionals all do." Replaces: vibes and panic with structure.

### What every Circle ICP shares
Their circle is their business. They are time-starved and need tools that work in 30-second bursts. They value relationships over transactions. They need accountability more than automation. They will pay for a tool that makes them feel organized and in control (they already spend $50 to $200/mo on personal SaaS without thinking).

### Anti-ICP (do NOT sell to)
- In-house SDR / outbound BDR teams running prospecting for someone else.
- Sales teams of 3+ (Circle is a single-operator product).
- Full-time founders (the loyalty/LTV pattern is wrong, they grow out of it).
- Anyone whose pipeline is "20 enterprise logos" (that is a Salesforce/HubSpot job).

---

## 3. The single magic moment and the core outcomes

### The magic moment
Talk for about 90 seconds, get sellable Ideas, and wake to a drafted Move on the right person. (Framed as the promise/vision per the honesty gate, see Section 9.)

### Core outcomes (quotable)
- **Stop losing warm leads.** Every person you meet flows into your Circle. The Match Engine surfaces them when one of your Ideas fits.
- **Sell more by sending less.** One drafted Move per Match, not a sequence, not a blast. The right thing to say to one person.
- **Get your Sunday morning back.** The Sunday Letter writes itself. You read for two minutes instead of staring at a spreadsheet for an hour.
- **Trust your pipeline again.** Streams are Ideas that earned revenue, the closed-loop view of what is working.
- **Reactivate a dormant network.** Recency x warmth scoring brings forward the people you would otherwise forget.
- **Look organized when it matters.** Mobile capture in seconds means no apologetic "remind me how we met" follow-ups.

### Quotable hooks (verbatim-safe)
- "Your circle is your business. Circle turns it into Streams." (paid media)
- "The AI does not replace the relationship. It replaces the spreadsheet." (podcasts, interviews)
- "Fractional execs lose more revenue to forgetting than to losing. We built the system that does not let you forget." (LinkedIn organic)

### Numbers anchor (use in copy)
- 2 to 7 concurrent engagements is the modal portfolio-operator load.
- 200+ is the modal active LinkedIn-warm network.
- 90 seconds to the first artefact (3 Ideas).
- 1 Match per week on Free, 21/week (3/day) on Operator, unlimited on Chief of Staff.
- $30/mo to make the spreadsheet die.

---

## 4. Pricing, tiers, and the current offer

Always confirm live prices and the current offer from https://circle.fractionl.ai/agent.json before quoting. Source of truth in repo: src/lib/tiers.ts. New accounts get a 14-day Operator-equivalent trial (during the trial the effective tier is Operator until the trial ends).

| Tier | Price | Tagline | What it unlocks |
|---|---|---|---|
| **Freemium** | $0 | Try the magic. | Voice onboarding + 3 proposed Ideas; LinkedIn CSV into your Circle; 1 Match surfaced per week; read-only People view with one enrichment pass; Ask: 5 messages/week. |
| **Operator** | $30/mo | Help me run. | Up to 3 active Streams; 3 Matches surfaced per day (21/week); inbox + calendar connect (inferred Ledger); Ask with memory across sessions; Sunday Letter as text; LLM-powered Circle dedupe. |
| **Chief of Staff** | $79/mo | Help me scale. | Unlimited Streams and Matches; Sunday Letter as 90-second audio; external signal feeds (RFPs, job changes, trends); cross-user market intelligence; per-category auto-send consent; priority compute and white-glove concierge onboarding. |

- **Trial:** 14-day Operator-equivalent trial for new accounts.
- **Operator is the highlighted / primary CTA tier.** Most users upgrade in week 2 because 1 Match/week on Free is too few, not because they are unsure of the product.
- **Stripe account:** fractionl_ai (three tiers plus checkout are live).

---

## 5. Positioning and differentiation: a relationship-to-revenue engine, NOT a CRM

We are not "another CRM" and not "an AI assistant." We are the relationship-to-revenue engine for portfolio operators: the AI is the operator sitting on top of the user's existing graph (LinkedIn, calendar, contacts).

### Why Circle is not a CRM (HubSpot / Salesforce / Pipedrive)
- Built for a single operator, not a sales team of 5 to 500.
- Data model is Ideas x People to Matches to Moves to Streams, not Companies to Deals to Contacts.
- Filing burden is zero (voice-first capture) versus heavy discipline.
- Outbound is one handcrafted Move per Match, not sequences and automation at scale.
- Pipeline view is "an Idea is winning or it is retired," not 20 stages and 14 unused fields.
- Mobile is the primary surface, not an afterthought.
- One seat is $30/mo, not $50 to $150/mo locked behind seats.

### Why Circle is not Notion / Apple Notes
Notion is a doc tool, Notes is a memory tool. Neither runs anything, drafts a Move, or connects what you want to sell to who might buy it.

### Why Circle is not LinkedIn / Sales Navigator
LinkedIn is the graph. Circle is the operator on top of the graph. Sales Nav is built for SDRs running prospecting motions and has zero context on your Ideas, your edits, your past Moves, or your revenue. Circle has all of that.

### Why Circle is not a generic AI chatbot (ChatGPT / Claude)
Generic LLMs do not have your Circle, your Ideas, or your edit history, so they draft generic Moves to generic people. Circle is tuned on your taste (every edit you make to a draft is logged via edit distance) and on your network (every Match scores against your specific people).

### What is genuinely defensible
- The ontology: Sources to Person to Idea x Person to Match to Move to Stream is a model of the actual fractional business. No CRM ships this.
- The edit-distance taste model: every Move you edit before sending is captured, so the AI converges on how you talk. CRMs cannot do this because they do not draft outbound.
- The Sunday Letter as a retention loop: once you have read three, you do not stop.
- Cross-source dedupe with an LLM tiebreaker (Operator+): most contact lists are 30%+ duplicates. Circle makes one Circle from five sources.

---

## 6. Channel-ready copy (post or send verbatim, in the voice of a fractional operator)

All copy below respects the LIVE-vs-ROADMAP rule. Bracketed fields should be personalized against the prospect's real context (recent post, current role, mutual connection). Note: "overnight / surfaces" describes the Match Engine and drafted Move, which are real; the agent must NOT add literal automatic push or while-you-sleep claims as live.

### LinkedIn post 1 (the forgetting hook)
> Fractional execs do not lose revenue to losing. We lose it to forgetting.
>
> You meet the perfect-fit founder at a dinner. Three client calls later, the follow-up that would have closed never happens. Your pipeline lives in your head, and your head is full.
>
> I built Circle for exactly this. Talk for 90 seconds, get 3 sellable Ideas. Drop in your LinkedIn CSV, and your whole network dedupes into one Circle. Then it cross-references what you sell against who you know and surfaces the Matches with the message already drafted. You send fewer, better messages to the right people.
>
> The AI is the operator. You are the relationship. circle.fractionl.ai

### LinkedIn post 2 (the Sunday hook)
> My old Sunday: an hour staring at a CRM I had not touched in three weeks, trying to remember who I was supposed to follow up with.
>
> My new Sunday: a 200-word letter that tells me what shipped this week, what is worth chasing, and what to fix. Then I close the laptop.
>
> That is Circle. It turns the part of fractional work that lives in your head into Streams: the Ideas that actually earn revenue. $30/mo. There is a free tier to try the magic first.
>
> circle.fractionl.ai

### LinkedIn post 3 (the category hook)
> Your CRM was built for a sales team of fifty. You are a team of one.
>
> Fractional operators do not need 20 deal stages and 14 fields nobody fills in. We need the right thing said to one person, on one day. We need our circle (which is our entire business) to actually be managed.
>
> Circle is a relationship-to-revenue engine, not a CRM. Voice in, sellable Ideas out, your network unified across LinkedIn and contacts and screenshots, and a hand-drafted Move on the people most likely to buy what you sell. Every edit you make teaches it to sound more like you.
>
> circle.fractionl.ai

### Cold email 1 (founder-led, the pattern)
> Subject: For the part of fractional work that lives in your head
>
> Hi [name],
>
> Most fractional CMOs/CFOs/CTOs I talk to run their pipeline the same way: a stale Google Sheet, a Notes file called ideas??.md, and the prayer that someone they met two years ago at a dinner remembers them.
>
> I built Circle to automate that exact pattern. Talk for 90 seconds at signup and you get 3 sellable Ideas. Drop in a LinkedIn CSV and your circle dedupes itself across sources. Then an engine cross-references your Ideas against your people and surfaces your best Matches with the DM already drafted, so all you do is hit send.
>
> $30/mo for the version most fractionals use. Free tier to try it. Worth 10 minutes?
>
> [signature]

### Cold email 2 (the missed-referral angle)
> Subject: The warm lead you forgot to follow up on
>
> Hi [name],
>
> You are running [N] fractional engagements. Somewhere in your network is a founder who needs exactly what you sell, and the only reason the deal will not happen is that it never makes it past your next client call.
>
> Circle exists to close that gap. It extracts your sellable Ideas from a 90-second voice note, unifies everyone you know into one deduplicated Circle, scores who fits which Idea, and hands you a hand-drafted Move (the DM or the email) to send. Every edit you make is logged so the drafts converge on how you actually write.
>
> Free to try, $30/mo for Operator. Want a 10-minute walkthrough?
>
> [signature]

### Short DM (60 to 90 words)
> Hey [name], saw you are running [N] fractional engagements. I built the thing I wished existed when I watched fractionals lose warm leads to "I will follow up after this client call." It is called Circle: talk for 90 seconds, drop in your LinkedIn CSV, and it surfaces the Matches between what you sell and who you know with the Move already drafted. $30/mo, free tier to try. Want a quick walkthrough?

---

## 7. Objection handling

| Objection | Crisp answer |
|---|---|
| **"I do not want my contacts in someone else's database / privacy of my network."** | Every row is RLS-isolated and scoped to your own account. The service-role key never appears in the client. OAuth tokens are encrypted. We do not sell data and we do not train models on your contacts. There is a one-click export and a one-click full deletion in Settings, and we publish our security audit. |
| **"Is this just another CRM?"** | No. CRMs are built for sales teams of 10+; Circle is built for one operator. The model is Ideas x People to Matches to Moves to Streams, not Companies to Deals to Contacts. The filing burden is zero (voice-first). Keep your CRM if your clients use one; Circle replaces the spreadsheet you keep on the side. |
| **"Will the AI sound like me?"** | Not on day one, and we do not pretend it does. Circle drafts, you edit, you send. Every edit is logged via edit distance, so the AI converges on your voice over a few weeks. Nothing auto-sends by default; auto-send is opt-in per category and only on Chief of Staff. |
| **"$30 is fine but I want to try it first."** | The free tier is built for exactly that: voice onboarding, 3 Ideas, LinkedIn CSV, 1 Match per week. Most people upgrade in week 2 because 1/week is too few, not because they doubt the product. |
| **"My LinkedIn graph is mostly noise."** | That is the point. The Match Engine pre-filters on recency x warmth x source quality, and Operator-tier dedupe collapses the duplicates (most lists are 30%+). You will be surprised how much signal is there once it is deduped. |
| **"I already use Sales Navigator."** | Sales Nav is the graph, built for SDRs running prospecting. Circle sits on top of your existing graph and runs the operator workflow (Ideas to Matches to Moves to Streams). Different tool, different job. |
| **"Will it work for my coaching / advisory practice?"** | Yes, advisors and coaches are the second-largest cohort. Substitute "Idea" for "service offer" and let the Match Engine answer "who should I follow up with." |

---

## 8. The Pulse to Circle flywheel

**Pulse (pulse.fractionl.ai)** is the free, citable Fractional Working Index. It is the funnel mouth and the moat for Circle.

How the loop works (per the locked plan, parts are ROADMAP, see Section 9):
- Circle's anonymized aggregate signal (with genuine k-anonymity and disclosure) makes Pulse the freshest index in the fractional category.
- Pulse citations and coverage drive traffic to Circle's public surface and the live-mic demo.
- That demo converts visitors into accounts; their activity feeds the index again. Private Brief feeds the user's revenue; public artifacts feed Circle's growth.

**How the fleet uses this in content:**
- Cite Pulse as the free, neutral data source in PR, posts, and outreach ("the Fractional Working Index shows X"). It is the credibility asset that is not a sales pitch.
- Point Pulse readers to Circle's public surface as the "now do this on your own network" next step.
- Keep the disclosure clean: Pulse is aggregate and anonymized; never imply it exposes any individual operator's network.

---

## 9. LIVE vs ROADMAP (the fleet must never overclaim)

The single hard rule: marketing copy may say "talk once, wake to a drafted Move" as the PROMISE/vision, but must NOT state that automatic overnight, while-you-sleep delivery is live until the cron plus push ship. Today, "overnight match" is a manual button and the PWA has no push.

| Capability | Status | What the fleet may say |
|---|---|---|
| Voice onboarding that extracts Ideas (90 seconds to 3 Ideas) | LIVE | Claim freely. |
| Match Engine scoring Idea x Person and drafting a Move (DM/email) | LIVE | Claim, but it is surfaced via a manual action (Surface Matches), NOT automatic overnight delivery. |
| Sunday Letter, text (Operator+) | LIVE | Claim freely. |
| Sunday Letter, 90-second audio (Chief of Staff) | LIVE | Claim freely. |
| Circle capture: LinkedIn CSV, Google/Microsoft contacts, browser extension, screenshot-to-contact (vision), voice | LIVE | Claim freely. |
| LLM cross-source dedupe (Operator+) | LIVE | Claim freely. |
| Three Stripe tiers + checkout (account fractionl_ai) | LIVE | Claim freely. |
| 14-day Operator-equivalent trial | LIVE | Claim freely. |
| Literal automatic "overnight / while you sleep" delivery + push notifications | ROADMAP | Frame ONLY as the promise/vision. Today it is a manual button. The push infrastructure (send-push function, push_subscriptions table) exists but VAPID key is not active in production. |
| Seeding people from the onboarding voice note | LIVE | Claim freely. People seeding from the onboarding voice note is on by default. |
| Trigger layer (job-change / funding / news signals driving Moves) | ROADMAP | Do not claim as live (external signal feeds appear in tier copy as the vision). |
| Voice fingerprint (drafts in your sent-mail/DM style) | ROADMAP | Do not claim; today personalization is the logged edit-distance substrate. |
| Real one-tap sending (Gmail/Outlook draft or LinkedIn composer inject) | ROADMAP | Do not claim; today it is draft + manual send. |
| Public "Signal" share posts | ROADMAP | Do not claim as live. |
| Anonymous live-mic demo at /try | LIVE | Claim freely. Available at circle.fractionl.ai/try — no sign-in required. |
| SSG marketing surface and the /app move (authed app to /app, marketing at root) | ROADMAP | Do not claim as live. |
| Sunday Letter public feed (/feed/sunday-letter.json) | ROADMAP | Do not claim as live. |

**Approved promise line (safe everywhere):** "Talk once, wake to a drafted Move on the right person." This is the product promise. Do not append "automatically while you sleep, pushed to your phone" as a present-tense live claim.

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

(Note: the SSG-emitted llms.txt / agent.json and the attribution wiring are part of the locked plan; treat the URLs as the canonical read target per the contract.)

---

## 11. Links

- **Marketing:** https://circle.fractionl.ai
- **App:** https://circle.fractionl.ai/app (the /app move is roadmap; the authed app is the product today)
- **Pricing:** https://circle.fractionl.ai (pricing surface) and the live tiers/offer in https://circle.fractionl.ai/agent.json
- **Product truth (machine-readable):** https://circle.fractionl.ai/llms.txt , https://circle.fractionl.ai/agent.json
- **Sunday Letter feed:** https://circle.fractionl.ai/feed/sunday-letter.json (ROADMAP)
- **Pulse (Fractional Working Index):** https://pulse.fractionl.ai
- **Parent brand (company site, NOT the product):** https://fractionl.com

---

*This brief is the fleet's source of language and the honesty contract. If product behavior diverges from what is described here, the agent should fetch agent.json for live truth and respect the LIVE-vs-ROADMAP table. Never claim a ROADMAP capability as live.*

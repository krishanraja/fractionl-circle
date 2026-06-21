# Fractionl, Agent Briefing

This is the canonical brief the Mindmaker OS fleet (prospecting, content, PR, and revenue agents) reads to autonomously sell and market Fractionl. It is self-contained: an agent should never need to read the codebase. It encodes everything needed to pitch, plus a hard LIVE-vs-ROADMAP rule so the fleet never overclaims.

**Canonical domain:** circle.fractionl.ai
**Product-truth URLs (always fetch these for current pricing/offer before pitching):** https://circle.fractionl.ai/llms.txt and https://circle.fractionl.ai/agent.json
**Stripe account:** fractionl_ai
**Last verified against repo:** docs/PRODUCT.md, src/lib/tiers.ts, src/pathroom/ThesisApp.tsx. Date: 2026-06-21.

---

## 1. Pitch (the promise, framed honestly)

**One line:** Fractionl is the thesis-validation engine for fractional executives.

**The promise (one paragraph):** Bring your idea for how you want to fractionalize — what you want to offer, and to whom. Fractionl validates it against the real market in the open (live web research, ~20 seconds), tells you honestly whether it is a real opportunity and whether you can win it fast, and breaks the hard middle into small, ordered, validated moves to your first retained client. It is not an answer machine. The value is the opposite of a glib AI reply: it goes and checks, it is honest about what it cannot confirm, and it turns a scary idea into moves you can start.

**Honesty note for the fleet:** free gives one full validation. Pro ($39/mo) gives unlimited re-validations. Do NOT claim ongoing automatic market monitoring is live — it is on the roadmap for Pro but has not shipped yet.

---

## 2. ICP (primary, secondary, anti-ICP) with exact pains and what Fractionl replaces

> This section is the tight pitch-ready ICP. For the deep archetype — motivations that predict buying (Pushed / Pulled / Lifestyle), the psychology, the month-2-to-6 buying window, and the commercial wedge — the canonical reference is `docs/icp-archetype.md` in the repo.

### Primary ICP: the recently independent fractional executive
- **Who:** Fractional CMO / CFO / CTO / COO / CHRO. 15+ years experience, ex-VP or C-suite. 0 to 18 months independent.
- **Core pain:** "I have the capability but I do not know if there is a real market for what I want to offer, or whether I can win it."
- **Buying trigger:** Pipeline goes empty after a first engagement ends. Month 2 to 6 is the window.
- **What Fractionl replaces:** The generic AI chatbot that gives a confident-sounding answer with no research behind it. The expensive consultant. The paralysis of not knowing where to start.

### Secondary ICPs
- **Emerging fractional (year 1).** Has left a corporate role and is figuring out their offer. High anxiety, high urgency.
- **Established fractional pivoting.** Wants to add a new service line or shift ICP and needs to validate before investing.

### Anti-ICP (do NOT sell to)
- In-house employees not planning to go independent.
- Fractionals more than 3 years in who have already validated their thesis through the market.
- Anyone looking for a CRM, a contact manager, or an outbound sequencing tool.

---

## 3. The magic moment

The magic moment is the read: after ~20 seconds of live web research, the user sees an honest scorecard telling them whether their thesis is a real opportunity and whether they can win it, with evidence and confidence bands, not fake numbers. Low-confidence findings are flagged, not hidden.

### Core outcomes (quotable)
- **Know if it is real.** Demand, burning need, crowding (scored as risk), and your edge — with evidence.
- **Know if you can win it, fast.** Fit to you, warm reach, credibility — with honest gaps named.
- **Know what to do next.** A living journey map breaks the hard middle into small, ordered, validated moves to a first retained client.
- **Sharpen it over time.** Add a business you admire, a business card, or your LinkedIn to make the next read more accurate.

### Numbers anchor (use in copy)
- ~20 seconds for live web research to complete.
- 7 scored dimensions across two groups (is it real / can you win it).
- One full validation free, no paywall on first value.
- $39/mo for unlimited re-validation.

---

## 4. Pricing, tiers, and the current offer

Always confirm live prices from https://circle.fractionl.ai/agent.json before quoting. Source of truth in repo: src/lib/tiers.ts.

| Tier | Price | What it unlocks |
|---|---|---|
| **Free** | $0 | One full thesis validation, the complete read and next steps, build your circle by screenshot or CSV. No paywall on first value. |
| **Pro** | $39/mo | Unlimited re-validations as your thesis evolves, real warm reach from your full network, named next moves. Gated through Stripe checkout. Price ID env: `VITE_STRIPE_PRO_MONTHLY_PRICE_ID`. |

**Note:** A third tier (`executive` / Chief of Staff at $79/mo) is defined in code but its feature set for the thesis product has not been finalised. Do not pitch it as a current offer.

---

## 5. Positioning and differentiation: a thesis engine, NOT an AI chatbot

We are not "an AI chatbot" and not "a CRM." We are the thesis-validation engine for fractional executives: the tool that goes and checks whether your idea is real before you commit time and reputation to it.

### Why Fractionl is not a generic AI chatbot (ChatGPT / Claude)
Generic LLMs give a confident-sounding answer instantly with no live research behind it. Fractionl runs live Perplexity web research in the open (~20s), reads your specific background and network, and is honest about what it cannot confirm. Low confidence is shown, not hidden.

### Why Fractionl is not a consultant
A consultant gives you their opinion. Fractionl goes and checks — live web research, real demand signals, real competitive landscape, real evidence. And it costs $39/mo, not $10,000.

### What is genuinely defensible
- Live web research surfaced in the open, so the user can see what was read and why.
- Honesty architecture: scores are bands with evidence, never invented precision; low-confidence findings are flagged.
- The circle woven into the read: warm-reach is scored against the user's actual network, not a generic benchmark.
- The guided dialogue that pushes back on thin inputs before spending a research call.

---

## 6. Channel-ready copy (post or send verbatim, in the voice of a fractional operator)

All copy below respects the LIVE-vs-ROADMAP rule.

### LinkedIn post 1 (the validation hook)
> Most fractional executives I know have the capability. What they are missing is confidence that the market actually wants what they want to offer.
>
> They pitch without knowing if the demand is real. They discount without knowing if the pricing band is defensible. They start building a practice around an idea no one has ever validated against the real world.
>
> Fractionl fixes that. Tell it your thesis in plain language. It runs live web research in the open — sizing demand, checking who else offers it, finding where buyers complain, mapping your network to the people most likely to buy. Twenty seconds later you have an honest scorecard: is it real, and can you win it fast.
>
> One validation free. No paywall on first value. circle.fractionl.ai

### LinkedIn post 2 (the honesty hook)
> The problem with asking an AI whether your fractional thesis is a good idea: it tells you yes.
>
> No research. No live market check. Just a confident-sounding answer that sends you down the wrong path six months faster.
>
> Fractionl does the opposite. It runs live web research in front of you, flags what it cannot confirm, and gives you a scorecard with evidence — not made-up precision. If your thesis has a problem, it names it. If the competition is crowded, it says so.
>
> That honesty is the product. circle.fractionl.ai

### Cold email 1 (the thesis-validation angle)
> Subject: Before you commit to your fractional offer
>
> Hi [name],
>
> Most fractional executives I speak with have already decided what they want to offer. The question they skip is whether there is a real market for it — and whether they specifically can win it.
>
> I built Fractionl to answer that question before you spend months building in the wrong direction. Tell it your thesis. It runs live web research in the open, checks demand and competition and pricing reality, scores your specific edge and warm reach, and gives you an honest read — not a chatbot's confident guess.
>
> One full validation is free. Worth seeing?
>
> [signature]

### Cold email 2 (the empty-pipeline angle)
> Subject: The read on your fractional thesis
>
> Hi [name],
>
> You have the track record. The question is whether the specific offer you are building toward has real demand, a defensible price band, and enough warm reach in your existing network to win the first client without a cold sales motion.
>
> Fractionl validates that thesis against the real market in about 20 seconds — live web research, honest scoring, your network mapped to the buyers. If the read is weak, it tells you what to sharpen.
>
> Free to try. circle.fractionl.ai
>
> [signature]

### Short DM (60 to 90 words)
> Hey [name], saw you are [N months] into going fractional. I built the thing I wished existed before committing to a thesis: it runs live web research in about 20 seconds, scores whether the idea is real and whether you can win it, and breaks the path to a first client into concrete moves. Honest about gaps, not a chatbot yes. Free to try. circle.fractionl.ai

---

## 7. Objection handling

| Objection | Crisp answer |
|---|---|
| **"I already know my offer is good."** | "Probably. Fractionl will confirm it with evidence in 20 seconds — and might tell you one thing about the competitive landscape or pricing band you did not know. First validation is free." |
| **"Can't I just ask ChatGPT?"** | "You can. It will say yes with no research behind it. Fractionl runs live web research in the open and tells you when confidence is low. That honesty is what makes the read actionable." |
| **"I am not sure my thesis is well-formed enough."** | "That is exactly when to use it. The guided dialogue pushes back on thin inputs before running a research call, so you will not waste a validation on a vague idea. It names what is missing." |
| **"Is my data safe?"** | "All data is RLS-isolated to your account. We do not sell your data, we do not train models on it. One-click export and erasure in settings." |
| **"$39/mo after the free tier?"** | "One full validation free, no card required. If the first read is useful, Pro gives you unlimited re-validations as your thesis evolves — which it will." |

---

## 8. LIVE vs ROADMAP (the fleet must never overclaim)

| Capability | Status | What the fleet may say |
|---|---|---|
| Guided dialogue that pushes back on thin inputs | LIVE | Claim freely. |
| Live Perplexity web research (~20s), surfaced in the open | LIVE | Claim freely. |
| Honest scorecard: opportunity (demand, burning need, crowding, your edge) + ability (fit, warm reach, credibility) with bands and confidence | LIVE | Claim freely. |
| Living journey map: path to first retained client, step tracking | LIVE | Claim freely. |
| Sharpen panel: admire a business (feeds your edge), business card (feeds your circle), LinkedIn URL (feeds fit + credibility) | LIVE | Claim freely. |
| Circle: add people by screenshot (vision LLM) or LinkedIn Connections CSV import | LIVE | Claim freely. |
| Free tier: one full validation, no paywall | LIVE | Claim freely. |
| Pro tier ($39/mo): unlimited re-validations, Stripe checkout | LIVE | Claim freely. |
| Ongoing automatic market monitoring over time | ROADMAP | Frame only as the future Pro value prop, not a live feature. |
| Chief of Staff / executive tier features | NOT FINALISED | Do not pitch. |

---

## 9. Attribution: how revenue is attributed to a campaign/agent

To get credit for a sale, always set utm_source / utm_medium / utm_campaign / utm_content / utm_term plus campaign_id and agent on every link you ship. Those fields ride from landing through Stripe into the warehouse.

**Events emitted:** landed | signed_up | activated | purchased | refunded | churned.

**Product-truth URLs to fetch before pitching (never pitch from memory):**
- https://circle.fractionl.ai/llms.txt
- https://circle.fractionl.ai/agent.json

---

## 10. Links

- **App:** https://circle.fractionl.ai
- **Parent brand (company site, NOT the product):** https://fractionl.com

---

*This brief is the fleet's source of language and the honesty contract. If product behavior diverges from what is described here, fetch agent.json for live truth and respect the LIVE-vs-ROADMAP table. Never claim a ROADMAP capability as live.*

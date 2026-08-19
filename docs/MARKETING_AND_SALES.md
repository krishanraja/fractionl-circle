# Circle marketing and sales operating guide

Last verified: 2026-08-16.

This is the commercial training source for human and autonomous agents. It explains how to market and sell the product without inventing evidence. Product capabilities come from [PRODUCT.md](PRODUCT.md). Release proof comes from [DELIVERY_STATE.md](DELIVERY_STATE.md). If this guide conflicts with either, stop using the conflicting claim and follow the higher source.

## Training contract

An agent using this guide must separate three kinds of statement:

| Kind | Meaning | How to use it |
|---|---|---|
| Verified product fact | Present in the current source and verified release | State plainly, within the limits recorded below |
| Commercial hypothesis | A current view of the buyer, pain, or message that has not yet been proven by measured customer evidence | Use to choose an audience or draft a message; never present it as market fact |
| Retired or unverified claim | Old positioning, unsupported research, roadmap, or a result the product cannot prove | Do not use externally |

The primary audience and pain in this guide are commercial hypotheses. The live capabilities, routes, pricing catalogue, trust rules, and known limits are verified product facts.

## The product in plain English

### Promise

> Remember anyone. Find the right person when they can help.

### Expanded description

Circle helps an independent operator save people from whatever they have, remember why each person mattered, browse everyone, and bring useful people back while searching or working through a business idea.

### Simple mechanism

1. Add a person from a name, note, link, email, voice memo, photo, supported contact, Android share, or supported import.
2. Add where you met or another useful detail if you want to.
3. Circle keeps the original input, joins details conservatively, and handles recovery behind the scenes.
4. Browse everyone, ask for a person, or work through an idea.
5. Circle returns saved people with a reason based on saved evidence. The user chooses what to do next.

## Working buyer hypothesis

The best current audience is a fractional executive or independent operator who meets useful people across calls, client work, events, introductions, social profiles, and phone contacts, but does not want to maintain a CRM.

Useful signs include:

- they rely on memory, notes, screenshots, phone contacts, LinkedIn, or several disconnected lists;
- they often remember a useful person after the useful moment has passed;
- where they met and why the person mattered is more valuable than a formal contact record;
- they are developing a business idea, offer, or client plan and need to identify people worth speaking to;
- they work alone or in a small practice and do not need team pipeline administration.

Disqualifying signs include:

- they need deal stages, territory management, forecasting, seat controls, or sales-manager reporting;
- they want bulk automated outreach, automatic introductions, or a system that sends messages for them;
- they expect guaranteed enrichment, guaranteed contact details, or web-wide people search;
- they need native iOS share-sheet intake today.

Do not use the older numerical market claims in [icp-archetype.md](icp-archetype.md). That file is qualitative background only and its figures have not been reverified for this product release.

## Pain and changed belief

### Painful moment

The useful person is already somewhere in the operator's world, but the operator cannot remember the name, the context, or why that person was relevant when a real need appears.

### Common workaround

They search phone contacts, LinkedIn, screenshots, inboxes, notes, spreadsheets, and memory. A traditional CRM can centralise records, but it also asks one person to maintain structure and process that may not fit how they work.

### Cost we may describe

Use qualitative costs only: lost context, delayed recall, repeated searching, forgotten follow-up, and a good contact not being considered when an idea needs outside input. No measured time, revenue, conversion, or success claim is currently available.

### Belief to change

Before: keeping a useful network searchable requires disciplined CRM upkeep.

After: one imperfect note can be enough to preserve the relationship context and make the person findable later.

## Positioning

### Category

Use `personal contact memory` or `relationship memory for independent operators` when a category is needed. Do not call Circle a CRM, sales engagement platform, autonomous relationship manager, or generic chatbot.

### Difference from common alternatives

| Alternative | What it is good at | Circle's difference |
|---|---|---|
| Phone contacts | Keeping names and contact channels | Circle also keeps user-provided context and can return people from a request or idea |
| LinkedIn | Profiles, public identity, and network discovery | Circle centres the user's saved context and does not treat public data as relationship truth |
| Notes or screenshots | Fast capture | Circle turns sparse input into a browsable, searchable person record while preserving the original input |
| Spreadsheet or CRM | Structured records and managed process | Circle asks for less upkeep and is designed around personal recall, not pipeline administration |
| General AI chat | Flexible conversation | Circle retrieves saved people from stored evidence and explains the match |

## Message hierarchy

Use messages in this order:

1. Outcome: remember anyone and find the right person later.
2. Ease: add whatever you have; a name is enough to save.
3. Context: optionally record where you met or why they mattered.
4. Use: browse everyone, ask who could help, or work through an idea.
5. Trust: results point to saved evidence, provider failure has a local fallback, and Circle never sends automatically.
6. Breadth: imports, voice, photos, settings, privacy, and other supporting features.

Do not lead with AI, enrichment, dedupe, providers, schemas, or architecture. They explain how the product works, not why someone should care.

## Approved claims and evidence

| Claim | Status | Evidence | Safe wording |
|---|---|---|---|
| Circle has one signed-in People, Ideas, and You workspace | Verified | `src/pathroom/CircleWorkspace.tsx`; live release evidence in [DELIVERY_STATE.md](DELIVERY_STATE.md) | `People, Ideas, and You are always one tap away.` |
| A user can browse and search saved people | Verified | `CirclePeopleList.tsx`; `WorkingOnInput.tsx`; E2E evidence | `Browse or search everyone you have saved.` |
| Circle accepts several contact input types | Verified with platform limits | [PRODUCT.md](PRODUCT.md#people); [screenshot-to-contact.md](screenshot-to-contact.md) | List only the live inputs. Say Android for OS-level share intake. |
| A name is enough to save a person | Verified | `AddToCircleSheet.tsx`; `ShareContact.tsx`; tests | `Start with a name. Add more only if you want to.` |
| Meeting context is optional | Verified | `AddToCircleSheet.tsx`; `ShareContact.tsx`; E2E evidence | `Add where you met if it will help later.` |
| Exact saved-name recall does not need an LLM or paid search | Verified | `src/lib/theRead.ts`; unit and E2E evidence | Use this exact scope. Do not broaden it to all search. |
| Broader matching can recover locally when a provider fails | Verified with limits | `src/lib/theRead.ts`; unit and E2E evidence | `When wider search is unavailable, Circle can still match against details you saved.` |
| Match reasons use saved evidence | Verified | `theRead.ts`; result components; E2E evidence | `Circle shows why a saved person matched.` |
| Circle can help while a user works through an idea | Verified with provider limits | `ThesisApp.tsx`; `thesisData.ts`; E2E evidence | `Work through an idea and surface saved people worth considering.` |
| Circle never sends a message automatically | Verified product rule | product source and release tests | `You decide whether and how to contact someone.` |
| Free and Pro exist in the code catalogue; Pro is $39 per month | Verified in code, checkout availability not re-proven here | `src/lib/tiers.ts` | Quote only when pricing is relevant. Say `listed at $39 per month in the current product catalogue.` |
| Circle saves time, increases revenue, improves conversion, or creates introductions | Not evidenced | No reliable current measurement | Do not claim it. |
| Users love Circle or achieve a specific outcome rate | Not evidenced | No approved customer proof in this repository | Do not claim it. |

## Product limits to disclose

- Native iOS share-sheet intake and an official Apple Shortcut are not shipped.
- Enrichment, broader semantic search, and idea ranking may depend on providers and can fail.
- Local recovery is grounded in saved evidence, so sparse saved data can produce a limited result.
- Circle does not guarantee interest, availability, relationship strength, complete contact data, or a warm introduction.
- Circle does not send outreach automatically.
- The current code catalogue includes Free and Pro, but this guide does not claim a trial or a specific checkout conversion path.
- The North Star funnel is not yet fully instrumented. Do not quote a `useful recall` number.

## Objection handling

### `Is this another CRM?`

No. Circle is built for personal recall, not pipeline administration. Add what you remember, then browse or ask for the person later. It does not ask you to manage deal stages.

### `Why not use my phone contacts or LinkedIn?`

Those are useful sources. Circle brings supported contacts in and keeps the context you add about why someone mattered. It can then return saved people while you search or work through an idea.

### `Does the AI make up matches?`

Results are tied to details saved in Circle and show a reason. Exact-name recall is local. Wider search may use a provider, but a grounded local path remains available when that provider fails.

### `Will it message people for me?`

No. Circle shows a saved contact action only when a usable channel exists. The user decides whether and how to act.

### `Can I add everyone I already know?`

Circle has entry points for LinkedIn or CRM files, Google, Microsoft, and supported device contacts. Availability and completeness depend on the source and configured connection.

### `Does it work on iPhone?`

The web app works on iPhone with typed, pasted, voice, and photo input. A device-contact picker appears only when the browser supports it. Native iOS share-sheet intake is not shipped.

### `What does it cost?`

The current code catalogue contains Free and Pro, with Pro listed at $39 per month. Do not promise a trial or an entitlement that is not shown in the live checkout.

## Sales conversation protocol

An agent may use these as genuine discovery prompts, one at a time:

1. `Where do the people you meet end up today?`
2. `Tell me about the last time you remembered the right person too late.`
3. `Which detail is easiest to lose: their name, where you met, or why they mattered?`
4. `When you are testing a business idea, how do you decide who to speak to?`
5. `Do you need personal recall, or do you need a team sales pipeline?`

Then:

1. repeat the problem in the buyer's words;
2. connect only the smallest verified Circle capability that addresses it;
3. disclose a relevant limitation before it can surprise the buyer;
4. invite them to try the live product at `https://circle.fractionl.ai/`;
5. never pressure, manufacture urgency, or imply scarcity.

## Approved copy blocks

### One sentence

Circle helps independent operators save people from whatever they have and find the right saved person when they can help.

### Short paragraph

Add a name, note, link, voice memo, or photo. Circle keeps the details together, lets you browse everyone, and brings useful people back when you search or work through an idea. You see why someone matched, and you decide what happens next.

### Product-led call to action

`Start with one person you do not want to forget.`

### Qualification follow-up

`If you want personal recall without maintaining a sales pipeline, Circle is built for that job.`

These are approved starting points, not mandatory scripts. Keep the buyer's own language when it remains truthful.

## Agent operating rules

An autonomous agent trained on this repository may:

- research a prospect using authorised, privacy-safe sources;
- qualify or disqualify against the signals above;
- draft pages, posts, emails, talk tracks, and sales notes;
- recommend an approved claim and link it to its evidence;
- flag missing evidence or a mismatch between public copy and product source.

Without separate human approval and the required external-system access, it may not:

- publish, send, schedule, buy media, change pricing, create discounts, or contact a person;
- claim customer proof, measured outcomes, integrations, or features not recorded here;
- scrape, upload, or expose private contact data;
- infer that a saved person is interested, available, close to the user, or willing to introduce them;
- turn a roadmap item or historical document into current copy.

## Refresh protocol

Update this guide, [AGENT_BRIEFING.md](../AGENT_BRIEFING.md), `public/agent.json`, and `public/llms.txt` together when any of these change:

- the primary user or positioning;
- a live input, route, destination, or trust rule;
- pricing or plan entitlements;
- the availability of iOS share intake, provider-backed search, imports, or automatic actions;
- customer evidence or North Star instrumentation;
- the live promise or public metadata.

Run `npm run docs:check` after the update. That check verifies the core promise, current routes, pricing parity, required agent-training sections, and machine-readable metadata.

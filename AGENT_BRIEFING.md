# Circle by Fractionl: agent briefing

Verified against the active product: 2026-08-10.

Use this file for public-facing facts. If a claim is not in the `Live` section, do not present it as shipped.

## One-line promise

> Keep any clue about a person now. Circle brings back the right person when they can help.

## Who it is for

The primary user is a fractional executive or independent operator who meets useful people across client work, events, introductions, social profiles, and phone contacts, but does not want to maintain a CRM.

They are often busy, mobile, and unsure which relationship will matter later. The pain is not a lack of contacts. It is losing the context that makes a person useful and failing to remember them at the right moment.

Do not pitch Circle to sales teams looking for pipeline administration, seat management, deal stages, or automated outreach.

## Magic moment

The user adds one imperfect clue, then later asks for a person or describes an idea. Circle returns a real saved person, shows why they matched, and leaves the user in control of whether to contact them.

## Live

- One adaptive signed-in surface for saving a clue or finding a person
- Capture by text, link, email, voice, photo, supported device contact, or Android PWA share target
- Optional `Where did you meet?` context after the person is safe
- Raw-clue preservation and the existing fingerprint-dedupe pipeline
- Exact saved-name recall without an LLM or paid search dependency
- Provider-backed described-person and idea ranking with grounded local recovery
- Match reasons based on saved name, title, company, tags, notes, or dossier fields
- Contact actions only when a saved channel exists
- Shared voice input on clue, ask, meeting-context, and profile-positioning fields
- Public privacy and terms routes, plus authenticated consent, export, and deletion controls
- Free and Pro catalogue in `src/lib/tiers.ts`; Pro is listed at $39 per month in code

## Not shipped or not safe to claim

- Native iOS share-sheet intake or an official Apple Shortcut
- Automatic messages, automatic introductions, or sending on the user's behalf
- Guaranteed enrichment or guaranteed AI/provider availability
- Guaranteed interest, availability, relationship strength, or a warm introduction
- A trial, a $30 plan, or a $79 plan
- The retired two-tab Plan/Circle navigation as the current product
- Automatic ongoing market monitoring as a proven current user outcome

## Positioning

Circle is not another CRM. A CRM expects the user to structure, update, and manage a process. Circle accepts the clue the user already has and handles the structure quietly.

Circle is not a generic chatbot. It stores people and provenance, retrieves from saved evidence, and says which evidence matched. It does not rely on a fluent web guess for the basic promise.

Circle is not LinkedIn or a contact book. Those services store profiles and coordinates. Circle preserves why the person mattered to this user and returns them in context.

## Safe public copy

### Short description

Save a name, link, email, photo, voice note, or anything you remember. Add where you met if you want. Circle joins the details quietly and brings back the right person when you ask for someone or test an idea.

### Compact post

Most relationship tools ask you to become a database administrator.

Circle asks for one clue.

A name. A link. A photo. Something you remember from the room.

It keeps the clue, joins what it can, and brings the person back when they can actually help.

### Objection: Is it a CRM?

No. It does not ask you to manage stages or keep records tidy. It is a personal memory layer for people and the context around them.

### Objection: Does it contact people automatically?

No. Circle may surface a contact channel, but the user decides whether and how to act.

### Objection: What if the AI is down?

Exact-name recall and grounded local matching still work from saved evidence. Some wider search or enrichment may be unavailable, and Circle says so.

## Claim discipline

- Say `can` only for a live, verified path.
- Say `may` for enrichment or provider-backed outcomes.
- Never invent a customer number, conversion rate, time saving, or success rate.
- Never claim a person is interested or available.
- Never describe roadmap work as automatic magic.
- Link only routes that exist: `/`, `/auth`, `/share-contact`, `/privacy`, and `/terms`.

## Links

- Product: https://circle.fractionl.ai/
- Sign in: https://circle.fractionl.ai/auth
- Privacy: https://circle.fractionl.ai/privacy
- Terms: https://circle.fractionl.ai/terms
- Machine-readable summary: https://circle.fractionl.ai/agent.json
- LLM-readable summary: https://circle.fractionl.ai/llms.txt

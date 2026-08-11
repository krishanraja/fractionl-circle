# Fractionl Circle design decisions

Append-only record. A decision is locked only after Krish approves the named rendered revision.

## Open direction, 2026-08-10

- Outcome: Contact capture should feel like dropping whatever you have into one place, not selecting a product feature.
- Interaction constraint: The system drafts and detects first. The user confirms only uncertain facts and lightweight relationship context.
- Language constraint: User-facing words must be understandable to a 12-year-old. Avoid internal terms, jargon, and mode names.
- Automation boundary: Dedupe, enrichment, routing, edge-case handling, and timing stay behind the scenes. The interface reports what happened without exposing machinery.
- Status: not locked. Awaiting current-flow evidence, concept divergence, one rendered synthesis, and explicit approval.

## Concept trace, 2026-08-10

- First divergence: three independent generators converged on a universal composer. Rejected before human review because the governing structures were materially alike.
- Second divergence: `empty-chair` began with a current need, `crossed-paths` began with a remembered moment, and `catch-tray` began with a system-owned candidate inbox.
- Judge split: activation judge ranked `empty-chair` first; evidence judge ranked `crossed-paths` first.
- Tie-break decision: `crossed-paths` wins because a moment preserves the original clue, meeting context, time, and uncertainty while asking the user to do the least work.
- Governing spine: a saved moment becomes evidence, evidence becomes a person, and a person becomes one useful next step.
- Restored strengths: accept any input, save the raw clue first, make context optional, keep uncertain identity visible, never silently merge, and never send automatically.
- Minority rationale preserved: `empty-chair` would win if immediate network activation mattered more than capturing people for unknown future use. Its need-first interaction returns later as the Ask output, not the capture prerequisite.
- Rendered synthesis: `docs/mocks/circle-moments-v1.html`.
- Revision fingerprint: SHA-256 `309A042350E94472F187889077D4705E933ACF29DB72FE06DE07EBCA701EDF55`.
- Status: revision 1 is not locked. Awaiting Krish's cold reaction and explicit approval.

## Revision feedback, 2026-08-10

- Exact first reaction: “it looks a bit amateur? I feel like it needs a sophisticated, apple grade look and feel”
- Classification: design system and frame-level execution. The moment-first product spine remains intact.
- Same-spine rejection count: 1.
- Revision 2 direction: replace the poster-like heavy type, outlined cards, hard offset shadow, and lime badge with a quiet product shell, restrained system colour, precise spacing, content-first hierarchy, standard content materials, and translucency only in navigation.
- Current artifact: `docs/mocks/circle-moments-v2.html`.
- Revision fingerprint: SHA-256 `A1DB8B06668CCA9D260864187A5DB40600901BD6261ACECFA106F88F78A24EB9`.
- Rendered evidence: `docs/mocks/circle-moments-v2-mobile.png`; verified at 320x568, 390x844, and 1440x900 with no visible target under 44px, no horizontal overflow, and no browser console warning.
- Approval state: revision 2 is not locked. Awaiting cold review.

## Concept reset, 2026-08-10

- Exact first reaction to revision 2: “Looks better but it still looks a bit 2024, not 2028”
- Classification: design system and conceptual novelty. The second revision still read as a current dashboard plus sheet.
- Same-spine rejection count: 2. Per the design gate, the `crossed-paths` spine is paused and cannot receive another cosmetic revision without an explicit scoped override.
- Reset brief: create three independent, feasible models for a one-handed mobile surface that can capture any clue about a person, accept one optional meeting-context note, preserve raw evidence, avoid silent merges or automatic sends, and surface one relevant person during an ask or idea test. It must use language a 12-year-old understands.
- Non-solution requirements: no card dashboard, stacked forms, mode picker, floating pill navigation, glass-effect imitation, sci-fi ornament, or hardware dependency. The surface should feel adaptive and calm enough to plausibly belong in 2028 while remaining buildable in the current React/Vite/Supabase PWA.
- Data truth: identity can be certain, uncertain, loading, duplicated, or sparse. The interface may report those states but cannot invent certainty.
- Authority: conceptual generation, local rendered synthesis, and QA only. Product implementation remains paused until explicit visual approval.
- Proof threshold: one rendered surface, fresh-context judging, 320x568 / 390x844 / 1440x900 range proof, 44px interaction floor, visible focus, reduced-motion support, no horizontal or nested component scroll, synthetic data only.

## Reset concept trace, 2026-08-10

- Generators: `future_field` produced an ambient evidence clearing; `future_moment` produced a resumable current bundle; `future_intent` produced an intent-adaptive working plane. Each received only the sanitized reset brief and a distinct exploration arm.
- Diversity check: passed. The concepts differed on sequencing, persistence, primary interaction, organizing object, and state model.
- Judges: `future_judge_one` saw intent-plane / current-bundle / clearing. `future_judge_two` saw clearing / intent-plane / current-bundle. Both independently selected the intent-adaptive working plane.
- Tiebreaker: not required because the judges agreed on the winner, hard-constraint pass, and diversity verdict.
- Selected spine: one stable working plane changes depth and action as the system infers “save a clue” or “find a person.” The inference stays visible beside the consequential action and always has a one-tap correction.
- Borrowed capabilities: immediate local preservation; a plain save receipt; one optional where/why question; one person occupying the same plane as the ask; conservative duplicate handling; evidence shown at the point of use.
- Excluded concepts: the resumable moment repeats the rejected governing object and risks cross-person contamination. The clearing is the minority alternative if inference proves unpredictable, but its sparse metaphor risks weak discoverability.
- Current feasibility: the existing app already supports text, paste, photo, voice, semantic retrieval, and evidence-based match reasons. React can drive the adaptive state plane. Supabase can preserve raw evidence and separate uncertain identities. The broken PWA share route remains a required implementation repair, not a concept blocker.
- External signal: 2026 Google Research describes directed, inferred, and real-time interface adaptation as an emerging HCI model; current Apple guidance requires visible uncertainty, reversibility, user control, useful loading feedback, and non-AI fallbacks. These support adaptive behavior and correction, not visual-effects theatre.
- Render risk: if the working plane looks like a bottom sheet or changes before the inferred intent is legible, the concept fails.
- Next artifact: `docs/mocks/circle-hinge-r1.html`.
- Rendered artifact: `docs/mocks/circle-hinge-r1.html`; SHA-256 `CAE57443F5620DB40D9190A65B94BC7BC0813FCB3D4329249B3EDE22F97AB7A6`.
- Rendered evidence: `docs/mocks/circle-hinge-r1-mobile.png`; SHA-256 `F2447A57F03B3D518BA0551ABD1F69B8DD7888BEF0E9F3FFAE60618353F6B269`.
- Range proof: capture, save, ask, and result states verified at 320x568 and 390x844; capture verified at 1440x900. No horizontal overflow, off-screen action, visible target under 44px, browser warning, or console error. Keyboard focus and reduced-motion rules are present.
- Copy proof: no em dash or banned voice term detected in the combined artifact.
- Independent verification: hard constraints passed. A minor trust tension in `Saving a new person` was corrected to `Looks like a new person`; the affected 390x844 render and adjacent 320x568 / 1440x900 capture breakpoints were rerun with no regression.
- Approval state: new-spine revision 1 is not locked. Awaiting rendered cold review.

## Hinge r1 lock, 2026-08-10

- Exact reaction: "looks great now"
- Approval interpretation: explicit positive approval of the rendered Hinge r1 surface after the prior two same-spine rejections.
- Locked artifact: `docs/mocks/circle-hinge-r1.html`; SHA-256 `CAE57443F5620DB40D9190A65B94BC7BC0813FCB3D4329249B3EDE22F97AB7A6`.
- Locked interaction: one stable working plane; visible intent beside the consequential action; one-tap intent correction; raw clue preserved before optional context; one surfaced person at the point of need.
- Locked language: plain, short, and understandable without product vocabulary.
- Carry-forward conditions: no card dashboard, persistent mode picker, floating pill navigation, or automatic external send. Uncertainty, correction, and provenance stay visible.
- Approval state: locked for local implementation. Production release remains separately gated.

## Whole-product consistency brief, 2026-08-10

- Exact request: "make sure the entire app looks visually consistent, right now if doesnt feel that way on the front door etc, the product marketing page is not very inspiring, and also this should be voice input enabled everywhere with whispr."
- Classification: new material front-door surface plus a product-wide interaction-system requirement. Hinge r1 remains the locked visual and behavioral source of truth.
- Visual contract: the same warm upper field, pale working plane, fine dark rules, violet signal, Circle mark, typographic hierarchy, square actions, visible uncertainty, and calm state changes carry from the product to the front door and account handoff.
- Language contract: explain one concrete loop in words a 12-year-old understands. The visitor sees clue saved, details joined quietly, and one person useful later. No product category pitch, feature grid, or internal terms.
- Voice contract: every product field that accepts a natural-language clue, question, note, or answer gets the same optional voice control. Email, password, account, consent, file, and other structured or sensitive fields stay typed or native. Microphone permission appears only after a deliberate tap. Type and attachment paths remain complete fallbacks.
- Runtime truth: the existing authenticated `transcribe` edge function already uses OpenAI Whisper model `whisper-1`. This requirement extends one shared interaction pattern; it does not add a second transcription provider.

## Front-door concept trace, 2026-08-10

- Generators: `frontdoor_threshold` explored a spatial threshold, `frontdoor_proof` explored an answer-first evidence record, and `frontdoor_voice` explored a voice-led single composer.
- Diversity check: passed. The concepts differed on first visible moment, governing structure, sequencing, conversion point, and the role of voice.
- Judges: `frontdoor_judge_one` saw voice / proof / threshold. `frontdoor_judge_two` saw threshold / voice / proof. Both independently selected the spatial threshold.
- Selected spine: "One clue now. The right person later." A saved clue, quiet join, and useful return occupy one continuous plane. The same plane becomes the visitor's input and then the account handoff.
- Borrowed capabilities: one optional text / voice / attachment composer from the voice concept; one concrete business question, reason, and uncertainty boundary from the proof concept.
- Excluded concepts: the voice-led headline made speech feel required; the answer-first rewind carried too much narrative and could feel staged.
- Current artifact: `docs/mocks/circle-front-door-r1.html`; SHA-256 `66A2F943FFAF8C39A8C0CCE4EC197F27ED1276B38E971943E3B14255AEF56A4D`.
- Range proof: rendered at 320x568, 390x844, 1280x720, and mechanically at 1440x900. No horizontal overflow, proof / entry overlap, clipped active control, or visible interaction target under 44px remains. Voice on / off and the inline Google / email account handoff were exercised. Keyboard focus and reduced-motion rules are present.
- Copy proof: zero em dashes and zero banned-voice matches in the artifact.
- Approval state: revision 1 is not locked. Awaiting Krish's cold reaction and explicit approval before `AuthPage` or shared product styles change.

## Front-door r1 approval and fit correction, 2026-08-10

- Exact reaction: "approved, but some components are cramped and the hero text wraps weirdly, ensure these never happen anywhere"
- Approval interpretation: the spatial-threshold spine, product demonstration, visual system, and account handoff are approved. The cramped intermediate viewport and stranded hero word are frame-level execution defects, not a new material direction.
- Locked source: `docs/mocks/circle-front-door-r1.html`; approved concept fingerprint `66A2F943FFAF8C39A8C0CCE4EC197F27ED1276B38E971943E3B14255AEF56A4D` before the routine fit repair.
- Required system correction: display phrases have explicit line groups and fit without a one-word final line; every flex and grid child has a real shrink path; intermediate widths get content-led layout changes; long text wraps without pushing actions or status out of view; natural page flow replaces fixed-height stacking when content no longer fits.
- Regression range: 320, 360, 390, 430, 600, 720, 820, 1024, 1280, and 1440 widths, paired with short and constrained heights. Required failures are horizontal overflow, region overlap, clipped active controls, target below 44px, single-word hero widow, and a component-owned scrollbar.
- Status: approved for local implementation with the fit correction as a carry-forward condition. Production release remains separately gated.

## Visual information layer and fit proof, 2026-08-10

- Exact follow-up: "one more thing, it should be a bit more visual than it is - right now it just feels like walls of text. the visualization of information should be better"
- Classification: information hierarchy inside the approved front-door spine. This does not reopen the locked visual system or interaction model.
- Visual correction: the proof is now a numbered clue -> person -> useful moment sequence. A person token, evidence chips, relationship line, question, and surfaced answer carry the meaning before supporting text does.
- Restraint rule: visualization must explain state, provenance, connection, or sequence. It cannot become decorative illustration, a card dashboard, or fake data certainty.
- Updated front-door artifact: `docs/mocks/circle-front-door-r1.html`; post-fit SHA-256 `DD599901B11FE7BA98BD4FE69E0824B70D6F7FB57302F74D8FA151CC2FBE4A15`.
- Updated Hinge artifact: `docs/mocks/circle-hinge-r1.html`; post-fit SHA-256 `E9E4739B217F6E1915777CC84AD773B0F7C94C8E74A60870505702255293A9B0`. The original approved fingerprint remains the design lock; this revision contains only the shared fit threshold, wrapping safeguards, and voice affordance.
- Range proof: the live React front door passed 320, 360, 390, 430, 600, 720, 820, 1024, 1280, and 1440 widths. The sign-in and join gates passed 320 through 1440. The Hinge capture state passed the full range; saved and result states passed 320, 820, and 1440.
- Failure checks: zero horizontal overflow, clipped active control, visible target below 44px, component-owned scrollbar, region overlap, or hero line break outside the two approved line groups.

## Release candidate lock, 2026-08-10

- Exact final visual reaction: "looks great now"
- Exact execution authority: "i approve you to run everything autonomously from here"
- Product commit: `86cf62e` on `codex/circle-hinge-release`.
- Locked implementation: the approved Hinge working plane, spatial-threshold front door, visual evidence sequence, shared Circle system, plain-language voice input, and the fit invariant above.
- Completed repair: the manifest share target now has a real `/share-contact` route with sign-in preservation, editable confirmation, one-save behavior, and manual recovery.
- Completed recovery: exact-name recall and idea-led local evidence ranking keep the core promise available when a paid or provider-backed path fails.
- Verification: 74 tests, TypeScript, lint with zero errors, production build, diff check, secret scan, authenticated persistence, and the 320px through 1440px responsive range passed.
- Production boundary: preview and production must use the exact committed artifact. Current production deployment `dpl_9jK4JKvqpjrT1Kngg6quprX6aaN5` remains the rollback point until post-release readback passes.

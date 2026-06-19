# Circle, The Path Room, Design Language v0
*2026-06-17. The locked visual + interaction system behind the dream-state vision (`DREAM_STATE_VISION_2026-06-17.md`). Live system view: `/mocks`. No em dashes anywhere (product law).*

## Register
**Quiet instrument.** Near-black canvas, hairline rules, mono tabular numerals, one restrained ember accent, benchmark bands and dials rather than progress bars. Premium is restraint: the surface is almost empty, the engine underneath is exhaustive. The feeling is recognition and quiet command, the opposite of the unsorted CRM the buyer left the C-suite to escape. Explicitly not childish, not gamified, not a stretched-mobile desktop.

## Palette (tokens)
| token | hex | use |
|---|---|---|
| canvas | `#0A0A0B` | app background |
| panel | `#121214` / raised `#17171A` | cards, surfaces |
| hairline | `rgba(255,255,255,0.07)` (strong `0.12`) | rules, borders, ticks |
| ink high | `#ECEBE7` | primary text, marker |
| ink mid | `#8E8E88` | secondary text |
| ink low | `#56564F` | labels, captions, dim ticks |
| accent (ember) | `#E0A23C` (edge `rgba(224,162,60,0.5)`) | the ONE highest-intent thing per region |
| risk | `#CC7777` | concentration / stagnation only |

## Type
- **Display face:** Satoshi. Recognition line 21px / 500 / tracking -0.02em. Decision title 26 to 30px / 600 / -0.025em.
- **Overline (only caps register):** mono, 10px, tracking 0.18em, uppercase, ink-low.
- **Numerals:** mono, `tabular-nums`, tracking -0.02em. All money, percentages, counts, durations.
- **Body:** Satoshi, ink-mid, line-height ~1.5 for the calm read.

## Primitives
- **The Path** — route + faint comparable-cohort tracks, exactly one lit fork (accent), the marker (open dot, ink-high), quiet ticks for the rest. Mobile: horizontal gauge, label only the marker (caption above) + lit fork + landmine (below). Desktop: vertical spine in the left rail.
- **The Gap** — literal state-delta rows: your value vs the cohort, plus a flag (`generic`, `risk`). The anti-generic-AI primitive: the engine can only speak in deltas, so content-free filler cannot render.
- **Benchmark band** — a you-marker against the cohort band/distribution. Never a progress bar.
- **Decision card / Decision Room** — the fork as a question, selectable branches (recommended one accent-edged), benchmark, peer reasoning + named obstacle, resolve in place. Footer states the law: "advances your marker, re-ranks your circle, nothing is sent."
- **Inner-circle row** — disc + name + role tag (`PROOF` / `UNLOCK` / `MULTIPLIER` / `RISK` / `MIRROR`) + one-line WHY. Stateless about your behavior.
- **The Read** — visible, editable state vector (segment / function / stage / network / focus) with an `adjust` affordance. Drives the adaptation; correcting it trains it.

## The laws (violating any one is a failed build)
1. **ONE** accent per region, on the single highest-intent thing.
2. **BAND** not bar. Benchmark bands and dials, never progress bars.
3. **WRAP** not truncate. Label only meaningful points; the rest stay quiet ticks.
4. **FORK** — exactly one lit fork. No queue, no count in a headline, no backlog; the previous decision is silently absorbed.
5. **WHO** — the inner circle is who + why + role, stateless about behavior. Never a CRM, never a last-contacted field.
6. **THINK** not do. We ship the thinking, never the doing. No outreach drafting, send, or sequences.
7. **HONEST** — speak in deltas and sourced cohort patterns; blank what cannot be grounded; "benchmark says" until a real cohort n exists; tier stat provenance.
8. **DASH** — no em dashes anywhere. Period, comma, colon, or "to" for ranges.
9. **GRADE** — instrument-grade and quiet, never childish; full power for the seasoned, day one, never throttled.

## Surfaces shipped as mocks (throwaway fixtures, `src/preview/*Mock.tsx`)
- `/mock-onboarding` — the Read forming (3-frame storyboard). *Input model OPEN, see below.*
- `/mock-path` — The Path home, New first session.
- `/mock-decision` — The Decision Room (niche fork).
- `/mock-seasoned` — Seasoned first session, same engine, inverted physics.
- `/mocks` — this system assembled.

## Open
- **Onboarding input model (to redesign).** Move from a single open voice prompt ("tell me where you are", too vague for a new way of working) to **smart, sequential, AI-rendered intake**: the easiest right input at each micro-step (a quick pick, a short fill, voice always available but never required), enriching The Read organically. Avoid both the vague open question and rigid multiple-choice. The storyboard's structure (Read assembles, then placement) holds; the input method changes.
- **Still to mock:** the living inner circle as its own surface; the lifestyle "hold position" state; a second Decision Room (pricing) to prove the surface generalizes across fork types.

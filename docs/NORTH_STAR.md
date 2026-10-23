# Circle North Star

Ratified: 2026-08-10. Canonical.

## Horizon

> Circle is dormant. If it wakes, the aim is that within three months a thousand operators get a useful recall every week, and none of them ever had to tidy a contact.

Set by Krish on 18 October 2026, and not reached yet. Everything below serves it, every session in this repository works toward it, and only Krish changes it.

## The number

**Useful recalls a week, if Circle is woken**: 1,000 by 25 January 2027, on a front-loaded weekly ladder. Checkpoints: 16 Nov 2026: 68; 14 Dec 2026: 240; 11 Jan 2027: 645; 25 Jan 2027: 1,000. Circle is dormant. If Krish wakes it, the ladder is redrawn from that week to 1,000 within three months.

```yaml north-star-metric
metric: "Useful recalls a week, if Circle is woken"
unit: count
direction: up
target: 1000
deadline: 2027-01-25
ladder_shape: front-loaded
source: "Circle events"
status: paused
ladder:
  - [2026-10-26, 10]
  - [2026-11-02, 27]
  - [2026-11-09, 45]
  - [2026-11-16, 68]
  - [2026-11-23, 97]
  - [2026-11-30, 134]
  - [2026-12-07, 181]
  - [2026-12-14, 240]
  - [2026-12-21, 312]
  - [2026-12-28, 402]
  - [2027-01-04, 511]
  - [2027-01-11, 645]
  - [2027-01-18, 806]
  - [2027-01-25, 1000]
```

Urgency (U1 to U5) is worked out every week from where the number stands against that week's target, by [the harness contract](https://github.com/krishanraja/ai-harness/blob/main/contract/north-star-metric.md). Set by Krish on 23 October 2026.

## The outcome

> A busy independent operator can remember anyone they meet, then receive the right saved person at the moment that person can help.

The product is not the contact record. The product is trusted recall at a useful moment.

## The metric

> **Useful recalls:** the weekly count of users who save a person and later open or act on that same person from a request or idea-validation result.

The count requires both halves:

1. a real person was saved with at least one user-provided detail;
2. Circle later surfaced that person from an ask or idea and the user opened or acted on the result.

A save alone proves capture, not value. A search alone can be a web guess. Useful recall proves that stored context became timely help.

## Supporting measures

- Time from first input to a saved person
- Percentage of saves completed without editing more than the name
- Exact-name recall success rate
- Percentage of provider failures that preserve a useful local result
- Percentage of surfaced people with a visible evidence reason
- Duplicate rate across repeated inputs
- User-reported wrong-person or misleading-match rate

These explain the North Star. None replaces it.

## Product implications

- Capture must accept whatever the user already has, not demand a mode or schema.
- Where the user met someone is optional and fast.
- Dedupe and enrichment stay behind the scenes.
- Exact saved-name recall cannot depend on a paid plan or model provider.
- Every surfaced person must show why they matched.
- Provider failure is additive: wider intelligence may degrade, but saved-person recall remains.
- No automatic external send is needed to count a useful recall. The user stays in control.

## Instrumentation status

The current database records saved people and interaction timestamps, but the complete useful-recall funnel is not yet a single trustworthy metric. Do not quote a production number until all of the following exist:

- an event for a successful person-clue save;
- an event for a person surfaced from exact-name, described-person, or idea flow;
- a later open or contact action tied to that surfaced person and originating ask;
- idempotent user/person/ask keys so retries do not inflate the count;
- a weekly query that joins save to later use without capturing private clue text.

Until then, report the component events separately and label any combined figure as unavailable.

## Revisit trigger

Revisit the metric only if evidence shows that users consistently gain value before a later recall, or that opening/acting is the wrong observable proxy for usefulness. Do not change it merely because another event is easier to count.

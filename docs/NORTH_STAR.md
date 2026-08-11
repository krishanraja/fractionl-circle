# Circle North Star

Ratified: 2026-08-10. Canonical.

## The outcome

> A busy independent operator can keep an imperfect clue about anyone they meet, then receive the right saved person at the moment that person can help.

The product is not the contact record. The product is trusted recall at a useful moment.

## The metric

> **Useful recalls:** the weekly count of users who save a person clue and later open or act on that same saved person from a person request or idea-validation result.

The count requires both halves:

1. a real person clue was saved;
2. Circle later surfaced that person from an ask or idea and the user opened or acted on the result.

A save alone proves capture, not value. A search alone can be a web guess. Useful recall proves that stored context became timely help.

## Supporting measures

- Time from first clue to a safe saved person
- Percentage of saves completed without editing more than the name
- Exact-name recall success rate
- Percentage of provider failures that preserve a useful local result
- Percentage of surfaced people with a visible evidence reason
- Duplicate rate across repeated inputs
- User-reported wrong-person or misleading-match rate

These explain the North Star. None replaces it.

## Product implications

- Capture must accept the clue the user already has, not demand a mode or schema.
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

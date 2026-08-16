# Circle legal-document status

Last reviewed: 2026-08-16.

This index separates implemented product controls from legal drafts. None of
the internal drafts below should be published or used as legal advice until its
gate is complete.

## Current user-facing pages

- Privacy controls and plain-language summary: https://circle.fractionl.ai/privacy
- Terms of use: https://circle.fractionl.ai/terms

Those pages describe the current product. They do not replace a
counsel-approved privacy notice, DPA, or regulatory record.

## Draft status

| Document | Current state | Publication gate |
|---|---|---|
| [Privacy policy](../privacy-policy.md) | Product facts reviewed; unpublished internal draft | Confirm legal entity and address, effective date, age threshold, legal bases, transfer safeguards, provider retention, and any EU representative or DPO requirement |
| [RoPA](../RoPA.md) | Technical processing map reviewed; internal draft | Counsel confirms lawful bases, retention periods, transfer safeguards, and jurisdiction scope |
| [Subprocessors](../../SUBPROCESSORS.md) | Provider inventory reviewed; internal draft | Owner verifies active providers and regions; counsel confirms DPAs and publication wording |
| Customer DPA | Not present in this repository | Counsel drafts and owner approves before any enterprise claim that requires it |

## Owners

- Product and technical facts: repository owner
- Provider activation and contract inventory: repository owner
- Legal interpretation and publication approval: qualified counsel

## Publication checklist

1. Reverify product behavior, active providers, data locations, retention, and
   DSAR coverage against the live environment.
2. Resolve every gate in the table above.
3. Obtain counsel approval and record the approval date and version.
4. Publish through the approved customer-facing surface.
5. Verify the public URL, effective date, contact route, and linked terms.
6. Update `COMPLIANCE.md`, `SUBPROCESSORS.md`, and `docs/RoPA.md` in the
   same change.

Until all six steps pass, describe these files as internal drafts.

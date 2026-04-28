-- Quick-add: a first-class source kind for single-person manual additions
-- entered directly in the app (typed name + free-text, pasted URL/handle,
-- or anything that isn't a screenshot, voice, or bulk import).
--
-- Screenshots already have `business_card_photo`, voice already has
-- `voice_seed`, share-sheet ingestion already has `share_sheet` — none of
-- those fit a hand-typed "I just met someone" entry. Adding a dedicated
-- value keeps source attribution honest and lets us measure how much of
-- the Circle is built from in-app quick-adds vs. imports.

alter type source_kind add value if not exists 'manual_add';

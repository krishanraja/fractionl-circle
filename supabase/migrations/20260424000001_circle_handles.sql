-- Phase B: promote social handles to first-class columns on circle_person.
--
-- JSONB rather than per-platform columns so adding Threads / Bluesky /
-- whatever-comes-next never requires another migration. Shape:
--   {
--     "linkedin":  "https://www.linkedin.com/in/jenna-park",
--     "instagram": "https://instagram.com/jenna.park",
--     "tiktok":    "https://www.tiktok.com/@jenna.park",
--     "x":         "https://x.com/jennapark",
--     "whatsapp":  "+15551234567"
--   }
--
-- The existing top-level `linkedin_url` column stays as the canonical
-- LinkedIn URL (many queries and the Match Engine read it directly) — we
-- mirror the value into `handles.linkedin` at ingest time for symmetry.

alter table circle_person
  add column if not exists handles jsonb not null default '{}'::jsonb;

-- Backfill: mirror existing linkedin_url into handles.linkedin so the
-- primary-contact resolver finds the same URL whether it looks at the
-- dedicated column or the JSONB blob.
update circle_person
set handles = jsonb_set(coalesce(handles, '{}'::jsonb), '{linkedin}', to_jsonb(linkedin_url), true)
where linkedin_url is not null
  and linkedin_url <> ''
  and (handles ? 'linkedin') is not true;

-- Cheap GIN index for the occasional "who has an Instagram handle?" query.
-- Small footprint because the blob is ~5 keys per row; worth it for the
-- handles-aware signal scanner we'll build once data lands.
create index if not exists circle_person_handles_gin
  on circle_person using gin (handles jsonb_path_ops);

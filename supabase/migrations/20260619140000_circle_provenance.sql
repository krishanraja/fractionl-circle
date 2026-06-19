-- Provenance + freeform note for circle people added via screenshot or CSV import.
alter table circle_person add column if not exists source text;
alter table circle_person add column if not exists note text;

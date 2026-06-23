-- Deep LinkedIn enrichment for circle people: a status machine plus a structured
-- dossier of everything we could pull from public sources. The human-readable
-- one-liner keeps flowing into the existing circle_person.note column.
alter table circle_person add column if not exists enrichment_status text not null default 'none';
alter table circle_person add column if not exists enrichment_last_attempt_at timestamptz;
alter table circle_person add column if not exists enrichment_failure_reason text;
alter table circle_person add column if not exists dossier jsonb not null default '{}'::jsonb;

comment on column circle_person.enrichment_status is
  'none | pending | done | failed | no_keys | needs_disambiguation';

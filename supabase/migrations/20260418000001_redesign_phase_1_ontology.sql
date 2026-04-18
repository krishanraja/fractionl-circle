-- Phase 1 of the redesign: the new ontology.
-- Introduces the tables that power the Match Engine + Circle Ingestion flagships.
-- Existing CRM-shaped tables (clients, opportunities, activity_logs, talent_contacts, ...)
-- are left in place for this migration and are scheduled for deprecation in a
-- follow-up once features have migrated off them.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type source_kind as enum (
  'google',
  'microsoft',
  'linkedin_csv',
  'linkedin_extension',
  'instagram_export',
  'facebook_export',
  'x_export',
  'legacy_crm_csv',
  'sheet_upload',
  'ios_contacts',
  'ios_shortcut',
  'share_sheet',
  'voice_seed',
  'external_enrichment',
  'business_card_photo',
  'inbox_signature_scan',
  'calendar_backscan'
);

create type source_status as enum (
  'connecting',
  'ingesting',
  'active',
  'stale',
  'revoked',
  'failed'
);

create type idea_status as enum (
  'proposed',
  'voiced',
  'active',
  'retired'
);

create type signal_subject as enum (
  'person',
  'market'
);

create type signal_kind as enum (
  'job_change',
  'promotion',
  'fundraise',
  'hiring',
  'public_post',
  'mention',
  'rfp',
  'trend',
  'calendar_meeting',
  'email_interaction',
  'other'
);

create type match_state as enum (
  'new',
  'approved',
  'edited',
  'sent',
  'won',
  'cold',
  'declined'
);

create type move_channel as enum (
  'email',
  'linkedin_dm',
  'sms',
  'call',
  'calendar_invite',
  'post',
  'other'
);

create type move_state as enum (
  'draft',
  'approved',
  'sent',
  'responded',
  'declined'
);

create type stream_state as enum (
  'prototyping',
  'live',
  'paused',
  'retired'
);

-- ---------------------------------------------------------------------------
-- sources: every ingestion source a user has connected
-- ---------------------------------------------------------------------------

create table sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind source_kind not null,
  status source_status not null default 'connecting',
  label text,
  last_ingested_at timestamptz,
  last_error text,
  scope_payload jsonb,
  credentials_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sources_user_id_idx on sources (user_id);
create index sources_user_kind_idx on sources (user_id, kind);

-- ---------------------------------------------------------------------------
-- person_raw: raw ingested person records, one per (source, external id)
-- ---------------------------------------------------------------------------

create table person_raw (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid not null references sources(id) on delete cascade,
  external_id text,
  payload jsonb not null,
  fingerprint text,
  confidence numeric(4, 3) default 0.500,
  circle_person_id uuid,
  ingested_at timestamptz not null default now()
);

create index person_raw_user_idx on person_raw (user_id);
create index person_raw_source_idx on person_raw (source_id);
create index person_raw_fingerprint_idx on person_raw (user_id, fingerprint);
create index person_raw_circle_person_idx on person_raw (circle_person_id);

-- ---------------------------------------------------------------------------
-- circle_person: the canonical, deduped person record
-- ---------------------------------------------------------------------------

create table circle_person (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  primary_email text,
  primary_phone text,
  linkedin_url text,
  company text,
  title text,
  location text,
  tags text[] default '{}',
  avatar_url text,
  last_interaction_at timestamptz,
  response_rate numeric(4, 3),
  warmth numeric(4, 3),
  fingerprint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index circle_person_user_idx on circle_person (user_id);
create index circle_person_user_fingerprint_idx on circle_person (user_id, fingerprint);
create index circle_person_user_email_idx on circle_person (user_id, primary_email);

alter table person_raw
  add constraint person_raw_circle_person_fk
  foreign key (circle_person_id) references circle_person(id) on delete set null;

-- ---------------------------------------------------------------------------
-- ideas: revenue stream concepts (voiced, proposed, inferred)
-- ---------------------------------------------------------------------------

create table ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  one_liner text,
  offer text,
  price_band text,
  icp text,
  status idea_status not null default 'proposed',
  source_transcript_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ideas_user_idx on ideas (user_id);
create index ideas_user_status_idx on ideas (user_id, status);

-- ---------------------------------------------------------------------------
-- signals: events about a person or market that can trigger a Match
-- ---------------------------------------------------------------------------

create table signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject signal_subject not null,
  kind signal_kind not null,
  circle_person_id uuid references circle_person(id) on delete cascade,
  headline text not null,
  detail text,
  source_url text,
  occurred_at timestamptz,
  confidence numeric(4, 3) default 0.500,
  raw jsonb,
  created_at timestamptz not null default now()
);

create index signals_user_idx on signals (user_id);
create index signals_user_person_idx on signals (user_id, circle_person_id);
create index signals_user_kind_idx on signals (user_id, kind);
create index signals_occurred_at_idx on signals (user_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- streams: graduated Ideas with revenue attached
-- ---------------------------------------------------------------------------

create table streams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  idea_id uuid references ideas(id) on delete set null,
  name text not null,
  state stream_state not null default 'prototyping',
  playbook jsonb,
  monthly_target_cents integer,
  retired_reason text,
  activated_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index streams_user_idx on streams (user_id);
create index streams_user_state_idx on streams (user_id, state);

-- ---------------------------------------------------------------------------
-- matches: the flagship object (Idea x Person x Signal x Warm Path)
-- ---------------------------------------------------------------------------

create table matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  idea_id uuid references ideas(id) on delete set null,
  stream_id uuid references streams(id) on delete set null,
  circle_person_id uuid not null references circle_person(id) on delete cascade,
  signal_id uuid references signals(id) on delete set null,
  warm_path jsonb,
  rationale text,
  score numeric(4, 3),
  state match_state not null default 'new',
  surfaced_at timestamptz not null default now(),
  approved_at timestamptz,
  closed_at timestamptz,
  closed_reason text
);

create index matches_user_idx on matches (user_id);
create index matches_user_state_idx on matches (user_id, state);
create index matches_user_surfaced_idx on matches (user_id, surfaced_at desc);
create index matches_person_idx on matches (circle_person_id);
create index matches_idea_idx on matches (idea_id);
create index matches_stream_idx on matches (stream_id);

-- ---------------------------------------------------------------------------
-- moves: drafted actions that activate a Match
-- ---------------------------------------------------------------------------

create table moves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  match_id uuid not null references matches(id) on delete cascade,
  channel move_channel not null,
  state move_state not null default 'draft',
  draft_subject text,
  draft_body text not null,
  final_body text,
  edit_distance integer,
  sent_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index moves_user_idx on moves (user_id);
create index moves_match_idx on moves (match_id);
create index moves_user_state_idx on moves (user_id, state);

-- ---------------------------------------------------------------------------
-- ledger_entries: inferred money in / time out per stream
-- ---------------------------------------------------------------------------

create table ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stream_id uuid references streams(id) on delete set null,
  circle_person_id uuid references circle_person(id) on delete set null,
  occurred_at timestamptz not null,
  amount_cents integer,
  minutes integer,
  kind text not null,
  source text,
  note text,
  created_at timestamptz not null default now()
);

create index ledger_user_idx on ledger_entries (user_id);
create index ledger_user_stream_idx on ledger_entries (user_id, stream_id);
create index ledger_user_occurred_idx on ledger_entries (user_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- RLS: every new table is scoped to auth.uid() = user_id
-- ---------------------------------------------------------------------------

alter table sources enable row level security;
alter table person_raw enable row level security;
alter table circle_person enable row level security;
alter table ideas enable row level security;
alter table signals enable row level security;
alter table streams enable row level security;
alter table matches enable row level security;
alter table moves enable row level security;
alter table ledger_entries enable row level security;

create policy sources_owner on sources
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy person_raw_owner on person_raw
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy circle_person_owner on circle_person
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy ideas_owner on ideas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy signals_owner on signals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy streams_owner on streams
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy matches_owner on matches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy moves_owner on moves
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy ledger_owner on ledger_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger sources_set_updated_at
  before update on sources
  for each row execute function set_updated_at();

create trigger circle_person_set_updated_at
  before update on circle_person
  for each row execute function set_updated_at();

create trigger ideas_set_updated_at
  before update on ideas
  for each row execute function set_updated_at();

create trigger streams_set_updated_at
  before update on streams
  for each row execute function set_updated_at();

create trigger moves_set_updated_at
  before update on moves
  for each row execute function set_updated_at();

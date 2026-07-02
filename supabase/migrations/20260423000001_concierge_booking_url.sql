-- Phase 11 follow-up: let ops drop a Cal.com / Calendly booking URL into the
-- concierge flow so the user can pick a slot themselves rather than writing
-- "Tue mornings PT" into a textarea.

alter table concierge_requests
  add column if not exists booking_url text;

-- Edit-distance log (the taste/voice model foundation).
-- One row per Move state transition from approved/edited -> sent. Holds both
-- the raw draft and the final body the user actually shipped, plus a
-- precomputed distance metric. Future personalization reads this log to
-- learn the user's voice.

create table move_edits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  move_id uuid not null references moves(id) on delete cascade,
  match_id uuid references matches(id) on delete set null,
  channel move_channel not null,
  draft_body text not null,
  final_body text not null,
  draft_len integer not null,
  final_len integer not null,
  edit_distance integer not null,
  normalized_distance numeric(5, 4) not null,
  created_at timestamptz not null default now()
);

create index move_edits_user_idx on move_edits (user_id, created_at desc);
create index move_edits_move_idx on move_edits (move_id);

alter table move_edits enable row level security;

create policy move_edits_owner_read on move_edits
  for select using (auth.uid() = user_id);

-- Intentionally no user INSERT/UPDATE policy - edit logs are always written
-- by the server (edge function or DB function) with the service role key.

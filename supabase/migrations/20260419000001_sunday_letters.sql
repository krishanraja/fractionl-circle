-- Phase 8: Sunday Letter.
-- Stores the weekly narrative artifact generated for each user. One row per
-- (user_id, week_of). Text for Operator tier; audio_url hydrated lazily for
-- Chief of Staff tier once TTS ships.

create table sunday_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_of date not null,
  text_body text not null,
  audio_url text,
  stats jsonb,
  model text,
  created_at timestamptz not null default now(),
  unique (user_id, week_of)
);

create index sunday_letters_user_week_idx on sunday_letters (user_id, week_of desc);

alter table sunday_letters enable row level security;

create policy sunday_letters_owner on sunday_letters
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

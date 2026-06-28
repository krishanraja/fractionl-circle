-- Answers to the proactive "sharpen" questions. Each is a decision the user made
-- that develops their thesis; validate-thesis folds them into the next read so the
-- bands/confidence — and the strength score — rise. Mirrors thesis_inspiration:
-- user-owned, RLS-scoped, newest-first.
create table if not exists public.thesis_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid,                      -- the read this answer was given against (nullable)
  dimension text,                   -- which read dimension it sharpens (e.g. "Your edge")
  topic text,                       -- short topic label
  question text not null,
  answer text not null,
  applied_at timestamptz,           -- set when a re-run has folded it in
  created_at timestamptz not null default now()
);

create index if not exists thesis_answers_user_idx on public.thesis_answers (user_id, created_at desc);

alter table public.thesis_answers enable row level security;

create policy thesis_answers_owner on public.thesis_answers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

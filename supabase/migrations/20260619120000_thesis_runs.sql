-- The user's saved thesis validation runs (so the read persists and is not re-run every paint).
create table if not exists thesis_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thesis text not null,
  background text,
  result jsonb not null,
  created_at timestamptz not null default now()
);
alter table thesis_runs enable row level security;
do $$ begin
  create policy "own thesis_runs select" on thesis_runs for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "own thesis_runs insert" on thesis_runs for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
create index if not exists thesis_runs_user_created on thesis_runs(user_id, created_at desc);

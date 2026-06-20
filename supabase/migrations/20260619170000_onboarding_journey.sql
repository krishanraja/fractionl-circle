-- Onboarding journey redesign: the admire-screenshot feeds the THESIS (not the circle),
-- and the journey map tracks step progress. Both additive and user-owned (RLS).

-- Businesses / people the user admires. Used to sharpen "Your edge" in the read.
-- Distinct from circle_person (which is warm reach). Never used as a contact.
create table if not exists public.thesis_inspiration (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  positioning text,
  kind text,        -- business | person | competitor
  field text,       -- set when it is a different field, so we keep only the transferable part
  why text,         -- what the user wants to take from them (their positioning / offer / pricing / ...)
  created_at timestamptz not null default now()
);

alter table public.thesis_inspiration enable row level security;

drop policy if exists "thesis_inspiration own select" on public.thesis_inspiration;
create policy "thesis_inspiration own select" on public.thesis_inspiration
  for select using (auth.uid() = user_id);
drop policy if exists "thesis_inspiration own insert" on public.thesis_inspiration;
create policy "thesis_inspiration own insert" on public.thesis_inspiration
  for insert with check (auth.uid() = user_id);
drop policy if exists "thesis_inspiration own delete" on public.thesis_inspiration;
create policy "thesis_inspiration own delete" on public.thesis_inspiration
  for delete using (auth.uid() = user_id);

create index if not exists thesis_inspiration_user_created
  on public.thesis_inspiration(user_id, created_at desc);

-- The journey loop: which steps of the latest run the user has marked done.
-- A jsonb array of completed step indices, e.g. [0, 1].
alter table public.thesis_runs
  add column if not exists step_progress jsonb not null default '[]'::jsonb;

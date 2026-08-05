-- Observability for the moat loop: every time a read folds one or more banked
-- coach decisions into a fresh read, we log it here. This makes the compounding
-- loop (the retention spine) measurable in production - "how many reads actually
-- built on a prior decision?" - which the audit found was unanswerable (the loop
-- had never run, thesis_answers = 0, and there was no signal even if it had).

create table if not exists public.compounding_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  run_id uuid references public.thesis_runs(id) on delete set null,
  answers_folded int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists compounding_events_user_idx on public.compounding_events(user_id, created_at desc);

alter table public.compounding_events enable row level security;

-- Owner can read their own events. Writes are service-role only (the edge function
-- writes with the service role via the user-scoped client is not used here; the
-- validate-thesis function runs as the user, so allow owner insert too).
drop policy if exists compounding_events_select_own on public.compounding_events;
create policy compounding_events_select_own on public.compounding_events
  for select using (auth.uid() = user_id);

drop policy if exists compounding_events_insert_own on public.compounding_events;
create policy compounding_events_insert_own on public.compounding_events
  for insert with check (auth.uid() = user_id);

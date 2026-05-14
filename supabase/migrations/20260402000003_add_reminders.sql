-- Reminders table for scheduled follow-ups and tasks
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  title text not null,
  description text,
  scheduled_at timestamptz not null,
  completed_at timestamptz,
  client_id uuid references public.clients(id) on delete set null,
  contact_id uuid references public.talent_contacts(id) on delete set null,
  repeat_pattern text check (repeat_pattern in ('none', 'daily', 'weekly', 'monthly')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.reminders enable row level security;

create policy "Users can manage their own reminders"
  on public.reminders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index for querying upcoming reminders
create index idx_reminders_user_scheduled on public.reminders (user_id, scheduled_at)
  where active = true and completed_at is null;

-- Web Push subscriptions per user (PWA). Populated by the client useWebPush
-- hook when a user opts into "Notify me when moves are ready"; read by the
-- service-role send-push function so the overnight match engine can notify a
-- user that fresh Moves are waiting. One row per browser/device endpoint.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Owner can manage only their own subscriptions. The service role (used by
-- send-push to fan out notifications and prune dead endpoints) bypasses RLS.
create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select using (auth.uid() = user_id);
create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

comment on table public.push_subscriptions is
  'Web Push (PWA) subscriptions per user. Written by client opt-in; read by service-role send-push for overnight match notifications.';

-- Phase 11: Chief of Staff concierge requests.
-- Single active request per user; history preserved after completion.
-- Attachments land in a private storage bucket keyed {user_id}/{request_id}/.

create type concierge_status as enum (
  'requested',
  'scheduled',
  'in_progress',
  'delivered',
  'cancelled'
);

create table concierge_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status concierge_status not null default 'requested',
  preferred_times text,
  notes text,
  scheduled_at timestamptz,
  assigned_to text,
  ops_notes text,
  result_stats jsonb,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index concierge_requests_user_idx on concierge_requests (user_id);
create index concierge_requests_status_idx on concierge_requests (status, created_at desc);

-- Only one non-terminal request per user at a time.
create unique index concierge_requests_active_per_user
  on concierge_requests (user_id)
  where status in ('requested', 'scheduled', 'in_progress');

alter table concierge_requests enable row level security;

create policy concierge_requests_owner_read on concierge_requests
  for select using (auth.uid() = user_id);

create policy concierge_requests_owner_insert on concierge_requests
  for insert with check (auth.uid() = user_id);

-- Users can cancel their own request but can't rewrite ops fields. The
-- client only ever sets status -> 'cancelled' on a row they own; ops
-- updates run through service role, which bypasses RLS.
create policy concierge_requests_owner_update on concierge_requests
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger concierge_requests_set_updated_at
  before update on concierge_requests
  for each row execute function set_updated_at();

-- Attachments bucket. Private; owner-scoped RLS on storage.objects.
insert into storage.buckets (id, name, public)
values ('concierge-uploads', 'concierge-uploads', false)
on conflict (id) do nothing;

drop policy if exists "concierge_uploads_owner_read" on storage.objects;
create policy "concierge_uploads_owner_read"
  on storage.objects for select
  using (
    bucket_id = 'concierge-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "concierge_uploads_owner_write" on storage.objects;
create policy "concierge_uploads_owner_write"
  on storage.objects for insert
  with check (
    bucket_id = 'concierge-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "concierge_uploads_owner_update" on storage.objects;
create policy "concierge_uploads_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'concierge-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "concierge_uploads_owner_delete" on storage.objects;
create policy "concierge_uploads_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'concierge-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

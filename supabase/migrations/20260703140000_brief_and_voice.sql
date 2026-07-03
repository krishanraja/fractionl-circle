-- Two small tables behind the chief-of-staff tranche, plus one bug fix.
-- Additive only.
--
-- BUG FIX: thesis_answers.user_id was NOT NULL with no default and no trigger,
-- but the client inserts (saveThesisAnswer) never passed user_id - so banking a
-- decision failed silently in production. auth.uid() as the column default
-- heals every client insert; the owner RLS policy (with check auth.uid() =
-- user_id) still guarantees a row can only ever belong to its author.
alter table public.thesis_answers alter column user_id set default auth.uid();
--
-- draft_edits: the correction channel on generated drafts. Every reach-out the
-- user acts on records what the AI drafted vs what they actually sent; edited
-- finals become the voice few-shot the digest brain learns from (the corpus's
-- correction loop - drafts converge on the user's real voice instead of a
-- generic one). User-owned, RLS.
create table if not exists public.draft_edits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  person_id uuid,                     -- circle_person acted on (loose ref: survives person deletes)
  channel text check (channel in ('email', 'linkedin', 'copy')),
  generated text not null,            -- what the AI drafted
  final text not null,                -- what the user sent
  edited boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists draft_edits_user_idx on public.draft_edits (user_id, created_at desc);
create index if not exists draft_edits_voice_idx on public.draft_edits (user_id, edited, created_at desc);
alter table public.draft_edits enable row level security;
drop policy if exists draft_edits_owner on public.draft_edits;
create policy draft_edits_owner on public.draft_edits
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- delivery_log: observability on outbound sends (the channel IS the retention
-- product; "did Monday's email go out?" must be answerable from inside the
-- system). Written by the crons with the service role only - no client write
-- policy. Owner may read their own rows.
create table if not exists public.delivery_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('warm_digest', 'brief', 'reengage')),
  channel text not null check (channel in ('email', 'push')),
  status text not null check (status in ('sent', 'failed', 'skipped')),
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists delivery_log_user_idx on public.delivery_log (user_id, created_at desc);
create index if not exists delivery_log_kind_idx on public.delivery_log (kind, created_at desc);
alter table public.delivery_log enable row level security;
drop policy if exists delivery_log_owner_read on public.delivery_log;
create policy delivery_log_owner_read on public.delivery_log
  for select to authenticated using (auth.uid() = user_id);

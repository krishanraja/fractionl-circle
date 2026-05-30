-- First-touch acquisition attribution per user (5c).
-- Captured on the public surface (UTM/source/agent/referrer/landing), persisted
-- client-side, and flushed once on the first authenticated session. Read by
-- stripe-checkout to stamp Stripe metadata, and by lifecycle event emission so
-- every signup and dollar is attributable to a campaign/channel/agent (5d).
-- Write-once: first touch is immutable.
create table if not exists public.user_attribution (
  user_id uuid primary key references auth.users(id) on delete cascade,
  anonymous_id text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  campaign_id text,
  agent text,
  referrer text,
  landing_path text,
  captured_at timestamptz not null default now()
);

alter table public.user_attribution enable row level security;

-- Owner can read and insert their own row. No update/delete policy: first touch
-- is immutable. The service role (used by stripe-checkout) bypasses RLS to read.
create policy "user_attribution_select_own" on public.user_attribution
  for select using (auth.uid() = user_id);
create policy "user_attribution_insert_own" on public.user_attribution
  for insert with check (auth.uid() = user_id);

comment on table public.user_attribution is
  'First-touch acquisition attribution per user (UTM/source/agent). Write-once; read by stripe-checkout + lifecycle emission. 5c/5d.';

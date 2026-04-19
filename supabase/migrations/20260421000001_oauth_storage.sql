-- Phase 5: OAuth token + state storage.
-- Both tables are service-role-only (RLS enabled, no policies). Access goes
-- exclusively through the oauth-google-* and sync-google edge functions,
-- which authenticate via service-role key.

create table oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google', 'microsoft')),
  access_token text not null,
  refresh_token text,
  token_type text,
  scope text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index oauth_tokens_user_provider_idx on oauth_tokens (user_id, provider);

alter table oauth_tokens enable row level security;
-- Intentionally no policies: service-role only.

create table oauth_states (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  redirect_to text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index oauth_states_user_idx on oauth_states (user_id);

alter table oauth_states enable row level security;
-- Intentionally no policies: service-role only.

create trigger oauth_tokens_set_updated_at
  before update on oauth_tokens
  for each row execute function set_updated_at();

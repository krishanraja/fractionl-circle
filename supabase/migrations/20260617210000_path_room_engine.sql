-- The Path Room engine schema. Net-new tables behind the new product.
-- Two ownership classes (made explicit because conflating them is the RLS write-hole):
--   USER-OWNED   (the_read, decision_ledger): RLS, user_id = auth.uid() for all ops.
--   SHARED-REF   (comparable_cohort, benchmarks, landmines): RLS, read-all-authenticated,
--                writes only via service-role (no client write policy -> denied).
-- Additive only; nothing existing is touched. Idempotent (if not exists / drop policy).

-- =========================================================================
-- USER-OWNED
-- =========================================================================

-- The adaptive state vector. One mutable row per user so a one-tap correction
-- is permanent. Seeds from user_profiles identity/practice columns.
create table if not exists the_read (
  user_id uuid primary key references auth.users(id) on delete cascade,
  segment text check (segment in ('new', 'seasoned', 'lifestyle')),
  segment_confidence numeric(4, 3),
  manual_override boolean not null default false,
  function text,
  niche text,
  stage text,
  tenure_band text,
  revenue_band text,
  client_count integer,
  motivation_type text,
  current_position text,
  lit_fork_domain text check (lit_fork_domain in ('offer_pricing', 'icp_positioning', 'network_strategy', 'scaling_leverage')),
  hold_position boolean not null default false,
  offer_one_liner text,
  updated_at timestamptz not null default now()
);
alter table the_read enable row level security;
drop policy if exists the_read_owner on the_read;
create policy the_read_owner on the_read
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- The grow-with-you spine + non-portable moat: committed decisions + reasoning +
-- outcome ONLY. Never per-person behavioral/contact state (that would be a CRM).
create table if not exists decision_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fork_domain text,
  decision_one_liner text not null,
  branches_considered jsonb,
  chosen_branch text,
  reasoning text,
  benchmark_snapshot jsonb,
  committed_at timestamptz not null default now(),
  outcome text,
  outcome_logged_at timestamptz
);
alter table decision_ledger enable row level security;
drop policy if exists decision_ledger_owner on decision_ledger;
create policy decision_ledger_owner on decision_ledger
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create index if not exists decision_ledger_user_idx on decision_ledger (user_id, committed_at desc);

-- =========================================================================
-- SHARED-REFERENCE (read-all-authenticated, writes service-role only)
-- =========================================================================

-- The moat dataset: real fractional trajectories. Seeded from the corpus, grown
-- from consented anonymized user paths. n_count + source gate the honesty rule.
create table if not exists comparable_cohort (
  id uuid primary key default gen_random_uuid(),
  function text,
  niche text,
  stage_band text,
  tenure_band text,
  revenue_band text,
  motivation_type text,
  fork_domain text,
  decision_sequence jsonb,
  what_they_chose text,
  what_happened text,
  source text check (source in ('corpus', 'user_consented')) not null default 'corpus',
  source_ref text,
  n_count integer not null default 0,
  confidence numeric(4, 3),
  created_at timestamptz not null default now()
);
alter table comparable_cohort enable row level security;
drop policy if exists comparable_cohort_read on comparable_cohort;
create policy comparable_cohort_read on comparable_cohort
  for select to authenticated using (true);
create index if not exists comparable_cohort_lookup_idx on comparable_cohort (function, stage_band, fork_domain);

-- Refreshable distributional facts. source_tier enforces honest provenance
-- (a practitioner LinkedIn number is 'expert_opinion', never 'hard_telemetry').
create table if not exists benchmarks (
  id uuid primary key default gen_random_uuid(),
  metric text not null,
  function text,
  niche text,
  stage text,
  value_low numeric,
  value_mid numeric,
  value_high numeric,
  unit text,
  source_tier text check (source_tier in ('hard_telemetry', 'survey', 'expert_opinion')) not null default 'survey',
  source_ref text,
  refreshed_at timestamptz not null default now()
);
alter table benchmarks enable row level security;
drop policy if exists benchmarks_read on benchmarks;
create policy benchmarks_read on benchmarks
  for select to authenticated using (true);
create index if not exists benchmarks_lookup_idx on benchmarks (metric, function, niche);

-- Named failure modes pre-surfaced at the next fork ("month-6 crisis ahead;
-- survivors had a second conversation moving by month four").
create table if not exists landmines (
  id uuid primary key default gen_random_uuid(),
  fork_domain text,
  function text,
  niche text,
  trigger_position text,
  name text not null,
  description text,
  survivor_pattern text,
  source_ref text
);
alter table landmines enable row level security;
drop policy if exists landmines_read on landmines;
create policy landmines_read on landmines
  for select to authenticated using (true);
create index if not exists landmines_lookup_idx on landmines (fork_domain, trigger_position);

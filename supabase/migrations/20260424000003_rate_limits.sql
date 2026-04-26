-- Durable rate limiting.
-- The in-memory Map<string, ...> in _shared/compliance.ts is per-instance,
-- which breaks horizontal scaling: a user hitting N req/min on one edge
-- worker instance is invisible to other instances. This table + function
-- provide cross-instance durability via an atomic upsert.

create table if not exists rate_limits (
  bucket_key text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (bucket_key, window_start)
);

create index if not exists rate_limits_window_start_idx
  on rate_limits (window_start);

-- Service-role-only: no user-facing access. RLS with zero policies = deny all.
alter table rate_limits enable row level security;

-- Atomic check-and-increment. Floors current time to a p_window_seconds
-- boundary, upserts into that window, and returns true if the resulting
-- count is still within p_max. Callers treat a false return as a 429.
create or replace function check_rate_limit(
  p_key text,
  p_max int,
  p_window_seconds int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count int;
begin
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into rate_limits (bucket_key, window_start, count)
  values (p_key, v_window_start, 1)
  on conflict (bucket_key, window_start)
  do update set count = rate_limits.count + 1
  returning count into v_count;

  return v_count <= p_max;
end;
$$;

-- Housekeeping. Call periodically (cron) to keep the table small.
create or replace function cleanup_rate_limits() returns void
language sql
security definer
set search_path = public
as $$
  delete from rate_limits where window_start < now() - interval '1 hour';
$$;

-- Restrict function execution to service role (edge functions).
revoke execute on function check_rate_limit(text, int, int) from public;
revoke execute on function cleanup_rate_limits() from public;

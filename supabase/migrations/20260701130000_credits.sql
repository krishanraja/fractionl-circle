-- Credits: a prepaid balance, on top of the subscription, that buys the max-effort
-- "leave nothing on the table" enrichment (enrich-max). Two tables:
--   • credit_balance — the current balance per user (the fast read).
--   • credit_ledger  — append-only history; every grant/spend/refund/clawback is a
--     row, so balance is always reconstructable and auditable.
--
-- Security model: users may READ their own balance and ledger, but may NOT write
-- either. All mutation goes through SECURITY DEFINER RPCs that are executable ONLY
-- by service_role — i.e. by trusted edge functions (the Stripe webhook grants; the
-- enrich-max function spends/refunds after verifying the caller). This makes it
-- impossible for a user to mint themselves credits by calling the DB directly.

create table if not exists credit_balance (
  user_id uuid primary key references auth.users on delete cascade,
  balance integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  delta integer not null,
  reason text not null,                 -- 'purchase' | 'spend' | 'refund' | 'clawback' | 'grant'
  ref text,                             -- e.g. stripe payment_intent, or person_id enriched
  stripe_event_id text unique,          -- idempotency key for Stripe-driven rows (grants/clawbacks)
  created_at timestamptz not null default now()
);

create index if not exists idx_credit_ledger_user on credit_ledger(user_id, created_at desc);
create index if not exists idx_credit_ledger_ref on credit_ledger(ref);

alter table credit_balance enable row level security;
alter table credit_ledger enable row level security;

-- Read-only for the owner. No insert/update/delete policies => authenticated users
-- cannot write; service_role bypasses RLS for the definer RPCs below.
create policy "own credit balance" on credit_balance for select using (auth.uid() = user_id);
create policy "own credit ledger"  on credit_ledger  for select using (auth.uid() = user_id);

-- ── Grant (Stripe purchase). Idempotent on stripe_event_id: a redelivered webhook
-- inserts nothing the second time and the balance is untouched. ────────────────
create or replace function grant_credits(
  p_user_id uuid, p_amount int, p_reason text, p_ref text, p_event_id text
) returns integer
language plpgsql security definer set search_path = public as $$
begin
  if p_amount <= 0 then
    return coalesce((select balance from credit_balance where user_id = p_user_id), 0);
  end if;
  begin
    insert into credit_ledger(user_id, delta, reason, ref, stripe_event_id)
    values (p_user_id, p_amount, p_reason, p_ref, p_event_id);
  exception when unique_violation then
    -- already granted for this Stripe event — no double credit.
    return coalesce((select balance from credit_balance where user_id = p_user_id), 0);
  end;
  insert into credit_balance(user_id, balance) values (p_user_id, p_amount)
    on conflict (user_id) do update set balance = credit_balance.balance + p_amount, updated_at = now();
  return (select balance from credit_balance where user_id = p_user_id);
end; $$;

-- ── Spend (before doing paid work). Locks the balance row so concurrent spends
-- can't both pass the check; returns ok=false without charging when short. ──────
create or replace function spend_credits(
  p_user_id uuid, p_amount int, p_reason text, p_ref text
) returns table (ok boolean, balance integer)
language plpgsql security definer set search_path = public as $$
declare cur integer;
begin
  if p_amount <= 0 then
    return query select true, coalesce((select balance from credit_balance where user_id = p_user_id), 0);
    return;
  end if;
  insert into credit_balance(user_id, balance) values (p_user_id, 0) on conflict (user_id) do nothing;
  select b.balance into cur from credit_balance b where b.user_id = p_user_id for update;
  cur := coalesce(cur, 0);
  if cur < p_amount then
    return query select false, cur;
    return;
  end if;
  insert into credit_ledger(user_id, delta, reason, ref) values (p_user_id, -p_amount, p_reason, p_ref);
  -- qualify the column: `balance` alone is ambiguous with the OUT-param of the
  -- RETURNS TABLE(... balance ...) signature.
  update credit_balance set balance = credit_balance.balance - p_amount, updated_at = now() where user_id = p_user_id;
  return query select true, cur - p_amount;
end; $$;

-- ── Refund (restore on a failed paid run). Additive; caller guarantees once. ────
create or replace function refund_credits(
  p_user_id uuid, p_amount int, p_reason text, p_ref text
) returns integer
language plpgsql security definer set search_path = public as $$
begin
  if p_amount <= 0 then
    return coalesce((select balance from credit_balance where user_id = p_user_id), 0);
  end if;
  insert into credit_ledger(user_id, delta, reason, ref) values (p_user_id, p_amount, p_reason, p_ref);
  insert into credit_balance(user_id, balance) values (p_user_id, p_amount)
    on conflict (user_id) do update set balance = credit_balance.balance + p_amount, updated_at = now();
  return (select balance from credit_balance where user_id = p_user_id);
end; $$;

-- ── Clawback (Stripe refund of a pack). Reverses the credits granted for a payment
-- intent, once per refund event. Balance may go negative — an honest debt, not a
-- silent write-off. ────────────────────────────────────────────────────────────
create or replace function clawback_credits(
  p_payment_intent text, p_event_id text
) returns integer
language plpgsql security definer set search_path = public as $$
declare v_user uuid; v_total integer;
begin
  if exists (select 1 from credit_ledger where stripe_event_id = p_event_id) then
    return 0; -- this refund event already processed
  end if;
  select user_id, sum(delta) into v_user, v_total
  from credit_ledger
  where ref = p_payment_intent and reason = 'purchase' and delta > 0
  group by user_id
  limit 1;
  if v_user is null or coalesce(v_total, 0) <= 0 then
    return 0;
  end if;
  insert into credit_ledger(user_id, delta, reason, ref, stripe_event_id)
    values (v_user, -v_total, 'clawback', p_payment_intent, p_event_id);
  update credit_balance set balance = balance - v_total, updated_at = now() where user_id = v_user;
  return v_total;
end; $$;

-- Mutation is service_role-only: trusted edge functions call these after verifying
-- the caller. Never grant to `authenticated` — that would let a user mint credits.
revoke all on function grant_credits(uuid, int, text, text, text) from public;
revoke all on function spend_credits(uuid, int, text, text) from public;
revoke all on function refund_credits(uuid, int, text, text) from public;
revoke all on function clawback_credits(text, text) from public;
grant execute on function grant_credits(uuid, int, text, text, text) to service_role;
grant execute on function spend_credits(uuid, int, text, text) to service_role;
grant execute on function refund_credits(uuid, int, text, text) to service_role;
grant execute on function clawback_credits(text, text) to service_role;

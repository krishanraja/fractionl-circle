-- Compliance hardening: complete the DSAR machinery and enforce retention.
--
-- BACKGROUND. erase_user_data / export_user_data were authored before the
-- Circle data model existed. They covered ~16 tables and silently missed ~30,
-- including the most sensitive personal data in the product: circle_person
-- (third-party names/emails/phones), oauth_tokens, ideas/matches/moves/signals/
-- streams/ledger_entries, sunday_letters, person_raw and every talent_* table.
-- That makes GDPR Art.17 (erasure) and Art.15/20 (access/portability) both
-- materially broken. This migration rebuilds both over the FULL user-scoped
-- surface, driven by a single explicit coverage list so the set is auditable
-- and stays correct as tables are added.
--
-- FK safety: every cross-table FK in public is CASCADE or SET NULL (verified),
-- so per-user deletes need no ordering - deleting talent_contacts /
-- conversation_sessions / sources cascades their childless children.

-- ─────────────────────────────────────────────────────────────────────────────
-- Coverage list. Every public table carrying a user_id. Update this in ONE place.
-- Three tables are deliberately retained on erasure as a lawful exception
-- (legal_obligation, 7-year hold per data_retention_policies) and are listed
-- separately so the choice is explicit and reviewable by counsel:
--   data_subject_requests  - the audit trail of the request itself
--   security_audit_log     - security/legal incident record
--   user_consents          - proof of consent lifecycle
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public._dsar_user_tables()
returns text[]
language sql immutable
as $$
  select array[
    'activity_logs','ai_conversations','chat_messages','circle_person','clients',
    'concierge_requests','conversation_sessions','daily_progress','engagement_analytics',
    'feature_usage','ideas','ledger_entries','matches','monthly_goals','move_edits',
    'moves','oauth_states','oauth_tokens','opportunities','person_raw','push_subscriptions',
    'reminders','revenue_entries','signals','sources','streams','subscriptions',
    'sunday_letters','talent_contact_identities','talent_contact_merges','talent_contacts',
    'talent_interactions','talent_referrals','usage_tracking','user_attribution',
    'user_behavior_logs','user_business_context','user_insights','user_preferences',
    'user_roles','user_sessions','weekly_summaries'
  ]::text[];
$$;

-- Tables retained on erasure under a documented legal-obligation basis.
create or replace function public._dsar_retained_tables()
returns text[]
language sql immutable
as $$
  select array['data_subject_requests','security_audit_log','user_consents']::text[];
$$;

-- ── Guard helper: a caller may only act on their own data, unless they are the
--    service role (edge functions, no end-user JWT → auth.uid() is null).
create or replace function public._dsar_assert_self(target_user_id uuid)
returns void
language plpgsql
as $$
begin
  if target_user_id is null then
    raise exception 'target_user_id is required';
  end if;
  if auth.uid() is not null and auth.uid() <> target_user_id then
    raise exception 'forbidden: callers may only act on their own data';
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- export_user_data - GDPR Art.15/20. Returns one JSON document with every row
-- the user owns across the full surface PLUS their profile, retained records,
-- and a manifest. Self-only.
--
-- Drop first: the prior versions returned a different type, which CREATE OR
-- REPLACE cannot change. Drop is safe - nothing depends on these but the
-- client RPC calls, which are unchanged in shape.
-- ─────────────────────────────────────────────────────────────────────────────
drop function if exists public.export_user_data(uuid);
create or replace function public.export_user_data(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb := '{}'::jsonb;
  tbl text;
  rows jsonb;
  all_tables text[] := _dsar_user_tables() || _dsar_retained_tables();
begin
  perform _dsar_assert_self(target_user_id);

  foreach tbl in array all_tables loop
    -- Cast both sides to text: most tables key user_id as uuid, but a few legacy
    -- tables (e.g. ai_conversations, single-tenant 'default_user') type it as
    -- text. The cast matches real rows in either case and harmlessly skips legacy.
    execute format('select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from public.%I t where t.user_id::text = $1::text', tbl)
      into rows using target_user_id;
    result := result || jsonb_build_object(tbl, rows);
  end loop;

  -- user_profiles is keyed by id (= auth uid), not user_id.
  execute 'select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from public.user_profiles t where t.id = $1'
    into rows using target_user_id;
  result := result || jsonb_build_object('user_profiles', rows);

  return jsonb_build_object(
    'export_format', 'fractionl-circle/dsar-v2',
    'generated_at', now(),
    'user_id', target_user_id,
    'data', result
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- erase_user_data - GDPR Art.17. Deletes every user-owned row across the full
-- surface and anonymises the profile. Retains the three legal-obligation tables.
-- Records a completion entry in data_subject_requests as the erasure audit.
-- Self-only. Does NOT delete the auth.users row - the delete-account edge
-- function does that after this returns (service-role, admin API).
-- ─────────────────────────────────────────────────────────────────────────────
drop function if exists public.erase_user_data(uuid);
create or replace function public.erase_user_data(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  tbl text;
  deleted_count bigint;
  total bigint := 0;
  per_table jsonb := '{}'::jsonb;
begin
  perform _dsar_assert_self(target_user_id);

  foreach tbl in array _dsar_user_tables() loop
    execute format('delete from public.%I where user_id::text = $1::text', tbl) using target_user_id;
    get diagnostics deleted_count = row_count;
    total := total + deleted_count;
    per_table := per_table || jsonb_build_object(tbl, deleted_count);
  end loop;

  -- Anonymise the identity row rather than delete it (auth.users references it;
  -- the edge function removes the auth user separately).
  update public.user_profiles
     set full_name = null,
         email = 'erased-' || target_user_id::text || '@erased.invalid',
         avatar_url = null,
         updated_at = now()
   where id = target_user_id;

  -- Erasure audit trail (legal-obligation retention).
  insert into public.data_subject_requests (user_id, request_type, status, description, completed_at)
  values (target_user_id, 'erasure', 'completed',
          'Right-to-erasure executed across full data surface (dsar-v2). Retained under legal obligation: '
          || array_to_string(_dsar_retained_tables(), ', ') || '.',
          now());

  return jsonb_build_object(
    'erased_user_id', target_user_id,
    'rows_deleted', total,
    'per_table', per_table,
    'retained_legal_hold', _dsar_retained_tables(),
    'profile', 'anonymised',
    'completed_at', now()
  );
end;
$$;

revoke all on function public.export_user_data(uuid) from public, anon;
revoke all on function public.erase_user_data(uuid) from public, anon;
grant execute on function public.export_user_data(uuid) to authenticated, service_role;
grant execute on function public.erase_user_data(uuid) to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Retention enforcement. The data_retention_policies table existed but nothing
-- enforced it (last_purge_at null everywhere). Enable auto-purge on the two
-- short-lived analytics tables and add a function + daily cron that honours any
-- policy flagged auto_purge=true, never touching legal-obligation holds.
-- ─────────────────────────────────────────────────────────────────────────────
update public.data_retention_policies
   set auto_purge = true
 where table_name in ('user_behavior_logs','user_sessions');

create or replace function public.enforce_data_retention()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pol record;
  purged bigint;
  summary jsonb := '[]'::jsonb;
begin
  for pol in
    select table_name, retention_days
    from public.data_retention_policies
    where auto_purge = true
      and legal_basis <> 'legal_obligation'
      and retention_days is not null
  loop
    -- Only purge tables that actually have a created_at timestamp to age on.
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name=pol.table_name and column_name='created_at'
    ) then
      execute format(
        'delete from public.%I where created_at < now() - ($1 || '' days'')::interval',
        pol.table_name
      ) using pol.retention_days::text;
      get diagnostics purged = row_count;
      update public.data_retention_policies
         set last_purge_at = now()
       where table_name = pol.table_name;
      summary := summary || jsonb_build_object('table', pol.table_name, 'purged', purged);
    end if;
  end loop;
  return jsonb_build_object('ran_at', now(), 'results', summary);
end;
$$;

revoke all on function public.enforce_data_retention() from public, anon, authenticated;

-- Daily at 03:30 UTC. Uses the existing pg_cron/pg_net stack.
select cron.unschedule('enforce-data-retention')
where exists (select 1 from cron.job where jobname = 'enforce-data-retention');

select cron.schedule('enforce-data-retention', '30 3 * * *', $$ select public.enforce_data_retention(); $$);

-- Make data export and erasure follow the live schema instead of a stale,
-- hand-maintained table list. The previous production functions could miss
-- newer tables and could fail when the list named a table that was not present.

create or replace function public._dsar_retained_tables()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'data_subject_requests',
    'security_audit_log',
    'user_consents'
  ]::text[];
$$;

-- Every real public table with a user_id column is erasable unless it is one
-- of the explicit legal-hold tables above. Catalog discovery makes future
-- user-owned tables safe by default and tolerates schema differences between
-- environments.
create or replace function public._dsar_user_tables()
returns text[]
language sql
stable
set search_path = ''
as $$
  select coalesce(
    array_agg(c.relname::text order by c.relname::text),
    array[]::text[]
  )
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
    and exists (
      select 1
      from pg_catalog.pg_attribute a
      where a.attrelid = c.oid
        and a.attname = 'user_id'
        and a.attnum > 0
        and not a.attisdropped
    )
    and not (c.relname::text = any(public._dsar_retained_tables()));
$$;

create or replace function public._dsar_assert_self(target_user_id uuid)
returns void
language plpgsql
set search_path = ''
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

create or replace function public.export_user_data(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb := '{}'::jsonb;
  tbl text;
  rows jsonb;
begin
  perform public._dsar_assert_self(target_user_id);

  for tbl in
    select unnest(public._dsar_user_tables() || public._dsar_retained_tables())
  loop
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from public.%I t where t.user_id::text = $1::text',
      tbl
    ) into rows using target_user_id;
    result := result || jsonb_build_object(tbl, rows);
  end loop;

  select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb)
    into rows
    from public.user_profiles p
   where p.id = target_user_id;
  result := result || jsonb_build_object('user_profiles', rows);

  return jsonb_build_object(
    'export_format', 'fractionl-circle/dsar-v3',
    'generated_at', now(),
    'user_id', target_user_id,
    'data', result
  );
end;
$$;

create or replace function public.erase_user_data(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  tbl text;
  deleted_count bigint;
  total bigint := 0;
  per_table jsonb := '{}'::jsonb;
begin
  perform public._dsar_assert_self(target_user_id);

  for tbl in select unnest(public._dsar_user_tables())
  loop
    execute format(
      'delete from public.%I where user_id::text = $1::text',
      tbl
    ) using target_user_id;
    get diagnostics deleted_count = row_count;
    total := total + deleted_count;
    per_table := per_table || jsonb_build_object(tbl, deleted_count);
  end loop;

  update public.user_profiles
     set full_name = null,
         email = 'erased-' || target_user_id::text || '@erased.invalid',
         avatar_url = null,
         updated_at = now()
   where id = target_user_id;

  insert into public.data_subject_requests (
    user_id,
    request_type,
    status,
    description,
    completed_at
  ) values (
    target_user_id,
    'erasure',
    'completed',
    'Right-to-erasure executed across the live user-owned data surface (dsar-v3). Retained under legal obligation: '
      || array_to_string(public._dsar_retained_tables(), ', ') || '.',
    now()
  );

  return jsonb_build_object(
    'erased_user_id', target_user_id,
    'rows_deleted', total,
    'per_table', per_table,
    'retained_legal_hold', public._dsar_retained_tables(),
    'profile', 'anonymised',
    'completed_at', now()
  );
end;
$$;

revoke all on function public.export_user_data(uuid) from public, anon;
revoke all on function public.erase_user_data(uuid) from public, anon;
grant execute on function public.export_user_data(uuid) to authenticated, service_role;
grant execute on function public.erase_user_data(uuid) to authenticated, service_role;

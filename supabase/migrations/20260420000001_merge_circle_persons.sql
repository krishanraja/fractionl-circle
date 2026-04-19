-- Phase 3: Circle dedupe support.
-- Adds a SECURITY DEFINER function that atomically merges two circle_person
-- rows owned by the caller: repoints person_raw / matches / ledger_entries,
-- coalesces non-null fields into the keeper, then deletes the loser.

create or replace function merge_circle_persons(keep_id uuid, drop_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  keep_row circle_person%rowtype;
  drop_row circle_person%rowtype;
begin
  if caller is null then
    raise exception 'not authenticated';
  end if;
  if keep_id = drop_id then
    return;
  end if;

  select * into keep_row from circle_person where id = keep_id and user_id = caller;
  if not found then
    raise exception 'keep_id not found or not owned by caller';
  end if;

  select * into drop_row from circle_person where id = drop_id and user_id = caller;
  if not found then
    raise exception 'drop_id not found or not owned by caller';
  end if;

  update person_raw
     set circle_person_id = keep_id
   where circle_person_id = drop_id
     and user_id = caller;

  update matches
     set circle_person_id = keep_id
   where circle_person_id = drop_id
     and user_id = caller;

  update ledger_entries
     set circle_person_id = keep_id
   where circle_person_id = drop_id
     and user_id = caller;

  update circle_person
     set
       primary_email = coalesce(keep_row.primary_email, drop_row.primary_email),
       primary_phone = coalesce(keep_row.primary_phone, drop_row.primary_phone),
       linkedin_url  = coalesce(keep_row.linkedin_url, drop_row.linkedin_url),
       company       = coalesce(keep_row.company, drop_row.company),
       title         = coalesce(keep_row.title, drop_row.title),
       location      = coalesce(keep_row.location, drop_row.location),
       avatar_url    = coalesce(keep_row.avatar_url, drop_row.avatar_url),
       last_interaction_at = greatest(
         coalesce(keep_row.last_interaction_at, '-infinity'::timestamptz),
         coalesce(drop_row.last_interaction_at, '-infinity'::timestamptz)
       ),
       tags = array(
         select distinct x from unnest(coalesce(keep_row.tags, '{}') || coalesce(drop_row.tags, '{}')) as t(x)
       ),
       updated_at = now()
   where id = keep_id;

  delete from circle_person where id = drop_id and user_id = caller;
end;
$$;

grant execute on function merge_circle_persons(uuid, uuid) to authenticated;

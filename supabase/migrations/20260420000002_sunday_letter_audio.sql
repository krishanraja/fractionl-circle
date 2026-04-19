-- Phase 8c: Sunday Letter audio storage.
-- Creates a private storage bucket for per-user Sunday Letter MP3s. Objects
-- are keyed `{user_id}/{week_of}.mp3`; RLS on storage.objects restricts reads
-- and writes to the authenticated owner.

insert into storage.buckets (id, name, public)
values ('sunday-letters', 'sunday-letters', false)
on conflict (id) do nothing;

-- Owner-scoped read.
drop policy if exists "sunday_letters_owner_read" on storage.objects;
create policy "sunday_letters_owner_read"
  on storage.objects for select
  using (
    bucket_id = 'sunday-letters'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner-scoped insert / update / delete (edge function writes via service
-- role and bypasses RLS; this covers any authenticated client interactions).
drop policy if exists "sunday_letters_owner_write" on storage.objects;
create policy "sunday_letters_owner_write"
  on storage.objects for insert
  with check (
    bucket_id = 'sunday-letters'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "sunday_letters_owner_update" on storage.objects;
create policy "sunday_letters_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'sunday-letters'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "sunday_letters_owner_delete" on storage.objects;
create policy "sunday_letters_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'sunday-letters'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Phase 4 (5e): Sunday Letter public content feed.
-- Adds opt-in publishing columns to sunday_letters. The public JSON feed
-- (sunday-letter-feed edge function) reads only is_publishable rows via the
-- service role, returning only the de-identified preview_text + public_slug.
-- Existing owner RLS is unchanged; no new policy is needed because the feed
-- reads through the service role, never the anon key.

alter table public.sunday_letters add column if not exists public_slug text;
alter table public.sunday_letters add column if not exists is_publishable boolean not null default false;
alter table public.sunday_letters add column if not exists preview_text text;

-- Unique slug across all letters; null slugs are allowed (not every letter is shared).
create unique index if not exists sunday_letters_public_slug_idx
  on public.sunday_letters (public_slug)
  where public_slug is not null;

comment on column public.sunday_letters.public_slug is 'URL-safe random id for the public letter page; null until generated.';
comment on column public.sunday_letters.is_publishable is 'Opt-in flag (default false). When true, the de-identified preview appears in the public feed.';
comment on column public.sunday_letters.preview_text is 'De-identified 1-2 sentence teaser (no names, companies, or client figures) safe for public consumption.';

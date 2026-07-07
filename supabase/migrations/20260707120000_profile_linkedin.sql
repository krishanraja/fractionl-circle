-- The user's OWN LinkedIn now lives in Profile & Settings (persisted), where it
-- belongs - it feeds the PLAN's fit + credibility read. Previously it was captured
-- ad-hoc on the "Make it stronger" screen (a network-flavoured action in the wrong
-- place) and lost on every reload. Owner-scoped via the table's existing RLS; no
-- new policy needed (a plain nullable column on user_profiles).
alter table public.user_profiles
  add column if not exists linkedin_url text;

comment on column public.user_profiles.linkedin_url is
  'The user''s own LinkedIn profile URL. Set in Profile & Settings; feeds the plan fit/credibility read. Not a contact.';

-- Reshape the profile fields around the user's *practice* rather than their company.
--
-- The old free-text columns (industry, business_type, target_market) invited junk
-- input like product IDs and raw enum values, and produced data the Match Engine
-- couldn't reliably prompt against. We replace them with structured pickers backed
-- by these new columns. The old columns stay in place so nothing breaks; they're
-- no longer surfaced in the UI.

alter table public.user_profiles
  add column if not exists role text,
  add column if not exists client_stages text[] not null default '{}',
  add column if not exists client_verticals text[] not null default '{}',
  add column if not exists positioning text;

comment on column public.user_profiles.role is
  'Practitioner role: cmo, coo, cfo, cro, cpo, cto, chief_of_staff, other';
comment on column public.user_profiles.client_stages is
  'Company stages the user serves: pre_seed, seed, series_a, series_b, series_c_plus, bootstrapped, pe_backed';
comment on column public.user_profiles.client_verticals is
  'Verticals the user serves: saas, marketplace, fintech, healthtech, dtc, ai_ml, dev_tools, enterprise, edtech, climate, other';
comment on column public.user_profiles.positioning is
  'One-liner the user would put on their LinkedIn headline. Free text, optional.';

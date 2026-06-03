-- P1: identity foundation. The borrowed-conviction first-run infers WHO the
-- user is (motivation, journey stage, offer maturity, target buyer) and an
-- identity statement, then proposes an offer. These columns anchor every AI
-- surface (see _shared/profileContext.ts). Additive + idempotent; applied to
-- prod via the Management API on 2026-06-03.

alter table user_profiles
  add column if not exists motivation_type text,
  add column if not exists journey_stage text,
  add column if not exists target_buyer text,
  add column if not exists offer_maturity text,
  add column if not exists signature_win text,
  add column if not exists identity_statement text,
  add column if not exists first_run_transcript text,
  add column if not exists first_run_completed_at timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_profiles_motivation_type_chk') then
    alter table user_profiles add constraint user_profiles_motivation_type_chk
      check (motivation_type is null or motivation_type in ('pushed', 'pulled', 'lifestyle'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_profiles_journey_stage_chk') then
    alter table user_profiles add constraint user_profiles_journey_stage_chk
      check (journey_stage is null or journey_stage in ('0-3mo', '3-6mo', '6-12mo', '12-18mo', '18+mo'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'user_profiles_offer_maturity_chk') then
    alter table user_profiles add constraint user_profiles_offer_maturity_chk
      check (offer_maturity is null or offer_maturity in ('vague', 'rough', 'tested', 'refined'));
  end if;
end $$;

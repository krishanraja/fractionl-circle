-- Phase 6 + Phase 8b cron setup.
--
-- This file is NOT a migration. It's a one-time setup you paste into the
-- Supabase SQL editor once the cron-* edge functions are deployed.
--
-- Prereqs (set via Project Settings -> Edge Functions -> Secrets):
--   CRON_SECRET            a long random string. Same value below.
--   OPENAI_API_KEY         already set for the rest of the stack.
--   SUPABASE_SERVICE_ROLE_KEY  auto-populated by Supabase; no action needed.
--
-- Generate CRON_SECRET with: openssl rand -hex 32
--
-- Before running, replace:
--   <PROJECT_REF>     your Supabase project ref (e.g. ksyuwacuigshvcyptlhe)
--   <CRON_SECRET>     the same secret you set in edge-function env
--
-- Schedules use UTC. Adjust if you want a specific local hour.

-- ---------------------------------------------------------------------------
-- Enable the required extensions (idempotent).
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ---------------------------------------------------------------------------
-- Store secrets in Vault so they don't appear in pg_cron.job.
-- Run each once; subsequent runs will raise a unique_violation you can ignore.
-- ---------------------------------------------------------------------------
-- select vault.create_secret('<CRON_SECRET>', 'cron_secret');
-- select vault.create_secret('https://<PROJECT_REF>.supabase.co/functions/v1', 'functions_base_url');

-- ---------------------------------------------------------------------------
-- Remove any prior versions of these jobs before re-scheduling.
-- ---------------------------------------------------------------------------
select cron.unschedule('cron-sync-google')      where exists (select 1 from cron.job where jobname = 'cron-sync-google');
select cron.unschedule('cron-sync-microsoft')   where exists (select 1 from cron.job where jobname = 'cron-sync-microsoft');
select cron.unschedule('compute-warmth')        where exists (select 1 from cron.job where jobname = 'compute-warmth');
select cron.unschedule('cron-warm-digest')      where exists (select 1 from cron.job where jobname = 'cron-warm-digest');
select cron.unschedule('cron-reengage')         where exists (select 1 from cron.job where jobname = 'cron-reengage');
select cron.unschedule('cron-embed-circle')     where exists (select 1 from cron.job where jobname = 'cron-embed-circle');

-- ---------------------------------------------------------------------------
-- Phase 5c: nightly Google contacts + calendar re-sync. 06:00 UTC daily.
-- ---------------------------------------------------------------------------
select cron.schedule(
  'cron-sync-google',
  '0 6 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'functions_base_url') || '/cron-sync-google',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 900000
  );
  $$
);

-- ---------------------------------------------------------------------------
-- Phase 5c: nightly Microsoft contacts + calendar re-sync. 07:00 UTC daily
-- (offset from Google by an hour to spread load).
-- ---------------------------------------------------------------------------
select cron.schedule(
  'cron-sync-microsoft',
  '0 7 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'functions_base_url') || '/cron-sync-microsoft',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 900000
  );
  $$
);

-- ---------------------------------------------------------------------------
-- Warm network: nightly warmth recompute. 07:30 UTC, i.e. AFTER the Google
-- (06:00) and Microsoft (07:00) syncs refresh last_interaction_at, so the
-- warmth the digest reads is current.
-- ---------------------------------------------------------------------------
select cron.schedule(
  'compute-warmth',
  '30 7 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'functions_base_url') || '/compute-warmth',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 600000
  );
  $$
);

-- ---------------------------------------------------------------------------
-- Warm network: weekly "keep your circle warm" digest. Mondays at 13:00 UTC
-- (~6am PT / ~9am ET) — a start-of-week nudge that lands in the inbox and on
-- the calendar where senior leaders actually plan.
-- ---------------------------------------------------------------------------
select cron.schedule(
  'cron-warm-digest',
  '0 13 * * 1',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'functions_base_url') || '/cron-warm-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 900000
  );
  $$
);

-- ---------------------------------------------------------------------------
-- Re-engagement: weekly "come back — here's what's waiting" sweep. Mondays at
-- 15:00 UTC, i.e. AFTER the warm digest (13:00) so a drifted user gets the
-- warm-circle nudge first and this only reaches those who still have something
-- genuinely waiting. Inert until Resend/VAPID keys are set.
-- ---------------------------------------------------------------------------
select cron.schedule(
  'cron-reengage',
  '0 15 * * 1',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'functions_base_url') || '/cron-reengage',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 900000
  );
  $$
);

-- ---------------------------------------------------------------------------
-- Semantic search: nightly embedding backfill for the "who can help me" search.
-- 07:45 UTC, i.e. AFTER compute-warmth (07:30) so the sweep is ordered by fresh
-- warmth. Inert (embeds nothing) until OPENAI_API_KEY is set; keyword search still
-- works in the meantime.
-- ---------------------------------------------------------------------------
select cron.schedule(
  'cron-embed-circle',
  '45 7 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'functions_base_url') || '/cron-embed-circle',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 900000
  );
  $$
);

-- ---------------------------------------------------------------------------
-- Sanity check. Expected: six rows.
-- ---------------------------------------------------------------------------
-- select jobname, schedule, active from cron.job where jobname like 'cron-%' or jobname = 'compute-warmth';

-- ---------------------------------------------------------------------------
-- Inspect recent runs (status, return_message).
-- ---------------------------------------------------------------------------
-- select * from cron.job_run_details
-- where jobid in (select jobid from cron.job where jobname like 'cron-%')
-- order by start_time desc limit 20;

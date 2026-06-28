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
select cron.unschedule('cron-match-engine')     where exists (select 1 from cron.job where jobname = 'cron-match-engine');
select cron.unschedule('cron-sunday-letter')    where exists (select 1 from cron.job where jobname = 'cron-sunday-letter');
select cron.unschedule('cron-sync-google')      where exists (select 1 from cron.job where jobname = 'cron-sync-google');
select cron.unschedule('cron-sync-microsoft')   where exists (select 1 from cron.job where jobname = 'cron-sync-microsoft');
select cron.unschedule('compute-warmth')        where exists (select 1 from cron.job where jobname = 'compute-warmth');
select cron.unschedule('cron-warm-digest')      where exists (select 1 from cron.job where jobname = 'cron-warm-digest');

-- ---------------------------------------------------------------------------
-- Phase 6: overnight Match Engine. Runs daily at 08:00 UTC (~midnight PT /
-- ~03:00 ET / 08:00 GMT). Adjust the cron expression to taste.
-- ---------------------------------------------------------------------------
select cron.schedule(
  'cron-match-engine',
  '0 8 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'functions_base_url') || '/cron-match-engine',
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
-- Phase 8b: weekly Sunday Letter. Runs every Sunday at 19:00 UTC. That's the
-- "smart friend who paid attention" artifact.
-- ---------------------------------------------------------------------------
select cron.schedule(
  'cron-sunday-letter',
  '0 19 * * 0',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'functions_base_url') || '/cron-sunday-letter',
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
-- Sanity check. Expected: six rows.
-- ---------------------------------------------------------------------------
-- select jobname, schedule, active from cron.job where jobname like 'cron-%' or jobname = 'compute-warmth';

-- ---------------------------------------------------------------------------
-- Inspect recent runs (status, return_message).
-- ---------------------------------------------------------------------------
-- select * from cron.job_run_details
-- where jobid in (select jobid from cron.job where jobname like 'cron-%')
-- order by start_time desc limit 20;

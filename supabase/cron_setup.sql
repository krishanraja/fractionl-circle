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
select cron.unschedule('cron-match-engine')  where exists (select 1 from cron.job where jobname = 'cron-match-engine');
select cron.unschedule('cron-sunday-letter') where exists (select 1 from cron.job where jobname = 'cron-sunday-letter');

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
-- Sanity check. Expected: two rows.
-- ---------------------------------------------------------------------------
-- select jobname, schedule, active from cron.job where jobname like 'cron-%';

-- ---------------------------------------------------------------------------
-- Inspect recent runs (status, return_message).
-- ---------------------------------------------------------------------------
-- select * from cron.job_run_details
-- where jobid in (select jobid from cron.job where jobname like 'cron-%')
-- order by start_time desc limit 20;

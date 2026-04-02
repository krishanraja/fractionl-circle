-- ============================================================================
-- Automated compliance jobs: data retention purge + monitoring
-- Requires pg_cron and pg_net extensions (enabled in Supabase Pro+)
-- ============================================================================

-- Enable pg_cron if available (Supabase Pro plans)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ── 1. Scheduled Data Retention Purge (SOC2 CC6.5, GDPR Art.5(1)(e)) ───
-- Runs daily at 3:00 AM UTC — purges expired behavioral/session data

SELECT cron.schedule(
  'purge-expired-data',
  '0 3 * * *',  -- daily at 03:00 UTC
  $$
  DO $$
  DECLARE
    rows_deleted INTEGER;
    total_purged INTEGER := 0;
  BEGIN
    -- Purge user_behavior_logs older than 90 days
    DELETE FROM public.user_behavior_logs
    WHERE created_at < now() - INTERVAL '90 days';
    GET DIAGNOSTICS rows_deleted = ROW_COUNT;
    total_purged := total_purged + rows_deleted;

    -- Purge user_sessions older than 90 days
    DELETE FROM public.user_sessions
    WHERE created_at < now() - INTERVAL '90 days';
    GET DIAGNOSTICS rows_deleted = ROW_COUNT;
    total_purged := total_purged + rows_deleted;

    -- Log the purge result
    INSERT INTO public.security_audit_log (user_id, action, resource, details, compliance_framework, outcome)
    VALUES ('system', 'scheduled_purge', 'retention_policy',
      jsonb_build_object('total_purged', total_purged, 'run_at', now()),
      'SOC2', 'success');

    -- Update last purge timestamps
    UPDATE public.data_retention_policies
    SET last_purge_at = now()
    WHERE table_name IN ('user_behavior_logs', 'user_sessions');
  END $$;
  $$
);

-- ── 2. Data Subject Request Deadline Monitor (GDPR Art.12(3)) ───────────
-- Runs daily — flags overdue DSRs (GDPR requires response within 30 days)

SELECT cron.schedule(
  'check-dsr-deadlines',
  '0 9 * * *',  -- daily at 09:00 UTC
  $$
  DO $$
  DECLARE
    overdue_count INTEGER;
  BEGIN
    -- Count overdue pending requests
    SELECT COUNT(*) INTO overdue_count
    FROM public.data_subject_requests
    WHERE status IN ('pending', 'processing')
      AND deadline_at < now();

    -- Log if any are overdue
    IF overdue_count > 0 THEN
      INSERT INTO public.security_audit_log (user_id, action, resource, details, compliance_framework, outcome)
      VALUES ('system', 'dsr_deadline_breach', 'data_subject_requests',
        jsonb_build_object('overdue_count', overdue_count, 'checked_at', now()),
        'GDPR', 'failure');
    END IF;
  END $$;
  $$
);

-- ── 3. Security Anomaly Detection Function ──────────────────────────────
-- Can be called manually or scheduled — detects suspicious patterns

CREATE OR REPLACE FUNCTION public.check_security_anomalies()
RETURNS TABLE(anomaly_type TEXT, details JSONB, severity TEXT)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Detect excessive failed auth attempts (brute force indicator)
  RETURN QUERY
  SELECT
    'excessive_auth_failures'::TEXT,
    jsonb_build_object(
      'user_id', sal.user_id,
      'failure_count', COUNT(*),
      'time_window', '1 hour'
    ),
    'high'::TEXT
  FROM public.security_audit_log sal
  WHERE sal.action = 'login'
    AND sal.outcome = 'failure'
    AND sal.created_at > now() - INTERVAL '1 hour'
  GROUP BY sal.user_id
  HAVING COUNT(*) >= 5;

  -- Detect bulk data exports (potential data exfiltration)
  RETURN QUERY
  SELECT
    'bulk_data_export'::TEXT,
    jsonb_build_object(
      'user_id', sal.user_id,
      'export_count', COUNT(*),
      'time_window', '24 hours'
    ),
    'medium'::TEXT
  FROM public.security_audit_log sal
  WHERE sal.action = 'data_export'
    AND sal.created_at > now() - INTERVAL '24 hours'
  GROUP BY sal.user_id
  HAVING COUNT(*) >= 3;

  -- Detect data erasure requests (unusual activity)
  RETURN QUERY
  SELECT
    'data_erasure_spike'::TEXT,
    jsonb_build_object(
      'erasure_count', COUNT(*),
      'time_window', '24 hours'
    ),
    'high'::TEXT
  FROM public.data_subject_requests
  WHERE request_type = 'erasure'
    AND created_at > now() - INTERVAL '24 hours'
  HAVING COUNT(*) >= 3;
END;
$$;

-- ── 4. Schedule anomaly check (hourly) ──────────────────────────────────

SELECT cron.schedule(
  'security-anomaly-check',
  '0 * * * *',  -- every hour
  $$
  DO $$
  DECLARE
    anomaly RECORD;
  BEGIN
    FOR anomaly IN SELECT * FROM public.check_security_anomalies()
    LOOP
      INSERT INTO public.security_audit_log (user_id, action, resource, details, compliance_framework, outcome)
      VALUES ('system', 'anomaly_detected', anomaly.anomaly_type,
        anomaly.details, 'SOC2', 'failure');
    END LOOP;
  END $$;
  $$
);

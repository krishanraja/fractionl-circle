-- ============================================================================
-- COMPLIANCE FRAMEWORKS: SOC2, HIPAA, GDPR, CCPA, ISO 27001
-- Non-breaking, additive migration — no existing tables are altered destructively
-- ============================================================================

-- ── 1. Consent Management (GDPR Art.6-7, CCPA §1798.120) ───────────────

CREATE TABLE IF NOT EXISTS public.user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  consent_type TEXT NOT NULL CHECK (consent_type IN (
    'essential',          -- Required for service operation
    'analytics',          -- Behavioral tracking / usage analytics
    'marketing',          -- Marketing communications
    'ai_processing',      -- Sending data to AI services (OpenAI, etc.)
    'third_party_sharing',-- Sharing with enrichment providers (Apollo, Clearbit, Twilio)
    'voice_recording',    -- Voice transcription & storage
    'data_export'         -- Export to Google Sheets / third-party
  )),
  granted BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  consent_version TEXT NOT NULL DEFAULT '1.0',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, consent_type)
);

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consents"
  ON public.user_consents FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own consents"
  ON public.user_consents FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own consents"
  ON public.user_consents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_user_consents_user_id ON public.user_consents(user_id);

-- ── 2. Enhanced Audit Log (SOC2 CC6.1, ISO A.12.4, HIPAA §164.312(b)) ──

-- Extend existing security_audit_log with compliance-specific fields
ALTER TABLE public.security_audit_log
  ADD COLUMN IF NOT EXISTS compliance_framework TEXT,
  ADD COLUMN IF NOT EXISTS data_classification TEXT CHECK (data_classification IN ('public', 'internal', 'confidential', 'restricted')),
  ADD COLUMN IF NOT EXISTS affected_resource_id TEXT,
  ADD COLUMN IF NOT EXISTS outcome TEXT CHECK (outcome IN ('success', 'failure', 'denied', 'error'));

CREATE INDEX IF NOT EXISTS idx_audit_log_compliance ON public.security_audit_log(compliance_framework, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_action ON public.security_audit_log(user_id, action, created_at);

-- ── 3. Data Processing Records (GDPR Art.30) ───────────────────────────

CREATE TABLE IF NOT EXISTS public.data_processing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  processing_activity TEXT NOT NULL,
  purpose TEXT NOT NULL,
  legal_basis TEXT NOT NULL CHECK (legal_basis IN (
    'consent', 'contract', 'legal_obligation',
    'vital_interests', 'public_task', 'legitimate_interests'
  )),
  data_categories TEXT[] NOT NULL,
  data_subjects TEXT[] NOT NULL,
  recipients TEXT[],
  third_country_transfers TEXT[],
  retention_period TEXT NOT NULL,
  security_measures TEXT[],
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.data_processing_records ENABLE ROW LEVEL SECURITY;

-- Only admins can manage processing records
CREATE POLICY "Admins can manage processing records"
  ON public.data_processing_records FOR ALL
  USING (public.is_admin(auth.uid()::text));

-- Authenticated users can read (transparency principle)
CREATE POLICY "Users can view processing records"
  ON public.data_processing_records FOR SELECT
  USING (auth.role() = 'authenticated');

-- ── 4. Data Subject Requests (GDPR Art.15-22, CCPA §1798.100-125) ──────

CREATE TYPE data_request_type AS ENUM (
  'access',    -- Right of access (Art.15 / CCPA §1798.100)
  'rectification', -- Right to rectification (Art.16)
  'erasure',   -- Right to erasure (Art.17 / CCPA §1798.105)
  'portability', -- Right to data portability (Art.20)
  'restriction', -- Right to restriction (Art.18)
  'objection',   -- Right to object (Art.21)
  'opt_out'      -- CCPA opt-out of sale (§1798.120)
);

CREATE TYPE data_request_status AS ENUM (
  'pending', 'processing', 'completed', 'denied', 'expired'
);

CREATE TABLE IF NOT EXISTS public.data_subject_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  request_type data_request_type NOT NULL,
  status data_request_status NOT NULL DEFAULT 'pending',
  description TEXT,
  response_notes TEXT,
  requested_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  -- GDPR requires response within 30 days
  deadline_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days') NOT NULL,
  processed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data requests"
  ON public.data_subject_requests FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can create own data requests"
  ON public.data_subject_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);
-- Admins can manage all requests
CREATE POLICY "Admins can manage all data requests"
  ON public.data_subject_requests FOR ALL
  USING (public.is_admin(auth.uid()::text));

CREATE INDEX idx_dsr_user_id ON public.data_subject_requests(user_id);
CREATE INDEX idx_dsr_status ON public.data_subject_requests(status, deadline_at);

-- ── 5. Data Retention Policies (SOC2 CC6.5, GDPR Art.5(1)(e)) ──────────

CREATE TABLE IF NOT EXISTS public.data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL UNIQUE,
  retention_days INTEGER NOT NULL,
  description TEXT,
  legal_basis TEXT,
  auto_purge BOOLEAN DEFAULT false,
  last_purge_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage retention policies"
  ON public.data_retention_policies FOR ALL
  USING (public.is_admin(auth.uid()::text));
CREATE POLICY "Users can view retention policies"
  ON public.data_retention_policies FOR SELECT
  USING (auth.role() = 'authenticated');

-- Insert default retention policies
INSERT INTO public.data_retention_policies (table_name, retention_days, description, legal_basis) VALUES
  ('user_behavior_logs', 90, 'User behavioral analytics data', 'legitimate_interests'),
  ('user_sessions', 90, 'Session tracking data', 'legitimate_interests'),
  ('ai_conversations', 365, 'AI chat history', 'consent'),
  ('chat_messages', 365, 'Chat messages', 'consent'),
  ('activity_logs', 730, 'Business activity logs', 'contract'),
  ('security_audit_log', 2555, 'Security audit trail (7 years)', 'legal_obligation'),
  ('user_consents', 2555, 'Consent records (7 years)', 'legal_obligation'),
  ('data_subject_requests', 2555, 'Data subject requests (7 years)', 'legal_obligation')
ON CONFLICT (table_name) DO NOTHING;

-- ── 6. Data Breach Log (GDPR Art.33-34, HIPAA §164.408) ────────────────

CREATE TABLE IF NOT EXISTS public.data_breach_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  affected_records_count INTEGER,
  data_types_affected TEXT[],
  containment_actions TEXT,
  notification_required BOOLEAN DEFAULT false,
  -- GDPR: must notify authority within 72 hours
  authority_notified_at TIMESTAMPTZ,
  -- HIPAA: must notify individuals within 60 days
  individuals_notified_at TIMESTAMPTZ,
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  reported_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.data_breach_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage breach log"
  ON public.data_breach_log FOR ALL
  USING (public.is_admin(auth.uid()::text));

-- ── 7. GDPR Data Export Function (Art.20 - Right to Portability) ────────

CREATE OR REPLACE FUNCTION public.export_user_data(target_user_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Verify the requesting user is the target user or an admin
  IF auth.uid() != target_user_id AND NOT public.is_admin(auth.uid()::text) THEN
    RAISE EXCEPTION 'Access denied: Can only export own data';
  END IF;

  -- Log the export request
  INSERT INTO public.security_audit_log (user_id, action, resource, details, compliance_framework, outcome)
  VALUES (auth.uid()::text, 'data_export', 'user_data',
    jsonb_build_object('target_user_id', target_user_id),
    'GDPR', 'success');

  SELECT jsonb_build_object(
    'exported_at', now(),
    'user_id', target_user_id,
    'profile', (SELECT row_to_json(p) FROM user_profiles p WHERE p.id = target_user_id),
    'preferences', (SELECT row_to_json(up) FROM user_preferences up WHERE up.user_id = target_user_id),
    'business_context', (SELECT row_to_json(bc) FROM user_business_context bc WHERE bc.user_id = target_user_id::text),
    'clients', (SELECT COALESCE(json_agg(c), '[]'::json) FROM clients c WHERE c.user_id = target_user_id::text),
    'activity_logs', (SELECT COALESCE(json_agg(a), '[]'::json) FROM activity_logs a WHERE a.user_id = target_user_id::text),
    'contacts', (SELECT COALESCE(json_agg(tc), '[]'::json) FROM talent_contacts tc WHERE tc.user_id = target_user_id),
    'opportunities', (SELECT COALESCE(json_agg(o), '[]'::json) FROM opportunities o WHERE o.user_id = target_user_id::text),
    'revenue_entries', (SELECT COALESCE(json_agg(r), '[]'::json) FROM revenue_entries r WHERE r.user_id = target_user_id::text),
    'ai_conversations', (SELECT COALESCE(json_agg(ac), '[]'::json) FROM ai_conversations ac WHERE ac.user_id = target_user_id::text),
    'consents', (SELECT COALESCE(json_agg(uc), '[]'::json) FROM user_consents uc WHERE uc.user_id = target_user_id),
    'insights', (SELECT COALESCE(json_agg(ui), '[]'::json) FROM user_insights ui WHERE ui.user_id = target_user_id::text)
  ) INTO result;

  RETURN result;
END;
$$;

-- ── 8. GDPR Data Erasure Function (Art.17 - Right to Erasure) ───────────

CREATE OR REPLACE FUNCTION public.erase_user_data(target_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verify the requesting user is the target user or an admin
  IF auth.uid() != target_user_id AND NOT public.is_admin(auth.uid()::text) THEN
    RAISE EXCEPTION 'Access denied: Can only erase own data';
  END IF;

  -- Log the erasure request BEFORE deleting (for audit compliance)
  INSERT INTO public.security_audit_log (user_id, action, resource, details, compliance_framework, outcome)
  VALUES (auth.uid()::text, 'data_erasure', 'user_data',
    jsonb_build_object('target_user_id', target_user_id, 'reason', 'GDPR Art.17 request'),
    'GDPR', 'success');

  -- Create a record of the data subject request
  INSERT INTO public.data_subject_requests (user_id, request_type, status, completed_at)
  VALUES (target_user_id, 'erasure', 'completed', now());

  -- Delete user data in dependency order (cascading handles most)
  -- Non-cascading tables first:
  DELETE FROM public.user_insights WHERE user_id = target_user_id::text;
  DELETE FROM public.ai_conversations WHERE user_id = target_user_id::text;
  DELETE FROM public.chat_messages WHERE user_id = target_user_id::text;
  DELETE FROM public.conversation_sessions WHERE user_id = target_user_id::text;
  DELETE FROM public.user_behavior_logs WHERE user_id = target_user_id::text;
  DELETE FROM public.user_sessions WHERE user_id = target_user_id::text;
  DELETE FROM public.activity_logs WHERE user_id = target_user_id::text;
  DELETE FROM public.opportunities WHERE user_id = target_user_id::text;
  DELETE FROM public.revenue_entries WHERE user_id = target_user_id::text;
  DELETE FROM public.clients WHERE user_id = target_user_id::text;
  DELETE FROM public.talent_contacts WHERE user_id = target_user_id;
  DELETE FROM public.user_business_context WHERE user_id = target_user_id::text;
  DELETE FROM public.user_preferences WHERE user_id = target_user_id;
  DELETE FROM public.feature_usage WHERE user_id = target_user_id::text;
  DELETE FROM public.weekly_summaries WHERE user_id = target_user_id::text;
  DELETE FROM public.user_consents WHERE user_id = target_user_id;

  -- Anonymize profile rather than delete (preserve referential integrity)
  UPDATE public.user_profiles
  SET full_name = 'Deleted User',
      email = 'deleted-' || target_user_id || '@erased.local',
      avatar_url = NULL,
      updated_at = now()
  WHERE id = target_user_id;

  RETURN true;
END;
$$;

-- ── 9. Automated Data Retention Purge (SOC2 CC6.5) ─────────────────────

CREATE OR REPLACE FUNCTION public.purge_expired_data()
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  total_purged INTEGER := 0;
  rows_deleted INTEGER;
BEGIN
  -- Only allow service role to execute purges
  IF NOT EXISTS (
    SELECT 1 WHERE current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  ) THEN
    RAISE EXCEPTION 'Access denied: Purge can only be run by service role';
  END IF;

  -- Purge user_behavior_logs (90 days)
  DELETE FROM public.user_behavior_logs
  WHERE created_at < now() - INTERVAL '90 days';
  GET DIAGNOSTICS rows_deleted = ROW_COUNT;
  total_purged := total_purged + rows_deleted;

  -- Purge user_sessions (90 days)
  DELETE FROM public.user_sessions
  WHERE created_at < now() - INTERVAL '90 days';
  GET DIAGNOSTICS rows_deleted = ROW_COUNT;
  total_purged := total_purged + rows_deleted;

  -- Log the purge
  INSERT INTO public.security_audit_log (user_id, action, resource, details, compliance_framework, outcome)
  VALUES ('system', 'data_purge', 'retention_policy',
    jsonb_build_object('total_purged', total_purged, 'run_at', now()),
    'SOC2', 'success');

  -- Update last purge timestamps
  UPDATE public.data_retention_policies
  SET last_purge_at = now()
  WHERE table_name IN ('user_behavior_logs', 'user_sessions');

  RETURN total_purged;
END;
$$;

-- ── 10. Enhanced Audit Logging Function ─────────────────────────────────

CREATE OR REPLACE FUNCTION public.log_compliance_event(
  p_user_id TEXT,
  p_action TEXT,
  p_resource TEXT,
  p_details JSONB DEFAULT '{}'::JSONB,
  p_framework TEXT DEFAULT NULL,
  p_classification TEXT DEFAULT 'internal',
  p_outcome TEXT DEFAULT 'success'
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.security_audit_log (
    user_id, action, resource, details,
    compliance_framework, data_classification, outcome
  ) VALUES (
    p_user_id, p_action, p_resource, p_details,
    p_framework, p_classification, p_outcome
  )
  RETURNING id INTO event_id;

  RETURN event_id;
END;
$$;

-- ── 11. Seed Data Processing Records (GDPR Art.30 register) ────────────

INSERT INTO public.data_processing_records (
  processing_activity, purpose, legal_basis, data_categories,
  data_subjects, recipients, retention_period, security_measures
) VALUES
  ('User authentication', 'Account access and identity verification',
   'contract', ARRAY['email', 'password_hash', 'session_tokens'],
   ARRAY['registered_users'], ARRAY['Supabase Auth'],
   'Account lifetime + 30 days', ARRAY['encryption_in_transit', 'hashed_passwords', 'RLS']),

  ('Contact management', 'Store and manage professional contacts',
   'consent', ARRAY['name', 'email', 'phone', 'linkedin_url', 'company', 'title', 'city'],
   ARRAY['registered_users', 'contacts'],
   ARRAY['Apollo', 'Clearbit', 'Twilio'],
   '2 years or until deletion', ARRAY['RLS', 'encryption_in_transit']),

  ('AI-powered insights', 'Generate business recommendations and analysis',
   'consent', ARRAY['business_context', 'activity_logs', 'revenue_data', 'client_data'],
   ARRAY['registered_users'], ARRAY['OpenAI'],
   '1 year', ARRAY['RLS', 'encryption_in_transit', 'data_minimization']),

  ('Voice transcription', 'Convert voice recordings to text for activity logging',
   'consent', ARRAY['audio_recordings', 'transcripts'],
   ARRAY['registered_users'], ARRAY['OpenAI Whisper'],
   '2 years', ARRAY['RLS', 'encryption_in_transit']),

  ('Payment processing', 'Manage subscriptions and billing',
   'contract', ARRAY['stripe_customer_id', 'subscription_data'],
   ARRAY['registered_users'], ARRAY['Stripe'],
   'Account lifetime + 7 years (tax)', ARRAY['PCI_DSS_via_Stripe', 'encryption_in_transit']),

  ('Behavioral analytics', 'Improve user experience and product features',
   'legitimate_interests', ARRAY['page_views', 'feature_usage', 'session_data', 'device_info'],
   ARRAY['registered_users'], NULL,
   '90 days', ARRAY['RLS', 'anonymization_after_retention']),

  ('Google Sheets integration', 'Export business data to Google Sheets',
   'consent', ARRAY['oauth_tokens', 'business_data'],
   ARRAY['registered_users'], ARRAY['Google'],
   'Until disconnected', ARRAY['AES_GCM_encryption', 'token_rotation', 'RLS'])
ON CONFLICT DO NOTHING;

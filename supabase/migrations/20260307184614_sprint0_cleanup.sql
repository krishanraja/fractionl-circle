-- Sprint 0: Drop legacy tables from previous project
-- These tables do not belong in Circle (fractionl-circle)

DROP TABLE IF EXISTS public.customer_journey_tracking CASCADE;
DROP TABLE IF EXISTS public.customer_tool_sessions CASCADE;
DROP TABLE IF EXISTS public.lead_scoring CASCADE;
DROP TABLE IF EXISTS public.tool_performance_metrics CASCADE;
DROP TABLE IF EXISTS public.sheets_integrations CASCADE;
DROP TABLE IF EXISTS public.spreadsheet_sync CASCADE;
DROP TABLE IF EXISTS public.monthly_snapshots CASCADE;

-- Fix revenue_entries: add client_id FK so revenue is linked to clients
ALTER TABLE public.revenue_entries 
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_revenue_entries_client_id ON public.revenue_entries(client_id);

-- Redesign monthly_goals to be generic fractional exec (not personal)
-- Add new generic columns while keeping old ones for migration period
ALTER TABLE public.monthly_goals
  ADD COLUMN IF NOT EXISTS total_revenue_target NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS total_hours_capacity INTEGER,
  ADD COLUMN IF NOT EXISTS pipeline_target NUMERIC(10,2);

-- Add missing columns to talent_contacts for Black Book upgrade
ALTER TABLE public.talent_contacts
  ADD COLUMN IF NOT EXISTS met_at TEXT,
  ADD COLUMN IF NOT EXISTS met_date DATE,
  ADD COLUMN IF NOT EXISTS source TEXT CHECK (source IN ('linkedin', 'conference', 'referral', 'cold', 'client_intro', 'other')),
  ADD COLUMN IF NOT EXISTS last_interaction_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS company TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS vetted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notes_voice_raw TEXT;

-- Add talent_interactions table for relationship tracking
CREATE TABLE IF NOT EXISTS public.talent_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.talent_contacts(id) ON DELETE CASCADE NOT NULL,
  interaction_type TEXT CHECK (interaction_type IN ('referred', 'messaged', 'called', 'worked_with', 'met', 'emailed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.talent_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own talent interactions"
  ON public.talent_interactions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_talent_interactions_contact_id ON public.talent_interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_talent_interactions_user_id ON public.talent_interactions(user_id);

-- Computed relationship warmth: update last_interaction_date on new interaction
CREATE OR REPLACE FUNCTION update_contact_last_interaction()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.talent_contacts 
  SET last_interaction_date = NEW.created_at 
  WHERE id = NEW.contact_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_contact_last_interaction_trigger ON public.talent_interactions;
CREATE TRIGGER update_contact_last_interaction_trigger
  AFTER INSERT ON public.talent_interactions
  FOR EACH ROW EXECUTE FUNCTION update_contact_last_interaction();

-- Contact dedup & enrichment infrastructure
-- Phase 0: Enrichment warning system
-- Phase 1: talent_contact_identities table for server-side identity resolution
-- Phase 3: talent_contact_merges log for reversible merges

-- ─────────────────────────────────────────────────────────────────
-- Phase 0: Enrichment warning columns
-- Capture gestures always succeed; failed third-party enrichments
-- are flagged via these columns and resurfaced in the UI.
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE public.talent_contacts
  ADD COLUMN IF NOT EXISTS enrichment_status TEXT
    DEFAULT 'none'
    CHECK (enrichment_status IN ('none', 'pending', 'succeeded', 'failed', 'conflict')),
  ADD COLUMN IF NOT EXISTS enrichment_last_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enrichment_failure_reason TEXT,
  -- Set true when a critical field (name) fell back to a raw value (e.g. LinkedIn slug).
  ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_talent_contacts_needs_review
  ON public.talent_contacts(user_id)
  WHERE needs_review = TRUE OR enrichment_status IN ('failed', 'conflict');

-- Expand source enum to cover screenshot capture paths (Phase 2).
-- Existing CHECK constraint needs to be dropped and recreated.
ALTER TABLE public.talent_contacts
  DROP CONSTRAINT IF EXISTS talent_contacts_source_check;

ALTER TABLE public.talent_contacts
  ADD CONSTRAINT talent_contacts_source_check
  CHECK (source IS NULL OR source IN (
    'linkedin', 'conference', 'referral', 'cold', 'client_intro', 'other',
    'screenshot_linkedin', 'screenshot_instagram', 'screenshot_contacts',
    'voice', 'photo', 'instagram', 'phone_contacts'
  ));

-- ─────────────────────────────────────────────────────────────────
-- Phase 1: Identity keys table
-- One row per identifier (email, phone, linkedin_slug, instagram_handle, name_company).
-- Unique constraint on (user_id, kind, value_normalized) prevents duplicate
-- contacts during concurrent imports.
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.talent_contact_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.talent_contacts(id) ON DELETE CASCADE NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN (
    'email', 'phone', 'linkedin_slug', 'instagram_handle', 'name_company'
  )),
  value_normalized TEXT NOT NULL,
  value_raw TEXT,
  source TEXT,
  confidence NUMERIC(3, 2) DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Each (user, kind, normalized value) must be unique - this is what makes
-- concurrent bulk imports safe.
CREATE UNIQUE INDEX IF NOT EXISTS idx_talent_contact_identities_unique
  ON public.talent_contact_identities(user_id, kind, value_normalized);

CREATE INDEX IF NOT EXISTS idx_talent_contact_identities_contact
  ON public.talent_contact_identities(contact_id);

ALTER TABLE public.talent_contact_identities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own contact identities"
  ON public.talent_contact_identities
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Backfill identities from existing talent_contacts rows.
-- Normalizations here mirror src/hooks/useDuplicateDetection.ts and
-- supabase/functions/_shared/identity.ts - keep them in sync.

INSERT INTO public.talent_contact_identities (user_id, contact_id, kind, value_normalized, value_raw, source)
SELECT user_id, id, 'email', lower(trim(email)), email, 'backfill'
FROM public.talent_contacts
WHERE email IS NOT NULL AND email <> ''
ON CONFLICT (user_id, kind, value_normalized) DO NOTHING;

-- Phone normalization at SQL level is approximate; we strip non-digits and
-- keep a leading +. The edge function re-normalizes with libphonenumber.
INSERT INTO public.talent_contact_identities (user_id, contact_id, kind, value_normalized, value_raw, source)
SELECT user_id, id, 'phone',
  CASE
    WHEN phone LIKE '+%' THEN regexp_replace(phone, '[^0-9+]', '', 'g')
    ELSE regexp_replace(phone, '[^0-9]', '', 'g')
  END,
  phone, 'backfill'
FROM public.talent_contacts
WHERE phone IS NOT NULL AND phone <> ''
ON CONFLICT (user_id, kind, value_normalized) DO NOTHING;

INSERT INTO public.talent_contact_identities (user_id, contact_id, kind, value_normalized, value_raw, source)
SELECT user_id, id, 'linkedin_slug',
  lower(substring(linkedin_url from 'linkedin\.com/in/([^/?#[:space:]]+)')),
  linkedin_url, 'backfill'
FROM public.talent_contacts
WHERE linkedin_url IS NOT NULL
  AND linkedin_url ~* 'linkedin\.com/in/[^/?#[:space:]]+'
ON CONFLICT (user_id, kind, value_normalized) DO NOTHING;

-- Instagram handles live in portfolio_url today (https://instagram.com/<handle>)
INSERT INTO public.talent_contact_identities (user_id, contact_id, kind, value_normalized, value_raw, source)
SELECT user_id, id, 'instagram_handle',
  lower(substring(portfolio_url from 'instagram\.com/([a-zA-Z0-9._]+)')),
  portfolio_url, 'backfill'
FROM public.talent_contacts
WHERE portfolio_url IS NOT NULL
  AND portfolio_url ~* 'instagram\.com/[a-zA-Z0-9._]+'
ON CONFLICT (user_id, kind, value_normalized) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- Phase 3: Merge audit log
-- Every merge is recorded so it can be undone.
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.talent_contact_merges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  -- The contact that absorbed the data. The "loser" contact was either
  -- deleted or never created - snapshot_loser captures its state.
  surviving_contact_id UUID REFERENCES public.talent_contacts(id) ON DELETE CASCADE NOT NULL,
  snapshot_winner_before JSONB NOT NULL,
  snapshot_loser JSONB NOT NULL,
  snapshot_winner_after JSONB NOT NULL,
  field_choices JSONB,
  reversed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_talent_contact_merges_user
  ON public.talent_contact_merges(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_talent_contact_merges_contact
  ON public.talent_contact_merges(surviving_contact_id);

ALTER TABLE public.talent_contact_merges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own merge log"
  ON public.talent_contact_merges
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────
-- Auto-sync identities on talent_contacts insert/update
-- Keeps the identity table in lockstep with the contact row without
-- requiring every client to write to both.
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sync_contact_identities()
RETURNS TRIGGER AS $$
DECLARE
  slug TEXT;
  igh TEXT;
  phone_norm TEXT;
BEGIN
  -- Clear prior identity rows for this contact (update path). On INSERT this is a no-op.
  DELETE FROM public.talent_contact_identities WHERE contact_id = NEW.id;

  IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
    INSERT INTO public.talent_contact_identities (user_id, contact_id, kind, value_normalized, value_raw, source)
    VALUES (NEW.user_id, NEW.id, 'email', lower(trim(NEW.email)), NEW.email, 'trigger')
    ON CONFLICT (user_id, kind, value_normalized) DO NOTHING;
  END IF;

  IF NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
    phone_norm := CASE
      WHEN NEW.phone LIKE '+%' THEN regexp_replace(NEW.phone, '[^0-9+]', '', 'g')
      ELSE regexp_replace(NEW.phone, '[^0-9]', '', 'g')
    END;
    IF length(phone_norm) >= 7 THEN
      INSERT INTO public.talent_contact_identities (user_id, contact_id, kind, value_normalized, value_raw, source)
      VALUES (NEW.user_id, NEW.id, 'phone', phone_norm, NEW.phone, 'trigger')
      ON CONFLICT (user_id, kind, value_normalized) DO NOTHING;
    END IF;
  END IF;

  IF NEW.linkedin_url IS NOT NULL THEN
    slug := lower(substring(NEW.linkedin_url from 'linkedin\.com/in/([^/?#[:space:]]+)'));
    IF slug IS NOT NULL AND slug <> '' THEN
      INSERT INTO public.talent_contact_identities (user_id, contact_id, kind, value_normalized, value_raw, source)
      VALUES (NEW.user_id, NEW.id, 'linkedin_slug', slug, NEW.linkedin_url, 'trigger')
      ON CONFLICT (user_id, kind, value_normalized) DO NOTHING;
    END IF;
  END IF;

  IF NEW.portfolio_url IS NOT NULL THEN
    igh := lower(substring(NEW.portfolio_url from 'instagram\.com/([a-zA-Z0-9._]+)'));
    IF igh IS NOT NULL AND igh <> '' THEN
      INSERT INTO public.talent_contact_identities (user_id, contact_id, kind, value_normalized, value_raw, source, confidence)
      VALUES (NEW.user_id, NEW.id, 'instagram_handle', igh, NEW.portfolio_url, 'trigger', 0.9)
      ON CONFLICT (user_id, kind, value_normalized) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_contact_identities_trigger ON public.talent_contacts;
CREATE TRIGGER sync_contact_identities_trigger
  AFTER INSERT OR UPDATE OF email, phone, linkedin_url, portfolio_url
  ON public.talent_contacts
  FOR EACH ROW EXECUTE FUNCTION sync_contact_identities();

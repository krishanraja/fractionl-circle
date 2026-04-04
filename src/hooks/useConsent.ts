import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type ConsentType =
  | 'essential'
  | 'analytics'
  | 'marketing'
  | 'ai_processing'
  | 'third_party_sharing'
  | 'voice_recording'
  | 'data_export';

export interface ConsentRecord {
  consent_type: ConsentType;
  granted: boolean;
  granted_at: string | null;
  revoked_at: string | null;
  consent_version: string;
}

const CONSENT_VERSION = '1.0';
const LOCAL_STORAGE_KEY = 'fractionl_consent_preferences';

export function useConsent() {
  const { user } = useAuth();
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasConsented, setHasConsented] = useState(() => {
    try {
      return !!localStorage.getItem(LOCAL_STORAGE_KEY);
    } catch {
      return false;
    }
  });

  // Check local storage for anonymous consent (pre-auth)
  const getLocalConsent = useCallback((): Record<ConsentType, boolean> | null => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  // Fetch consents from database
  const fetchConsents = useCallback(async () => {
    if (!user) {
      const local = getLocalConsent();
      setHasConsented(!!local);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_consents' as any)
        .select('consent_type, granted, granted_at, revoked_at, consent_version')
        .eq('user_id', user.id);

      if (error) throw error;

      if (data && data.length > 0) {
        setConsents(data as unknown as ConsentRecord[]);
        setHasConsented(true);
      } else {
        // Fall back to localStorage for logged-in users whose DB records are missing
        const local = getLocalConsent();
        setHasConsented(!!local);
      }
    } catch (err) {
      console.error('Failed to fetch consents:', err);
      // On DB failure, still respect localStorage consent
      const local = getLocalConsent();
      setHasConsented(!!local);
    } finally {
      setLoading(false);
    }
  }, [user, getLocalConsent]);

  useEffect(() => {
    fetchConsents();
  }, [fetchConsents]);

  const updateConsent = useCallback(async (
    consentType: ConsentType,
    granted: boolean
  ): Promise<boolean> => {
    const local = getLocalConsent() || {};
    local[consentType] = granted;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(local));
    setHasConsented(true);

    if (!user) return true;

    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('user_consents' as any)
        .upsert({
          user_id: user.id,
          consent_type: consentType,
          granted,
          granted_at: granted ? now : null,
          revoked_at: granted ? null : now,
          consent_version: CONSENT_VERSION,
          updated_at: now,
        }, { onConflict: 'user_id,consent_type' });

      if (error) throw error;
      await fetchConsents();
      return true;
    } catch (err) {
      console.error('Failed to update consent:', err);
      return false;
    }
  }, [user, fetchConsents, getLocalConsent]);

  // Bulk update all consents
  const updateAllConsents = useCallback(async (
    consentMap: Partial<Record<ConsentType, boolean>>
  ) => {
    for (const [type, granted] of Object.entries(consentMap)) {
      await updateConsent(type as ConsentType, granted);
    }
  }, [updateConsent]);

  const syncLocalConsents = useCallback(async () => {
    if (!user) return;
    const local = getLocalConsent();
    if (!local) return;

    let allSynced = true;
    for (const [type, granted] of Object.entries(local)) {
      const ok = await updateConsent(type as ConsentType, granted as boolean);
      if (!ok) allSynced = false;
    }
    if (allSynced) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, [user, updateConsent, getLocalConsent]);

  // Check if a specific consent is granted
  const isConsentGranted = useCallback((type: ConsentType): boolean => {
    if (type === 'essential') return true; // Always required

    if (!user) {
      const local = getLocalConsent();
      return local?.[type] ?? false;
    }

    const consent = consents.find(c => c.consent_type === type);
    return consent?.granted ?? false;
  }, [user, consents, getLocalConsent]);

  return {
    consents,
    loading,
    hasConsented,
    updateConsent,
    updateAllConsents,
    syncLocalConsents,
    isConsentGranted,
  };
}

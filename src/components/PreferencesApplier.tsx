import { useEffect } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { applyUserPreferences, applyTheme, watchSystemTheme } from '@/lib/applyUserPreferences';

/** Syncs user_preferences from Supabase to the live DOM (theme, compact, motion). */
export function PreferencesApplier() {
  const { preferences } = useUserProfile();

  useEffect(() => {
    if (!preferences) return;
    applyUserPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    if (preferences?.theme !== 'system') return;
    return watchSystemTheme(() => applyTheme('system'));
  }, [preferences?.theme]);

  return null;
}

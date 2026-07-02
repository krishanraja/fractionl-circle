import { useEffect } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { applyUserPreferences, applyTheme, watchSystemTheme } from '@/lib/applyUserPreferences';
import { hideBootSplash } from '@/lib/bootSplash';

/** Syncs user_preferences from Supabase to the live DOM (theme, compact, motion). */
export function PreferencesApplier() {
  const { preferences } = useUserProfile();

  useEffect(() => {
    if (!preferences) return;
    applyUserPreferences(preferences);
    hideBootSplash(); // theme is now correct for this user - safe to reveal the app
  }, [preferences]);

  useEffect(() => {
    if (preferences?.theme !== 'system') return;
    return watchSystemTheme(() => applyTheme('system'));
  }, [preferences?.theme]);

  return null;
}

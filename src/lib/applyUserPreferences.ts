import type { UserPreferences } from '@/hooks/useUserProfile';

export type ThemePreference = UserPreferences['theme'];

/** Apply theme + layout prefs to the document (call after DB update or on load). */
export function applyUserPreferences(prefs: Partial<UserPreferences> | null | undefined) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  if (prefs?.theme) {
    applyTheme(prefs.theme);
  }

  if (prefs?.compact_mode !== undefined) {
    root.classList.toggle('compact-mode', Boolean(prefs.compact_mode));
  }

  if (prefs?.animations_enabled !== undefined) {
    root.classList.toggle('animations-disabled', prefs.animations_enabled === false);
  }
}

export function applyTheme(theme: ThemePreference) {
  const root = document.documentElement;
  // Dark-first ("walnut desk" is the brand): everything is dark unless the user
  // has explicitly opted into light. 'system' and unset both resolve to dark so
  // the night-shift look is the default the anxious operator opens at night.
  if (theme === 'light') {
    root.classList.remove('dark');
    return;
  }
  root.classList.add('dark');
}

/** Listen for OS theme changes when preference is "system". */
export function watchSystemTheme(onChange: () => void): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => onChange();
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}

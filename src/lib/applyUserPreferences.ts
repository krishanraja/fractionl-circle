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
  root.classList.remove('dark');

  if (theme === 'dark') {
    root.classList.add('dark');
    return;
  }

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) root.classList.add('dark');
  }
}

/** Listen for OS theme changes when preference is "system". */
export function watchSystemTheme(onChange: () => void): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => onChange();
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}

// Single source of truth for the "Remember me on this device" preference.
//
// Persistence of the Supabase session already works (persistSession + localStorage).
// The thing that logs a returning user out is the 30-minute inactivity auto-logout
// in SessionManager (a SOC2/HIPAA control). "Remember me" is an explicit, opt-in
// choice to disable that idle logout on THIS device - the user stays signed in until
// they sign out or clear their cookies/site data. Off by default keeps the compliant
// default for everyone who doesn't opt in.
const KEY = 'fractionl_remember_me';

export function getRememberMe(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setRememberMe(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    /* storage unavailable (private mode etc.): the compliant default (idle logout) stands */
  }
}

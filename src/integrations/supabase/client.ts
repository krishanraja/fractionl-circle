import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Whether the client bundle was built with the Supabase credentials it needs.
 * When false, the whole app is unusable - so the boot path (main.tsx) renders a
 * clear configuration screen instead of the app.
 *
 * Why not just `throw` here: this module is imported (directly or transitively)
 * by ~every screen and by main.tsx itself, so a module-load throw crashes the
 * bundle BEFORE React mounts. The ErrorBoundary lives inside React, so it never
 * gets to catch it - the user just sees a blank page once the splash safety-net
 * fades. Failing soft here keeps the app diagnosable.
 */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

if (!isSupabaseConfigured) {
  // Not routed through telemetry's reportError so this can't add an import that
  // itself runs at module load; a raw console.error is enough for diagnosis.
  console.error(
    '[supabase] Missing VITE_SUPABASE_URL and/or VITE_SUPABASE_PUBLISHABLE_KEY. ' +
      'The app cannot start. Set them in your deploy environment (or .env for local dev).'
  );
}

// Fall back to a syntactically valid placeholder when unconfigured so
// createClient() itself does not throw at module load. No requests are made in
// that state - main.tsx short-circuits to the configuration screen - so the
// placeholder is never actually contacted.
export const supabase = createClient<Database>(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_PUBLISHABLE_KEY || 'placeholder-anon-key',
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

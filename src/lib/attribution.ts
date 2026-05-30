// First-touch acquisition attribution (5c).
//
// Captured on the public surface from UTM params + referrer + landing path,
// persisted in localStorage (first-touch wins) plus a long-lived cookie for the
// anonymous_id (so it survives the OAuth full-page redirect), and flushed once to
// public.user_attribution on the first authenticated session. stripe-checkout
// reads that row to stamp Stripe metadata, and lifecycle events carry it to the
// central warehouse so every signup and dollar is attributable (5d).

import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'circle.attribution';
const AID_COOKIE = 'circle_aid';
const TWO_YEARS_SEC = 60 * 60 * 24 * 730;

export interface AttributionContext {
  anonymous_id: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  campaign_id: string | null;
  agent: string | null;
  referrer: string | null;
  landing_path: string | null;
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `aid_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
  }
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, maxAgeSec: number): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSec}; Path=/; SameSite=Lax; Secure`;
}

function readStored(): AttributionContext | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AttributionContext) : null;
  } catch {
    return null;
  }
}

/**
 * Capture acquisition context on page load. First-touch wins: once a record
 * carries a real source (utm_source / campaign_id / agent), later organic visits
 * never overwrite it. The anonymous_id is kept continuous via cookie + storage.
 * Safe to call on every load; never throws.
 */
export function captureAttribution(): AttributionContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const existing = readStored();
    const anonymous_id = readCookie(AID_COOKIE) || existing?.anonymous_id || newId();
    writeCookie(AID_COOKIE, anonymous_id, TWO_YEARS_SEC);

    const hasFirstTouch = !!(existing && (existing.utm_source || existing.campaign_id || existing.agent));
    if (hasFirstTouch) {
      const merged = { ...(existing as AttributionContext), anonymous_id };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }

    const ctx: AttributionContext = {
      anonymous_id,
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_content: params.get('utm_content'),
      utm_term: params.get('utm_term'),
      campaign_id: params.get('campaign_id'),
      agent: params.get('agent'),
      referrer: document.referrer || null,
      landing_path: window.location.pathname || null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
    return ctx;
  } catch {
    return null;
  }
}

export function getAttribution(): AttributionContext | null {
  return readStored();
}

const SIGNED_UP_GUARD_KEY = 'circle.lifecycle.signed_up';

/**
 * Emit a canonical lifecycle event to the central warehouse, server-side (the
 * edge function holds the secret; the browser never does). The function is inert
 * until the OS provisions ATTRIBUTION_INGEST_SECRET, so this is safe to call
 * before the receiver exists. Fire-and-forget: never blocks, never throws.
 *
 * 'signed_up' is guarded to fire at most once per session (sessionStorage), so a
 * token refresh re-firing SIGNED_IN does not re-emit it. 'activated' is keyed
 * server-side on the user_id, so emitting it more than once is harmless (deduped
 * downstream).
 */
export function emitLifecycle(event: 'signed_up' | 'activated'): void {
  try {
    if (event === 'signed_up') {
      if (sessionStorage.getItem(SIGNED_UP_GUARD_KEY)) return;
      sessionStorage.setItem(SIGNED_UP_GUARD_KEY, '1');
    }
    const ctx = getAttribution();
    void supabase.functions
      .invoke('emit-lifecycle', { body: { event, ...(ctx ?? {}) } })
      .catch(() => {
        // Non-fatal: lifecycle emit must never affect the app.
      });
  } catch {
    // sessionStorage unavailable (private mode etc.): skip silently.
  }
}

/**
 * Flush the captured context to public.user_attribution once, on the first
 * authenticated session. Write-once (first-touch immutable): skips if a row
 * already exists. Never blocks auth: all failures are swallowed.
 */
export async function flushAttribution(userId: string): Promise<void> {
  const ctx = getAttribution();
  if (!ctx || !userId) return;
  try {
    const { data: existing } = await supabase
      .from('user_attribution')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (existing) return;
    await supabase.from('user_attribution').insert({
      user_id: userId,
      anonymous_id: ctx.anonymous_id,
      utm_source: ctx.utm_source,
      utm_medium: ctx.utm_medium,
      utm_campaign: ctx.utm_campaign,
      utm_content: ctx.utm_content,
      utm_term: ctx.utm_term,
      campaign_id: ctx.campaign_id,
      agent: ctx.agent,
      referrer: ctx.referrer,
      landing_path: ctx.landing_path,
    });
  } catch {
    // Non-fatal: attribution must never block sign-in.
  }
}

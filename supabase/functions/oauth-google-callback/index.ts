import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { exchangeCodeForTokens, fetchGoogleUserEmail } from '../_shared/googleOauth.ts';

// Phase 5: Google OAuth callback. Google redirects the user here with
// ?code=... &state=... ; we validate state, exchange code for tokens, upsert
// oauth_tokens, create/refresh a `google` source, then redirect the browser
// back to the app with a ?oauth=google&status=... marker.

const APP_URL = Deno.env.get('APP_URL') ?? 'https://circle.fractionl.ai';

function renderRedirect(params: Record<string, string>): Response {
  const q = new URLSearchParams(params).toString();
  const target = `${APP_URL.replace(/\/$/, '')}/?${q}`;
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Connecting…</title>
<script>window.location.replace(${JSON.stringify(target)});</script>
<noscript><meta http-equiv="refresh" content="0;url=${target}"></noscript>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');

  if (errorParam) {
    return renderRedirect({ oauth: 'google', status: 'error', reason: errorParam });
  }
  if (!code || !state) {
    return renderRedirect({ oauth: 'google', status: 'error', reason: 'missing_params' });
  }

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Validate state. Delete on use to prevent replay.
    const { data: stateRow, error: stateErr } = await admin
      .from('oauth_states')
      .select('user_id, provider, expires_at, redirect_to')
      .eq('state', state)
      .eq('provider', 'google')
      .maybeSingle();
    if (stateErr) throw stateErr;
    if (!stateRow) return renderRedirect({ oauth: 'google', status: 'error', reason: 'unknown_state' });

    const expired = new Date(stateRow.expires_at).getTime() < Date.now();
    await admin.from('oauth_states').delete().eq('state', state);
    if (expired) return renderRedirect({ oauth: 'google', status: 'error', reason: 'expired_state' });

    const userId = stateRow.user_id as string;
    const tokens = await exchangeCodeForTokens(code);
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + (tokens.expires_in - 60) * 1000).toISOString()
      : null;

    // Upsert into oauth_tokens (one row per (user_id, provider)).
    const { error: upsertErr } = await admin
      .from('oauth_tokens')
      .upsert({
        user_id: userId,
        provider: 'google',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        token_type: tokens.token_type ?? null,
        scope: tokens.scope ?? null,
        expires_at: expiresAt,
      }, { onConflict: 'user_id,provider' });
    if (upsertErr) throw upsertErr;

    // Best-effort: fetch the user's Google email for a nicer source label.
    const email = await fetchGoogleUserEmail(tokens.access_token).catch(() => null);

    // Upsert the matching `google` source in the Circle. If one already
    // exists we flip it back to `ingesting`; sync-google marks it active.
    const { data: existing } = await admin
      .from('sources')
      .select('id')
      .eq('user_id', userId)
      .eq('kind', 'google')
      .maybeSingle();

    if (existing) {
      await admin
        .from('sources')
        .update({
          status: 'ingesting',
          label: email ? `Google (${email})` : 'Google',
          last_error: null,
        })
        .eq('id', existing.id);
    } else {
      await admin.from('sources').insert({
        user_id: userId,
        kind: 'google',
        status: 'ingesting',
        label: email ? `Google (${email})` : 'Google',
      });
    }

    return renderRedirect({ oauth: 'google', status: 'ok' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return renderRedirect({ oauth: 'google', status: 'error', reason: msg.slice(0, 200) });
  }
});

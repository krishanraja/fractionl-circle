import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { exchangeMsCodeForTokens, fetchMsUserEmail } from '../_shared/microsoftOauth.ts';

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

  if (errorParam) return renderRedirect({ oauth: 'microsoft', status: 'error', reason: errorParam });
  if (!code || !state) return renderRedirect({ oauth: 'microsoft', status: 'error', reason: 'missing_params' });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: stateRow, error: stateErr } = await admin
      .from('oauth_states')
      .select('user_id, provider, expires_at, redirect_to')
      .eq('state', state)
      .eq('provider', 'microsoft')
      .maybeSingle();
    if (stateErr) throw stateErr;
    if (!stateRow) return renderRedirect({ oauth: 'microsoft', status: 'error', reason: 'unknown_state' });

    const expired = new Date(stateRow.expires_at).getTime() < Date.now();
    await admin.from('oauth_states').delete().eq('state', state);
    if (expired) return renderRedirect({ oauth: 'microsoft', status: 'error', reason: 'expired_state' });

    const userId = stateRow.user_id as string;
    const tokens = await exchangeMsCodeForTokens(code);
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + (tokens.expires_in - 60) * 1000).toISOString()
      : null;

    const { error: upsertErr } = await admin
      .from('oauth_tokens')
      .upsert({
        user_id: userId,
        provider: 'microsoft',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        token_type: tokens.token_type ?? null,
        scope: tokens.scope ?? null,
        expires_at: expiresAt,
      }, { onConflict: 'user_id,provider' });
    if (upsertErr) throw upsertErr;

    const email = await fetchMsUserEmail(tokens.access_token).catch(() => null);

    const { data: existing } = await admin
      .from('sources')
      .select('id')
      .eq('user_id', userId)
      .eq('kind', 'microsoft')
      .maybeSingle();

    if (existing) {
      await admin.from('sources').update({
        status: 'ingesting',
        label: email ? `Microsoft (${email})` : 'Microsoft',
        last_error: null,
      }).eq('id', existing.id);
    } else {
      await admin.from('sources').insert({
        user_id: userId,
        kind: 'microsoft',
        status: 'ingesting',
        label: email ? `Microsoft (${email})` : 'Microsoft',
      });
    }

    return renderRedirect({ oauth: 'microsoft', status: 'ok' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return renderRedirect({ oauth: 'microsoft', status: 'error', reason: msg.slice(0, 200) });
  }
});

// Phase 5b: Microsoft Graph OAuth helpers. Mirrors googleOauth.ts. Uses the
// `common` tenant so both personal Microsoft accounts and AAD work-or-school
// accounts can sign in.

// deno-lint-ignore-file no-explicit-any

export const MS_TENANT = Deno.env.get('MS_TENANT') ?? 'common';
export const MS_AUTH_URL = `https://login.microsoftonline.com/${MS_TENANT}/oauth2/v2.0/authorize`;
export const MS_TOKEN_URL = `https://login.microsoftonline.com/${MS_TENANT}/oauth2/v2.0/token`;

// Non-restricted Microsoft Graph scopes. offline_access yields a refresh
// token. We deliberately stay out of Mail.* (parallel to gmail.readonly).
export const MS_SCOPES = [
  'openid',
  'email',
  'profile',
  'offline_access',
  'User.Read',
  'Contacts.Read',
  'Calendars.Read',
].join(' ');

export interface StoredMsToken {
  id: string;
  user_id: string;
  provider: 'microsoft';
  access_token: string;
  refresh_token: string | null;
  token_type: string | null;
  scope: string | null;
  expires_at: string | null;
}

export interface MsTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
}

export function getMsRedirectUri(): string {
  const url = Deno.env.get('SUPABASE_URL');
  if (!url) throw new Error('SUPABASE_URL not configured');
  return `${url}/functions/v1/oauth-microsoft-callback`;
}

export function buildMsAuthorizeUrl(state: string, clientId: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getMsRedirectUri(),
    response_type: 'code',
    response_mode: 'query',
    scope: MS_SCOPES,
    prompt: 'consent',
    state,
  });
  return `${MS_AUTH_URL}?${params.toString()}`;
}

export async function exchangeMsCodeForTokens(code: string): Promise<MsTokenResponse> {
  const clientId = Deno.env.get('MS_CLIENT_ID');
  const clientSecret = Deno.env.get('MS_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('Microsoft OAuth env not configured');

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: getMsRedirectUri(),
    grant_type: 'authorization_code',
    scope: MS_SCOPES,
  });
  const resp = await fetch(MS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Microsoft token exchange failed: ${resp.status} ${text}`);
  }
  return await resp.json();
}

export async function refreshMsAccessToken(refreshToken: string): Promise<MsTokenResponse> {
  const clientId = Deno.env.get('MS_CLIENT_ID');
  const clientSecret = Deno.env.get('MS_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('Microsoft OAuth env not configured');

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    scope: MS_SCOPES,
  });
  const resp = await fetch(MS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Microsoft refresh failed: ${resp.status} ${text}`);
  }
  return await resp.json();
}

export async function getValidMsAccessToken(admin: any, userId: string): Promise<string> {
  const { data, error } = await admin
    .from('oauth_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'microsoft')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('No microsoft token for user');
  const token = data as StoredMsToken;
  const expiresAt = token.expires_at ? new Date(token.expires_at).getTime() : 0;
  const needsRefresh = expiresAt - Date.now() < 60_000;
  if (!needsRefresh) return token.access_token;
  if (!token.refresh_token) {
    throw new Error('Microsoft access token expired and no refresh token; user must reconnect');
  }
  const refreshed = await refreshMsAccessToken(token.refresh_token);
  const nextExpiresAt = refreshed.expires_in
    ? new Date(Date.now() + (refreshed.expires_in - 60) * 1000).toISOString()
    : null;
  await admin.from('oauth_tokens').update({
    access_token: refreshed.access_token,
    token_type: refreshed.token_type ?? token.token_type,
    scope: refreshed.scope ?? token.scope,
    expires_at: nextExpiresAt,
    refresh_token: refreshed.refresh_token ?? token.refresh_token,
  }).eq('id', token.id);
  return refreshed.access_token;
}

export async function fetchMsUserEmail(accessToken: string): Promise<string | null> {
  const resp = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.mail ?? data.userPrincipalName ?? null;
}

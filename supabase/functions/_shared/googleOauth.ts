// Phase 5: shared Google OAuth helpers.
// Gmail readonly + send scopes are restricted. The OAuth app stays in
// Testing mode (test users only) to use them without the CASA audit.
// Move to production + CASA only once usage justifies it.

// deno-lint-ignore-file no-explicit-any

// Base scopes (current production behavior). gmail.readonly + gmail.send are
// restricted; the OAuth app stays in Testing mode (test users only) to use them
// without the CASA audit.
const GOOGLE_BASE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/contacts.other.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
];

// Calendar scope is requested as read-only by default. Once the calendar.events
// (write) sensitive scope clears Google verification, flip
// GOOGLE_CALENDAR_WRITE_ENABLED=true and the warm-reach digest can write holds
// straight onto the user's calendar (the write scope is a superset of read, so
// the existing calendar sync keeps working). Off by default => no behavior change
// and no premature consent-screen warnings before verification.
const CALENDAR_READ = 'https://www.googleapis.com/auth/calendar.events.readonly';
const CALENDAR_WRITE = 'https://www.googleapis.com/auth/calendar.events';

export function calendarWriteEnabled(): boolean {
  return (Deno.env.get('GOOGLE_CALENDAR_WRITE_ENABLED') ?? '').toLowerCase() === 'true';
}

// The space-delimited scope string requested at authorize time.
export function googleScopes(): string {
  return [...GOOGLE_BASE_SCOPES, calendarWriteEnabled() ? CALENDAR_WRITE : CALENDAR_READ].join(' ');
}

// Back-compat: the current default scope set as a constant.
export const GOOGLE_SCOPES = googleScopes();

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export interface StoredToken {
  id: string;
  user_id: string;
  provider: 'google' | 'microsoft';
  access_token: string;
  refresh_token: string | null;
  token_type: string | null;
  scope: string | null;
  expires_at: string | null;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
}

export function getRedirectUri(): string {
  const url = Deno.env.get('SUPABASE_URL');
  if (!url) throw new Error('SUPABASE_URL not configured');
  return `${url}/functions/v1/oauth-google-callback`;
}

export function buildAuthorizeUrl(state: string, clientId: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: googleScopes(),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('Google OAuth env not configured');

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: getRedirectUri(),
    grant_type: 'authorization_code',
  });
  const resp = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Google token exchange failed: ${resp.status} ${text}`);
  }
  return await resp.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('Google OAuth env not configured');

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  const resp = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Google refresh failed: ${resp.status} ${text}`);
  }
  return await resp.json();
}

// Pull the stored token row; if it's within 60s of expiry (or already
// expired) refresh it, persist, and return the live access token.
export async function getValidAccessToken(
  admin: any,
  userId: string,
  provider: 'google' = 'google',
): Promise<string> {
  const { data, error } = await admin
    .from('oauth_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`No ${provider} token for user`);

  const token = data as StoredToken;
  const expiresAt = token.expires_at ? new Date(token.expires_at).getTime() : 0;
  const needsRefresh = expiresAt - Date.now() < 60_000;

  if (!needsRefresh) return token.access_token;
  if (!token.refresh_token) {
    throw new Error('Access token expired and no refresh token available; user must reconnect');
  }

  const refreshed = await refreshAccessToken(token.refresh_token);
  const nextExpiresAt = refreshed.expires_in
    ? new Date(Date.now() + (refreshed.expires_in - 60) * 1000).toISOString()
    : null;
  await admin
    .from('oauth_tokens')
    .update({
      access_token: refreshed.access_token,
      token_type: refreshed.token_type ?? token.token_type,
      scope: refreshed.scope ?? token.scope,
      expires_at: nextExpiresAt,
      // Google sometimes re-issues a refresh token; persist when it does.
      refresh_token: refreshed.refresh_token ?? token.refresh_token,
    })
    .eq('id', token.id);
  return refreshed.access_token;
}

export async function fetchGoogleUserEmail(accessToken: string): Promise<string | null> {
  const resp = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.email ?? null;
}

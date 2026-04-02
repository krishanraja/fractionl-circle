// FORCE DEPLOYMENT v4.0 - Added token encryption for security
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import { getCorsHeaders } from '../_shared/compliance.ts';

// CORS is now handled by getCorsHeaders() — see individual handlers below

// Deployment marker for debugging
const DEPLOYMENT_VERSION = '4.0-TOKEN-ENCRYPTION'

interface GoogleCredentials {
  web: {
    client_id: string;
    client_secret: string;
    auth_uri: string;
    token_uri: string;
    redirect_uris: string[];
  }
}

// Token encryption utilities for security
async function encryptToken(token: string): Promise<string> {
  const encryptionKey = Deno.env.get('TOKEN_ENCRYPTION_KEY');
  if (!encryptionKey) {
    throw new Error('TOKEN_ENCRYPTION_KEY not configured');
  }
  
  // Import Web Crypto API for encryption
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const keyData = encoder.encode(encryptionKey.padEnd(32, '0').slice(0, 32)); // Ensure 32 bytes
  
  // Import key for AES-GCM encryption
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt the token
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  
  // Combine IV and encrypted data, then base64 encode
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

async function decryptToken(encryptedToken: string): Promise<string> {
  const encryptionKey = Deno.env.get('TOKEN_ENCRYPTION_KEY');
  if (!encryptionKey) {
    throw new Error('TOKEN_ENCRYPTION_KEY not configured');
  }
  
  try {
    // Decode base64
    const combined = new Uint8Array(
      atob(encryptedToken).split('').map(char => char.charCodeAt(0))
    );
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const encoder = new TextEncoder();
    const keyData = encoder.encode(encryptionKey.padEnd(32, '0').slice(0, 32)); // Ensure 32 bytes
    
    // Import key for AES-GCM decryption
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    // Decrypt the token
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Token decryption failed:', error);
    throw new Error('Failed to decrypt token - may be corrupted or using wrong key');
  }
}

async function validateTokenSecurity(supabase: any, userId: string): Promise<boolean> {
  try {
    // Check token integrity
    const { data: isValid, error } = await supabase
      .rpc('verify_token_integrity', { target_user_id: userId });
    
    if (error || !isValid) {
      console.error('Token integrity check failed:', error);
      await supabase.rpc('log_token_access', {
        target_user_id: userId,
        access_type: 'integrity_check',
        success: false,
        additional_info: { error: error?.message || 'Token integrity validation failed' }
      });
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Token security validation error:', error);
    return false;
  }
}

function getGoogleCredentials(): GoogleCredentials {
  const rawCredentials = Deno.env.get('GOOGLE_OAUTH_CREDENTIALS');
  if (!rawCredentials) {
    throw new Error('GOOGLE_OAUTH_CREDENTIALS not configured');
  }
  
  const credentials: GoogleCredentials = JSON.parse(rawCredentials);
  if (!credentials.web) {
    throw new Error('Invalid Google OAuth credentials format');
  }
  
  return credentials;
}

// Enhanced main Deno.serve handler with security improvements
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    
    console.log(`Google Sheets Integration request: ${action}`);

    // Handle Google OAuth callback - detect by presence of code and state parameters
    if (code && state) {
      console.log('Detected Google OAuth callback with code and state parameters');
      return await handleExchangeCodeNoAuth(req);
    }

    // test_secret endpoint removed — use test-google-secret function with admin auth instead
    // exchange_code without auth removed — OAuth callback flow handles this

    // All actions require authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header missing' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client for authenticated requests
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.53.0');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Get user from JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Authentication failed:', userError);
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userId = user.id;
    console.log(`Authenticated user: ${userId}`);

    // Parse request body for authenticated actions
    const body = req.method === 'POST' ? await req.json() : {};

    // Route to appropriate handler with enhanced security
    switch (action) {
      case 'auth_url':
        return await handleAuthUrl(body, supabase, userId);
      case 'create_sheet':
        // Validate token security before sensitive operations
        if (!(await validateTokenSecurity(supabase, userId))) {
          return new Response(JSON.stringify({ error: 'Token security validation failed' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return await handleCreateSheet(body, supabase, userId);
      case 'export_data':
        // Validate token security before data operations
        if (!(await validateTokenSecurity(supabase, userId))) {
          return new Response(JSON.stringify({ error: 'Token security validation failed' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return await handleExportData(body, supabase, userId);
      case 'refresh_all_data':
        // Validate token security before refresh operations
        if (!(await validateTokenSecurity(supabase, userId))) {
          return new Response(JSON.stringify({ error: 'Token security validation failed' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return await handleRefreshAllData(body, supabase, userId);
      case 'export_crm':
        return await handleExportCrm(body, supabase, userId);
      case 'import_data':
        return await handleImportData(body, supabase, userId);
      case 'create_calendar_event':
        return await handleCreateCalendarEvent(body, supabase, userId);
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Error in Google Sheets integration:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function handleAuthUrl(body: any, supabase: any, userId: string) {
  const credentials = getGoogleCredentials();
  
  // Validate credentials structure
  if (!credentials.web) {
    throw new Error('Invalid Google OAuth credentials: missing "web" object');
  }
  
  if (!credentials.web.auth_uri) {
    throw new Error('Invalid Google OAuth credentials: missing "auth_uri"');
  }
  
  if (!credentials.web.client_id) {
    throw new Error('Invalid Google OAuth credentials: missing "client_id"');
  }
  
  if (!credentials.web.redirect_uris || credentials.web.redirect_uris.length === 0) {
    throw new Error('Invalid Google OAuth credentials: missing or empty "redirect_uris" array. Please add a redirect URI in your Google Cloud Console OAuth configuration.');
  }
  
  // Create state parameter to securely link callback to user
  const state = btoa(JSON.stringify({ userId, timestamp: Date.now() }));
  
  const authUrl = new URL(credentials.web.auth_uri);
  authUrl.searchParams.set('client_id', credentials.web.client_id);
  authUrl.searchParams.set('redirect_uri', credentials.web.redirect_uris[0]);
  authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/calendar.events');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', state);

  console.log('Generated auth URL:', authUrl.toString());

  return new Response(
    JSON.stringify({ authUrl: authUrl.toString() }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleExchangeCode(code: string, credentials: GoogleCredentials, supabase: any, userId: string) {
  const tokenResponse = await fetch(credentials.web.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: credentials.web.client_id,
      client_secret: credentials.web.client_secret,
      redirect_uri: credentials.web.redirect_uris[0],
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await tokenResponse.json();
  
  if (tokens.error) {
    throw new Error(`Token exchange failed: ${tokens.error}`);
  }

  // Encrypt tokens before storage (CRITICAL: never store plaintext OAuth tokens)
  const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));
  const encryptedAccessToken = await encryptToken(tokens.access_token);
  const encryptedRefreshToken = tokens.refresh_token ? await encryptToken(tokens.refresh_token) : null;

  const { error } = await supabase
    .from('sheets_integrations')
    .upsert({
      user_id: userId,
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      token_expires_at: expiresAt.toISOString(),
      sync_status: 'success'
    });

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleCreateSheet(body: any, supabase: any, userId: string) {
  const { data: integration } = await supabase
    .from('sheets_integrations')
    .select('access_token')
    .eq('user_id', userId)
    .single();

  if (!integration || !integration.access_token) {
    throw new Error('No Google Sheets integration found');
  }

  // Decrypt the access token for API calls
  const decryptedAccessToken = await decryptToken(integration.access_token);

  const sheetData = {
    properties: {
      title: body.title || 'Fractionl AI: Copilot',
    },
    sheets: [
      { properties: { title: 'Monthly Goals' } },
      { properties: { title: 'Daily Progress' } },
      { properties: { title: 'Opportunities' } },
      { properties: { title: 'Revenue' } }
    ]
  };

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${decryptedAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sheetData),
  });

  const sheet = await response.json();
  
  if (sheet.error) {
    throw new Error(`Sheet creation failed: ${sheet.error.message}`);
  }

  // Update integration with sheet ID
  await supabase
    .from('sheets_integrations')
    .update({
      google_sheet_id: sheet.spreadsheetId,
      sheet_name: sheet.properties.title
    })
    .eq('user_id', userId);

  return new Response(
    JSON.stringify({ spreadsheetId: sheet.spreadsheetId, url: sheet.spreadsheetUrl }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleExportData(body: any, supabase: any, userId: string) {
  const { dataType, month } = body;
  
  // Get the user's stored access token using secure function
  const { data: tokens, error: tokenError } = await supabase
    .rpc('get_user_google_tokens', { target_user_id: userId });
  
  if (tokenError || !tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ error: 'No valid tokens found' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  const tokenData = tokens[0];
  
  // Get sheet ID separately
  const { data: integration, error: integrationError } = await supabase
    .from('sheets_integrations')
    .select('google_sheet_id')
    .eq('user_id', userId)
    .single();

  if (integrationError || !integration || !integration.google_sheet_id) {
    return new Response(JSON.stringify({ error: 'No Google Sheets integration found' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Log token access for audit trail
  await supabase.rpc('log_token_access', {
    target_user_id: userId,
    access_type: 'api_call',
    success: true,
    additional_info: { operation: 'export_data', data_type: dataType }
  });

  // Decrypt the access token for API calls
  const decryptedAccessToken = await decryptToken(tokenData.access_token);

  let data, range, values;

  switch (dataType) {
    case 'monthly_goals':
      const { data: goals } = await supabase
        .from('monthly_goals')
        .select('*')
        .eq('user_id', userId)
        .eq('month', month);
      
      values = [
        ['Month', 'Revenue Forecast', 'Cost Budget', 'Workshops Target', 'Advisory Target', 'Lectures Target', 'PR Target'],
        ...(goals || []).map((g: any) => [
          g.month, g.revenue_forecast, g.cost_budget, 
          g.workshops_target, g.advisory_target, g.lectures_target, g.pr_target
        ])
      ];
      range = 'Monthly Goals!A1';
      break;
      
    case 'daily_progress':
      const { data: progress } = await supabase
        .from('daily_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('month', month);
      
      values = [
        ['Date', 'Workshops Progress', 'Advisory Progress', 'Lectures Progress', 'PR Progress', 'Notes'],
        ...(progress || []).map((p: any) => [
          p.date, p.workshops_progress, p.advisory_progress, 
          p.lectures_progress, p.pr_progress, p.notes || ''
        ])
      ];
      range = 'Daily Progress!A1';
      break;
      
    default:
      throw new Error('Invalid data type');
  }

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${integration.google_sheet_id}/values/${range}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${decryptedAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    }
  );

  const result = await response.json();
  
  if (result.error) {
    throw new Error(`Export failed: ${result.error.message}`);
  }

  return new Response(
    JSON.stringify({ success: true, updatedCells: result.updatedCells }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleExchangeCodeNoAuth(req: Request) {
  // Initialize Supabase client for database operations
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Parse request URL and body
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  console.log('OAuth callback received:', { hasCode: !!code, hasState: !!state, error });

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error);
    return new Response(
      `<html><body><script>
        window.opener.postMessage({ 
          type: 'oauth_error', 
          error: '${error}' 
        }, '*');
        window.close();
      </script></body></html>`,
      { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
    );
  }

  if (!code) {
    return new Response(
      `<html><body><script>
        window.opener.postMessage({ 
          type: 'oauth_error', 
          error: 'No authorization code received' 
        }, '*');
        window.close();
      </script></body></html>`,
      { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
    );
  }

  if (!state) {
    return new Response(
      `<html><body><script>
        window.opener.postMessage({ 
          type: 'oauth_error', 
          error: 'Missing state parameter' 
        }, '*');
        window.close();
      </script></body></html>`,
      { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
    );
  }

  try {
    // Decode state to get user ID
    const { userId } = JSON.parse(atob(state));
    console.log('Decoded state - userId:', userId);

    // Get Google credentials
    const rawCredentials = Deno.env.get('GOOGLE_OAUTH_CREDENTIALS');
    if (!rawCredentials) {
      throw new Error('Google OAuth credentials not configured');
    }
    
    const credentials: GoogleCredentials = JSON.parse(rawCredentials);

    // Exchange code for tokens
    const tokenResponse = await fetch(credentials.web.token_uri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: credentials.web.client_id,
        client_secret: credentials.web.client_secret,
        redirect_uri: credentials.web.redirect_uris[0],
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();
    
    if (tokens.error) {
      throw new Error(`Token exchange failed: ${tokens.error}`);
    }

    // Store tokens in database with encryption
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));
    
    // Encrypt sensitive tokens before storage
    const encryptedAccessToken = await encryptToken(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token ? await encryptToken(tokens.refresh_token) : null;
    
    console.log('Storing encrypted tokens for user:', userId);
    
    // Store the integration
    const { error: dbError } = await supabase
      .from('sheets_integrations')
      .upsert({
        user_id: userId,
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: expiresAt.toISOString(),
        sync_status: 'success'
      });

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log('OAuth integration completed, now auto-creating spreadsheet for user:', userId);
    
    // Automatically create and populate the spreadsheet
    let spreadsheetCreated = false;
    let spreadsheetId = null;
    try {
      const result = await autoCreateAndPopulateSheet(tokens.access_token, supabase, userId);
      console.log('Auto-creation and population completed successfully:', result);
      spreadsheetCreated = true;
      spreadsheetId = result.spreadsheetId;
    } catch (createError) {
      console.error('Auto-creation failed:', createError);
      // Don't fail the OAuth process if sheet creation fails
      // User can see the error and try again
    }

    // Return success HTML that notifies the parent window and closes the popup
    const message = spreadsheetCreated 
      ? `Google Sheets integration completed successfully! Spreadsheet created: ${spreadsheetId}`
      : 'Google authentication successful, but spreadsheet creation failed. You can retry from the dashboard.';
    
    return new Response(
      `<html><body><script>
        console.log('OAuth completion result:', { spreadsheetCreated: ${spreadsheetCreated}, spreadsheetId: '${spreadsheetId}' });
        window.opener.postMessage({ 
          type: 'oauth_success', 
          message: '${message}',
          spreadsheetCreated: ${spreadsheetCreated},
          spreadsheetId: '${spreadsheetId}'
        }, '*');
        window.close();
      </script></body></html>`,
      { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
    );

  } catch (error) {
    console.error('OAuth callback error:', error);
    return new Response(
      `<html><body><script>
        window.opener.postMessage({ 
          type: 'oauth_error', 
          error: '${error.message}' 
        }, '*');
        window.close();
      </script></body></html>`,
      { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
    );
  }
}

async function autoCreateAndPopulateSheet(accessToken: string, supabase: any, userId: string) {
  // Create the spreadsheet with comprehensive structure
  const sheetData = {
    properties: {
      title: `Fractionl AI: Copilot`,
    },
    sheets: [
      { properties: { title: 'Summary Dashboard', index: 0 } },
      { properties: { title: 'Monthly Goals', index: 1 } },
      { properties: { title: 'Daily Progress', index: 2 } },
      { properties: { title: 'Opportunities Pipeline', index: 3 } },
      { properties: { title: 'Revenue Tracking', index: 4 } }
    ]
  };

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sheetData),
  });

  const sheet = await response.json();
  
  if (sheet.error) {
    throw new Error(`Sheet creation failed: ${sheet.error.message}`);
  }

  // Update integration with sheet ID
  await supabase
    .from('sheets_integrations')
    .update({
      google_sheet_id: sheet.spreadsheetId,
      sheet_name: sheet.properties.title,
      last_sync_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  // Populate all data sheets
  await populateAllSheets(accessToken, sheet.spreadsheetId, supabase, userId);
  
  return { spreadsheetId: sheet.spreadsheetId };
}

async function populateAllSheets(accessToken: string, spreadsheetId: string, supabase: any, userId: string) {
  // Fetch all user data
  const [monthlyGoals, dailyProgress, opportunities, revenueEntries] = await Promise.all([
    supabase.from('monthly_goals').select('*').eq('user_id', userId),
    supabase.from('daily_progress').select('*').eq('user_id', userId),
    supabase.from('opportunities').select('*').eq('user_id', userId),
    supabase.from('revenue_entries').select('*').eq('user_id', userId)
  ]);

  // Prepare batch update requests - ALWAYS create structured sheets with headers and default values
  const requests = [];
  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const todayFormatted = currentDate.toISOString().split('T')[0];

  // Monthly Goals Sheet - ALWAYS create with headers + template row
  const goalsData = monthlyGoals.data && monthlyGoals.data.length > 0 
    ? monthlyGoals.data 
    : [{ month: currentMonth, revenue_forecast: 0, cost_budget: 0, workshops_target: 0, advisory_target: 0, lectures_target: 0, pr_target: 0, created_at: new Date().toISOString() }];
  
  const goalsValues = [
    ['Month', 'Revenue Forecast', 'Cost Budget', 'Workshops Target', 'Advisory Target', 'Lectures Target', 'PR Target', 'Created Date'],
    ...goalsData.map((g: any) => [
      g.month, g.revenue_forecast || 0, g.cost_budget || 0,
      g.workshops_target || 0, g.advisory_target || 0, g.lectures_target || 0, g.pr_target || 0,
      new Date(g.created_at).toLocaleDateString()
    ])
  ];
  requests.push({
    range: 'Monthly Goals!A1',
    values: goalsValues
  });

  // Daily Progress Sheet - ALWAYS create with headers + template row
  const progressData = dailyProgress.data && dailyProgress.data.length > 0 
    ? dailyProgress.data 
    : [{ date: todayFormatted, month: currentMonth, workshops_progress: 0, advisory_progress: 0, lectures_progress: 0, pr_progress: 0, notes: 'Template entry - update with your progress' }];
  
  const progressValues = [
    ['Date', 'Month', 'Workshops Progress', 'Advisory Progress', 'Lectures Progress', 'PR Progress', 'Notes'],
    ...progressData.map((p: any) => [
      p.date, p.month, p.workshops_progress || 0, p.advisory_progress || 0,
      p.lectures_progress || 0, p.pr_progress || 0, p.notes || ''
    ])
  ];
  requests.push({
    range: 'Daily Progress!A1',
    values: progressValues
  });

  // Opportunities Pipeline Sheet - ALWAYS create with headers + template row
  const opportunitiesData = opportunities.data && opportunities.data.length > 0 
    ? opportunities.data 
    : [{ title: 'Sample Opportunity', type: 'workshop', company: 'Company Name', contact_person: 'Contact Name', stage: 'lead', probability: 25, estimated_value: 5000, estimated_close_date: '', month: currentMonth, notes: 'Template entry - replace with your opportunities' }];
  
  const opportunitiesValues = [
    ['Title', 'Type', 'Company', 'Contact Person', 'Stage', 'Probability %', 'Estimated Value', 'Close Date', 'Month', 'Notes'],
    ...opportunitiesData.map((o: any) => [
      o.title, o.type, o.company || '', o.contact_person || '', o.stage,
      o.probability || 0, o.estimated_value || 0, o.estimated_close_date || '',
      o.month, o.notes || ''
    ])
  ];
  requests.push({
    range: 'Opportunities Pipeline!A1',
    values: opportunitiesValues
  });

  // Revenue Tracking Sheet - ALWAYS create with headers + template row
  const revenueData = revenueEntries.data && revenueEntries.data.length > 0 
    ? revenueEntries.data 
    : [{ date: todayFormatted, month: currentMonth, amount: 0, source: 'workshop', description: 'Template entry - replace with your revenue entries' }];
  
  const revenueValues = [
    ['Date', 'Month', 'Amount', 'Source', 'Description'],
    ...revenueData.map((r: any) => [
      r.date, r.month, r.amount || 0, r.source, r.description || ''
    ])
  ];
  requests.push({
    range: 'Revenue Tracking!A1',
    values: revenueValues
  });

  // Summary Dashboard (create basic structure)
  const dashboardValues = [
    ['Business Tracker Summary Dashboard', '', '', '', ''],
    ['', '', '', '', ''],
    ['Key Metrics', 'Current Month', 'All Time', '', ''],
    ['Total Revenue', '=SUMIF(\'Revenue Tracking\'!B:B,TEXT(TODAY(),"YYYY-MM"),\'Revenue Tracking\'!C:C)', '=SUM(\'Revenue Tracking\'!C:C)', '', ''],
    ['Total Opportunities', '=COUNTIF(\'Opportunities Pipeline\'!I:I,TEXT(TODAY(),"YYYY-MM"))', '=COUNTA(\'Opportunities Pipeline\'!A2:A)', '', ''],
    ['Pipeline Value', '=SUMIF(\'Opportunities Pipeline\'!I:I,TEXT(TODAY(),"YYYY-MM"),\'Opportunities Pipeline\'!G:G)', '=SUM(\'Opportunities Pipeline\'!G:G)', '', ''],
    ['', '', '', '', ''],
    ['Recent Activity', '', '', '', ''],
    ['Last 10 Daily Progress Entries:', '', '', '', ''],
  ];
  requests.push({
    range: 'Summary Dashboard!A1',
    values: dashboardValues
  });

  // Execute all requests in batch
  if (requests.length > 0) {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: requests
        }),
      }
    );
  }

  // Apply formatting to make it look professional
  await formatSpreadsheet(accessToken, spreadsheetId);
}

async function formatSpreadsheet(accessToken: string, spreadsheetId: string) {
  const formatRequests = [
    // Format headers in all sheets
    {
      repeatCell: {
        range: {
          sheetId: 0, // Summary Dashboard
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 5
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.2, green: 0.6, blue: 0.2 },
            textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)'
      }
    },
    // Format other sheet headers similarly...
  ];

  if (formatRequests.length > 0) {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests: formatRequests }),
      }
    );
  }
}

async function handleRefreshAllData(body: any, supabase: any, userId: string) {
  // Get the user's stored access token using secure function
  const { data: tokens, error: tokenError } = await supabase
    .rpc('get_user_google_tokens', { target_user_id: userId });
  
  if (tokenError || !tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ error: 'No valid tokens found' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  const tokenData = tokens[0];
  
  // Get sheet ID separately
  const { data: integration, error: integrationError } = await supabase
    .from('sheets_integrations')
    .select('google_sheet_id')
    .eq('user_id', userId)
    .single();

  if (integrationError || !integration || !integration.google_sheet_id) {
    return new Response(JSON.stringify({ error: 'No Google Sheets integration found or incomplete setup' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Log token access for audit trail
  await supabase.rpc('log_token_access', {
    target_user_id: userId,
    access_type: 'refresh_operation',
    success: true,
    additional_info: { operation: 'refresh_all_data' }
  });

  // Decrypt the access token for API calls
  const decryptedAccessToken = await decryptToken(tokenData.access_token);

  // Clear existing data and repopulate
  await populateAllSheets(decryptedAccessToken, integration.google_sheet_id, supabase, userId);

  // Update last sync time
  await supabase
    .from('sheets_integrations')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('user_id', userId);

  return new Response(
    JSON.stringify({ success: true, message: 'All data refreshed successfully' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleExportCrm(body: any, supabase: any, userId: string) {
  const { email } = body;

  // Fetch all CRM data in parallel
  const [
    contactsRes, clientsRes, activitiesRes,
    revenueRes, opportunitiesRes, goalsRes
  ] = await Promise.all([
    supabase.from('talent_contacts').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
    supabase.from('clients').select('*').eq('user_id', userId).order('name'),
    supabase.from('activity_logs').select('*, clients(name)').eq('user_id', userId).order('logged_at', { ascending: false }).limit(500),
    supabase.from('revenue_entries').select('*').eq('user_id', userId).order('date', { ascending: false }),
    supabase.from('opportunities').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('monthly_goals').select('*').eq('user_id', userId).order('month', { ascending: false }),
  ]);

  const contacts = contactsRes.data || [];
  const clients = clientsRes.data || [];
  const activities = activitiesRes.data || [];
  const revenue = revenueRes.data || [];
  const opportunities = opportunitiesRes.data || [];
  const goals = goalsRes.data || [];

  // Check if user has Google Sheets connected
  let accessToken: string | null = null;
  let spreadsheetId: string | null = null;

  try {
    const { data: tokens } = await supabase
      .rpc('get_user_google_tokens', { target_user_id: userId });

    const { data: integration } = await supabase
      .from('sheets_integrations')
      .select('google_sheet_id')
      .eq('user_id', userId)
      .single();

    if (tokens?.length > 0 && integration?.google_sheet_id) {
      accessToken = await decryptToken(tokens[0].access_token);
      spreadsheetId = integration.google_sheet_id;
    }
  } catch {
    // No integration - we'll create a new spreadsheet or just email summary
  }

  // If connected, create/update spreadsheet with CRM data
  if (accessToken) {
    // Add new CRM sheets to existing spreadsheet if needed
    if (spreadsheetId) {
      // Try to add new sheets (will fail silently if they already exist)
      const addSheetsBody = {
        requests: [
          { addSheet: { properties: { title: 'Contacts CRM' } } },
          { addSheet: { properties: { title: 'Clients' } } },
          { addSheet: { properties: { title: 'Activity Log' } } },
        ]
      };
      try {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(addSheetsBody),
          }
        );
      } catch {
        // Sheets may already exist - continue
      }
    }

    // Build CRM data
    const crmRequests = [];

    // Contacts CRM sheet
    const contactsValues = [
      ['Name', 'Email', 'Phone', 'Company', 'Title', 'City', 'LinkedIn', 'Availability', 'Trust Rating', 'Rate Range', 'Specialty', 'Last Updated'],
      ...contacts.map((c: any) => [
        c.name || '',
        c.email || '',
        c.phone || '',
        c.company || '',
        c.title || '',
        c.city || '',
        c.linkedin_url || '',
        c.availability_status || '',
        c.trust_rating || '',
        c.rate_min && c.rate_max ? `$${c.rate_min}-$${c.rate_max} ${c.rate_type || ''}` : c.rate_min ? `$${c.rate_min}+` : '',
        c.specialty_summary || '',
        c.updated_at ? new Date(c.updated_at).toLocaleDateString() : '',
      ])
    ];
    crmRequests.push({ range: 'Contacts CRM!A1', values: contactsValues });

    // Clients sheet
    const clientsValues = [
      ['Name', 'Status', 'Engagement Type', 'Hours/Week', 'Monthly Revenue Target', 'Last Activity', 'Notes'],
      ...clients.map((c: any) => [
        c.name || '',
        c.status || '',
        c.engagement_type || '',
        c.hours_weekly || '',
        c.monthly_revenue_target || '',
        c.last_activity_date ? new Date(c.last_activity_date).toLocaleDateString() : '',
        c.notes || '',
      ])
    ];
    crmRequests.push({ range: 'Clients!A1', values: clientsValues });

    // Activity Log sheet
    const activityValues = [
      ['Date', 'Type', 'Client', 'Duration (min)', 'Revenue', 'Summary', 'Notes', 'Via Voice'],
      ...activities.map((a: any) => [
        a.logged_at ? new Date(a.logged_at).toLocaleDateString() : '',
        a.activity_type || '',
        a.clients?.name || '',
        a.duration_minutes || '',
        a.revenue || '',
        a.summary || '',
        a.notes || '',
        a.created_via_voice ? 'Yes' : 'No',
      ])
    ];
    crmRequests.push({ range: 'Activity Log!A1', values: activityValues });

    // Also refresh existing sheets
    await populateAllSheets(accessToken, spreadsheetId!, supabase, userId);

    // Write CRM sheets
    if (crmRequests.length > 0) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data: crmRequests }),
        }
      );
    }

    // Format all sheets
    await formatSpreadsheet(accessToken, spreadsheetId!);

    // Update sync timestamp
    await supabase
      .from('sheets_integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', userId);

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

    return new Response(
      JSON.stringify({
        success: true,
        sheet_url: sheetUrl,
        stats: {
          contacts: contacts.length,
          clients: clients.length,
          activities: activities.length,
          revenue_entries: revenue.length,
          opportunities: opportunities.length,
        },
        message: 'CRM exported successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // No Google Sheets connected - return info so frontend can guide user
  return new Response(
    JSON.stringify({
      success: false,
      error: 'no_integration',
      message: 'Google Sheets not connected. Connect in Settings to enable export.',
      stats: {
        contacts: contacts.length,
        clients: clients.length,
        activities: activities.length,
        revenue_entries: revenue.length,
        opportunities: opportunities.length,
      },
    }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleImportData(body: any, supabase: any, userId: string) {
  // Implementation for importing data from Google Sheets
  return new Response(
    JSON.stringify({ success: true, message: 'Import functionality coming soon' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/**
 * Create a Google Calendar event from an opportunity or reminder.
 * Body: { title, description?, start_date, end_date?, location?, attendees?: string[] }
 */
async function handleCreateCalendarEvent(body: any, supabase: any, userId: string) {
  const { title, description, start_date, end_date, location, attendees } = body;

  if (!title || !start_date) {
    return new Response(
      JSON.stringify({ error: 'Missing title or start_date' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get user's Google tokens
  const { data: tokens } = await supabase.rpc('get_user_google_tokens', { p_user_id: userId });

  if (!tokens?.access_token) {
    return new Response(
      JSON.stringify({ error: 'no_integration', message: 'Google not connected. Connect via Settings > Google Sheets to enable calendar sync.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const encryptionKey = Deno.env.get('TOKEN_ENCRYPTION_KEY');
  if (!encryptionKey) {
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const accessToken = await decryptToken(tokens.access_token, encryptionKey);

  // Build event object
  const startDateTime = new Date(start_date);
  const endDateTime = end_date ? new Date(end_date) : new Date(startDateTime.getTime() + 3600000); // default 1 hour

  const event: Record<string, unknown> = {
    summary: title,
    description: description || '',
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: 'UTC',
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: 'UTC',
    },
  };

  if (location) event.location = location;
  if (attendees?.length) {
    event.attendees = attendees.map((email: string) => ({ email }));
  }

  const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!calRes.ok) {
    const errorData = await calRes.json().catch(() => ({}));
    console.error('Google Calendar error:', errorData);
    return new Response(
      JSON.stringify({ error: 'Failed to create calendar event', details: errorData }),
      { status: calRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const created = await calRes.json();
  return new Response(
    JSON.stringify({ success: true, event_id: created.id, html_link: created.htmlLink }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
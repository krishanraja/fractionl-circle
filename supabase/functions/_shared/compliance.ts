/**
 * Shared compliance utilities for Supabase Edge Functions
 * SOC2, HIPAA, GDPR, CCPA, ISO 27001
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

// ── Restricted CORS (SOC2 CC6.1, ISO A.13.1) ───────────────────────────

const ALLOWED_ORIGINS = [
  'https://circle.fractionl.ai',
  'https://fractionl-circle.lovable.app',
  'http://localhost:5173',     // local dev
  'http://localhost:8080',     // local dev alt
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

// ── Auth Middleware (SOC2 CC6.1, HIPAA §164.312(d)) ─────────────────────

export interface AuthResult {
  userId: string;
  supabase: ReturnType<typeof createClient>;
}

export async function requireAuth(req: Request): Promise<AuthResult> {
  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    throw new AuthError('Authorization required', 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new AuthError('Invalid or expired token', 401);
  }

  return { userId: user.id, supabase };
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

// ── Input Validation (SOC2 CC6.1, OWASP) ───────────────────────────────

export function validateInput<T>(
  body: unknown,
  validators: Record<string, (val: unknown) => boolean>,
  required: string[] = []
): T {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Invalid request body');
  }

  const obj = body as Record<string, unknown>;

  for (const field of required) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      throw new ValidationError(`Missing required field: ${field}`);
    }
  }

  for (const [field, validator] of Object.entries(validators)) {
    if (obj[field] !== undefined && !validator(obj[field])) {
      throw new ValidationError(`Invalid value for field: ${field}`);
    }
  }

  return obj as T;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Max payload sizes (prevent DoS)
export function enforceMaxLength(value: string, maxLength: number, fieldName: string): void {
  if (value.length > maxLength) {
    throw new ValidationError(`${fieldName} exceeds maximum length of ${maxLength}`);
  }
}

// ── Safe Error Responses (SOC2 CC7.2, OWASP) ───────────────────────────

export function safeErrorResponse(
  error: unknown,
  corsHeaders: Record<string, string>
): Response {
  // Log full details server-side
  console.error('Edge function error:', error);

  if (error instanceof AuthError) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: error.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (error instanceof ValidationError) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Generic error — never expose internals
  return new Response(
    JSON.stringify({ error: 'An internal error occurred' }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ── Audit Logging Helper ────────────────────────────────────────────────

export async function logAuditEvent(
  supabaseServiceClient: ReturnType<typeof createClient>,
  params: {
    userId: string;
    action: string;
    resource: string;
    details?: Record<string, unknown>;
    framework?: string;
    classification?: string;
    outcome?: string;
  }
): Promise<void> {
  try {
    await supabaseServiceClient.rpc('log_compliance_event', {
      p_user_id: params.userId,
      p_action: params.action,
      p_resource: params.resource,
      p_details: params.details || {},
      p_framework: params.framework || null,
      p_classification: params.classification || 'internal',
      p_outcome: params.outcome || 'success',
    });
  } catch (err) {
    // Never let audit logging failure break the request
    console.error('Audit log failed:', err);
  }
}

// ── Rate Limiting (basic, per-function) ─────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number = 30,
  windowMs: number = 60_000
): void {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    throw new RateLimitError();
  }
}

export class RateLimitError extends Error {
  constructor() {
    super('Rate limit exceeded');
    this.name = 'RateLimitError';
  }
}

// Override safeErrorResponse to handle rate limits
export function handleRequest(
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const corsHeaders = getCorsHeaders(req);

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      return await handler(req);
    } catch (error) {
      if (error instanceof RateLimitError) {
        return new Response(
          JSON.stringify({ error: 'Too many requests' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return safeErrorResponse(error, corsHeaders);
    }
  };
}

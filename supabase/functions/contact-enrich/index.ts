import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { parsePhoneNumberFromString } from 'https://esm.sh/libphonenumber-js@1.11.18';
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit, enforceMaxLength } from '../_shared/compliance.ts';

interface EnrichmentResult {
  name?: string;
  company?: string;
  title?: string;
  linkedin_url?: string;
  photo_url?: string;
  city?: string;
  specialty_summary?: string;
  phone?: string;
  email?: string;
  carrier?: string;
  line_type?: string;
}

interface LinkedInSearchResult {
  name: string;
  headline: string;
  url: string;
  photo_url?: string;
  company?: string;
  title?: string;
  city?: string;
}

/**
 * Contact enrichment edge function.
 *
 * Modes:
 *   1. { email } - enrich from email via Clearbit or Apollo
 *   2. { phone } - enrich from phone via Twilio Lookup
 *   3. { name, linkedin_search: true } - search LinkedIn profiles by name via Apollo
 *
 * Required secrets (set whichever you have):
 *   - APOLLO_API_KEY - email enrichment + LinkedIn search
 *   - CLEARBIT_API_KEY - email enrichment (fallback)
 *   - TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN - phone lookup
 */
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication — prevents abuse of external API credits
    const { userId } = await requireAuth(req);

    // Rate limit: 30 enrichments per minute per user
    checkRateLimit(`enrich:${userId}`, 30, 60_000);

    const body = await req.json();

    // Mode 1: LinkedIn search by name
    if (body.linkedin_search && body.name) {
      enforceMaxLength(body.name, 200, 'name');
      const results = await searchLinkedInByName(body.name.trim());
      return jsonResponse({ results }, corsHeaders);
    }

    // Mode 2: Phone enrichment via Twilio
    if (body.phone) {
      enforceMaxLength(body.phone, 20, 'phone');
      const result = await enrichFromPhone(body.phone.trim());
      return jsonResponse({ enriched: result, provider: result ? 'twilio' : null }, corsHeaders);
    }

    // Mode 3: Email enrichment
    if (body.email && body.email.includes('@')) {
      enforceMaxLength(body.email, 254, 'email');
      const trimmedEmail = body.email.trim().toLowerCase();

      // Try Clearbit first
      const clearbitKey = Deno.env.get('CLEARBIT_API_KEY');
      if (clearbitKey) {
        const result = await tryClearbit(trimmedEmail, clearbitKey);
        if (result) {
          return jsonResponse({ enriched: result, provider: 'clearbit' }, corsHeaders);
        }
      }

      // Try Apollo
      const apolloKey = Deno.env.get('APOLLO_API_KEY');
      if (apolloKey) {
        const result = await tryApollo(trimmedEmail, apolloKey);
        if (result) {
          return jsonResponse({ enriched: result, provider: 'apollo' }, corsHeaders);
        }
      }
    }

    return jsonResponse({ enriched: null, provider: null }, corsHeaders);
  } catch (error) {
    return safeErrorResponse(error, corsHeaders);
  }
});

function jsonResponse(data: Record<string, unknown>, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ── LinkedIn search by name (via Apollo) ──────────────────────────────

async function searchLinkedInByName(name: string): Promise<LinkedInSearchResult[]> {
  const apolloKey = Deno.env.get('APOLLO_API_KEY');
  if (!apolloKey) return [];

  try {
    // Split name into first/last for better matching
    const parts = name.split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';

    const res = await fetch('https://api.apollo.io/v1/mixed_people/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apolloKey,
      },
      body: JSON.stringify({
        q_keywords: name,
        person_titles: [],
        person_locations: [],
        per_page: 5,
        ...(firstName && lastName ? {
          person_name_first: firstName,
          person_name_last: lastName,
        } : {}),
      }),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const people = data.people || [];

    return people
      .filter((p: any) => p.linkedin_url)
      .map((p: any) => ({
        name: [p.first_name, p.last_name].filter(Boolean).join(' ') || name,
        headline: [p.title, p.organization?.name].filter(Boolean).join(' at ') || '',
        url: p.linkedin_url,
        photo_url: p.photo_url || undefined,
        company: p.organization?.name || undefined,
        title: p.title || undefined,
        city: p.city || undefined,
      }))
      .slice(0, 5);
  } catch {
    return [];
  }
}

// ── Phone enrichment (via Twilio Lookup v2) ──────────────────────────

async function enrichFromPhone(phone: string): Promise<EnrichmentResult | null> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  if (!accountSid || !authToken) return null;

  try {
    // Clean phone number - ensure E.164 format (international-aware)
    let cleaned: string;
    const parsed = parsePhoneNumberFromString(phone, 'US');
    if (parsed?.isValid()) {
      cleaned = parsed.number as string;
    } else {
      // Fallback: manual normalization
      cleaned = phone.replace(/[^\d+]/g, '');
      if (!cleaned.startsWith('+')) {
        if (cleaned.length === 10) cleaned = '+1' + cleaned;
        else if (cleaned.length === 11 && cleaned.startsWith('1')) cleaned = '+' + cleaned;
        else cleaned = '+' + cleaned;
      }
    }

    // Twilio Lookup v2 with caller name and line type
    const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(cleaned)}?Fields=caller_name,line_type_intelligence`;
    const res = await fetch(url, {
      headers: {
        Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const result: EnrichmentResult = {};

    // Caller name
    if (data.caller_name?.caller_name) {
      result.name = data.caller_name.caller_name;
    }

    // Line type (mobile, landline, voip, etc.)
    if (data.line_type_intelligence?.type) {
      result.line_type = data.line_type_intelligence.type;
    }

    // Carrier info
    if (data.line_type_intelligence?.carrier_name) {
      result.carrier = data.line_type_intelligence.carrier_name;
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

// ── Email enrichment providers ────────────────────────────────────────

async function tryClearbit(email: string, apiKey: string): Promise<EnrichmentResult | null> {
  try {
    const res = await fetch(
      `https://person.clearbit.com/v2/people/find?email=${encodeURIComponent(email)}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    );

    if (!res.ok) return null;

    const data = await res.json();

    const result: EnrichmentResult = {};
    if (data.name?.fullName) result.name = data.name.fullName;
    if (data.employment?.name) result.company = data.employment.name;
    if (data.employment?.title) result.title = data.employment.title;
    if (data.linkedin?.handle) result.linkedin_url = `https://www.linkedin.com/in/${data.linkedin.handle}`;
    if (data.avatar) result.photo_url = data.avatar;
    if (data.geo?.city && data.geo?.state) result.city = `${data.geo.city}, ${data.geo.state}`;
    else if (data.geo?.city) result.city = data.geo.city;

    if (result.title && result.company) {
      result.specialty_summary = `${result.title} at ${result.company}${result.city ? `, ${result.city}` : ''}`;
    } else if (result.title) {
      result.specialty_summary = result.city ? `${result.title}, ${result.city}` : result.title;
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

async function tryApollo(email: string, apiKey: string): Promise<EnrichmentResult | null> {
  try {
    const res = await fetch('https://api.apollo.io/v1/people/match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const person = data.person;
    if (!person) return null;

    const result: EnrichmentResult = {};
    if (person.name) result.name = person.name;
    if (person.organization?.name) result.company = person.organization.name;
    if (person.title) result.title = person.title;
    if (person.linkedin_url) result.linkedin_url = person.linkedin_url;
    if (person.photo_url) result.photo_url = person.photo_url;
    if (person.city) result.city = person.city;

    if (result.title && result.company) {
      result.specialty_summary = `${result.title} at ${result.company}${result.city ? `, ${result.city}` : ''}`;
    } else if (result.title) {
      result.specialty_summary = result.city ? `${result.title}, ${result.city}` : result.title;
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

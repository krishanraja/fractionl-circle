import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichmentResult {
  name?: string;
  company?: string;
  title?: string;
  linkedin_url?: string;
  photo_url?: string;
  city?: string;
  specialty_summary?: string;
}

/**
 * Contact enrichment edge function.
 *
 * Accepts an email address and returns enriched contact data.
 * Supports multiple providers with fallback:
 *   1. Clearbit (CLEARBIT_API_KEY) — free tier available
 *   2. Apollo.io (APOLLO_API_KEY) — generous free tier
 *   3. Google search fallback — no key needed
 *
 * Set whichever API key you have in Supabase secrets.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ enriched: null, provider: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Try Clearbit first
    const clearbitKey = Deno.env.get('CLEARBIT_API_KEY');
    if (clearbitKey) {
      const result = await tryClearbit(trimmedEmail, clearbitKey);
      if (result) {
        return jsonResponse({ enriched: result, provider: 'clearbit' });
      }
    }

    // Try Apollo
    const apolloKey = Deno.env.get('APOLLO_API_KEY');
    if (apolloKey) {
      const result = await tryApollo(trimmedEmail, apolloKey);
      if (result) {
        return jsonResponse({ enriched: result, provider: 'apollo' });
      }
    }

    // No enrichment available — return null so the client knows
    return jsonResponse({ enriched: null, provider: null });
  } catch (error) {
    console.error('Contact enrichment error:', error);
    return new Response(
      JSON.stringify({ error: 'Enrichment failed', enriched: null }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function jsonResponse(data: Record<string, unknown>) {
  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

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

    // Build specialty summary from title + company
    if (result.title && result.company) {
      result.specialty_summary = `${result.title} at ${result.company}`;
    } else if (result.title) {
      result.specialty_summary = result.title;
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
      result.specialty_summary = `${result.title} at ${result.company}`;
    } else if (result.title) {
      result.specialty_summary = result.title;
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

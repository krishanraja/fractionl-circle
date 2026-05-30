import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

// 5e: Public Sunday Letter content feed.
// Exposes opt-in (is_publishable = true) letters as a JSON Feed 1.1 document so
// the fleet's content/PR agents can pull them. Hard-sanitized: returns ONLY the
// public_slug, the de-identified preview_text, and a timestamp. NEVER the
// private narrative (text_body), audio_url, user_id, stats, or any names.
//
// Reads via the service role so owner RLS does not apply; the SELECT itself is
// the trust boundary (it only ever touches the three public columns + the
// is_publishable filter). Read-only: this function never writes.

// Allow-all CORS so any agent / origin can fetch the public feed.
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Generic, non-private title for every item. Deliberately NOT derived from any
// letter content so it can never leak a name, company, or figure.
const GENERIC_TITLE = 'This week in fractional revenue';

const HOME_PAGE_URL = 'https://circle.fractionl.ai';
const FEED_URL = 'https://circle.fractionl.ai/feed/sunday-letter.json';
const MAX_ITEMS = 100;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from('sunday_letters')
      .select('public_slug, preview_text, created_at')
      .eq('is_publishable', true)
      .not('public_slug', 'is', null)
      .order('created_at', { ascending: false })
      .limit(MAX_ITEMS);
    if (error) throw error;

    const rows = data ?? [];
    const items = rows
      // Defensive: skip anything missing a slug or preview even if the filter let it through.
      .filter((r: { public_slug: string | null; preview_text: string | null }) => r.public_slug && r.preview_text)
      .map((r: { public_slug: string; preview_text: string; created_at: string }) => ({
        id: r.public_slug,
        url: `https://circle.fractionl.ai/letters/${r.public_slug}`,
        title: GENERIC_TITLE,
        content_text: r.preview_text,
        date_published: new Date(r.created_at).toISOString(),
      }));

    const feed = {
      version: 'https://jsonfeed.org/version/1.1',
      title: 'Circle Sunday Letters',
      home_page_url: HOME_PAGE_URL,
      feed_url: FEED_URL,
      items,
    };

    return new Response(JSON.stringify(feed), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=900',
      },
    });
  } catch (error) {
    console.error('sunday_letter_feed_error', error instanceof Error ? error.message : error);
    return new Response(JSON.stringify({ error: 'An internal error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

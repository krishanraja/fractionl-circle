import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LinkedInResult {
  name: string;
  headline: string;
  url: string;
  image?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchQuery = `${query.trim()} site:linkedin.com/in/`;

    // Use Google Custom Search API for LinkedIn profile discovery
    const googleApiKey = Deno.env.get('GOOGLE_SEARCH_API_KEY');
    const googleCseId = Deno.env.get('GOOGLE_CSE_ID');

    if (!googleApiKey || !googleCseId) {
      // Fallback: construct a likely LinkedIn URL from the name
      const slug = query.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      return new Response(
        JSON.stringify({
          results: [{
            name: query.trim(),
            headline: 'Suggested profile',
            url: `https://www.linkedin.com/in/${slug}`,
          }],
          fallback: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
    searchUrl.searchParams.set('key', googleApiKey);
    searchUrl.searchParams.set('cx', googleCseId);
    searchUrl.searchParams.set('q', searchQuery);
    searchUrl.searchParams.set('num', '5');

    const searchResponse = await fetch(searchUrl.toString());
    const searchData = await searchResponse.json();

    const results: LinkedInResult[] = (searchData.items || [])
      .filter((item: any) => item.link?.includes('linkedin.com/in/'))
      .map((item: any) => {
        // Extract name from title (usually "Name - Title | LinkedIn")
        const titleParts = item.title?.split(' - ') || [];
        const name = titleParts[0]?.replace(' | LinkedIn', '').trim() || query;
        const headline = titleParts.slice(1).join(' - ').replace(' | LinkedIn', '').trim() || '';

        return {
          name,
          headline,
          url: item.link,
          image: item.pagemap?.metatags?.[0]?.['og:image'] || undefined,
        };
      })
      .slice(0, 5);

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('LinkedIn search error:', error);
    return new Response(
      JSON.stringify({ error: 'Search failed', results: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

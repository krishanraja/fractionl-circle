import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { image } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: 'No image provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an AI that extracts contact information from images.
The image may be a business card, a screenshot of a social media profile (LinkedIn, Instagram, Twitter), an email signature, or any image containing contact details.

Extract the following fields. Only include fields that are clearly visible or strongly implied:

- name: Full name of the person (required)
- email: Email address
- phone: Phone number (include country code if visible)
- company: Company or organization name
- title: Job title or role
- city: City or location
- specialty_summary: Brief description of what they do
- linkedin_url: LinkedIn URL or handle
- instagram_handle: Instagram handle
- website: Website URL

Return a JSON object with these fields. Use null for any field not found.
Be thorough - check all text in the image including small print, URLs, and social handles.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${image}`,
                  detail: 'high',
                },
              },
              {
                type: 'text',
                text: 'Extract all contact information from this image. Return as JSON.',
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `OpenAI API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    const parsed = JSON.parse(result.choices[0].message.content);

    return new Response(
      JSON.stringify({ parsed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Parse contact image error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Image parsing failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit, enforceMaxLength } from '../_shared/compliance.ts';

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication
    const { userId } = await requireAuth(req);
    checkRateLimit(`parse-contact-image:${userId}`, 10, 60_000);

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Service unavailable' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { image } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: 'No image provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate image size (max 10MB base64)
    enforceMaxLength(image, 10 * 1024 * 1024, 'image');

    const systemPrompt = `You are an AI that extracts contact information from images.
The image may be a business card, a screenshot of a social media profile or post (LinkedIn, Instagram, Twitter/X), an email signature, or any image containing contact details.

Extract the following fields. Only include fields that are clearly visible or strongly implied:

- name: Full name of the person (required). For social media posts, extract the name of the post author from the header area.
- email: Email address
- phone: Phone number (include country code if visible)
- company: Company or organization name
- title: Job title, role, or headline. For LinkedIn, use the text directly below the person's name.
- city: City or location
- specialty_summary: Brief description of what they do, inferred from their title, headline, bio, or post content
- linkedin_url: LinkedIn profile URL if visible (check browser address bar, profile links, or construct from visible profile info)
- instagram_handle: Instagram handle (without @)
- website: Website URL
- platform: Identify the source platform. Must be one of: "linkedin", "instagram", "twitter", "business_card", "email_signature", or "unknown". Look for platform-specific UI elements (LinkedIn's blue navbar, Instagram's layout, Twitter/X's interface, etc.)

Return a JSON object with these fields. Use null for any field not found.
Be thorough - check all text in the image including small print, URLs, social handles, and platform UI elements. For social media screenshots, focus on extracting the profile owner's or post author's information, not commenters or other users visible in the image.`;

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
        max_tokens: 600,
        store: false,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status);
      return new Response(
        JSON.stringify({ error: 'Image processing failed' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    const parsed = JSON.parse(result.choices[0].message.content);

    return new Response(
      JSON.stringify({ parsed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

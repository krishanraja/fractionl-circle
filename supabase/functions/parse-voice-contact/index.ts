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
    checkRateLimit(`parse-voice-contact:${userId}`, 20, 60_000);

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Service unavailable' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { transcript } = await req.json();

    if (!transcript) {
      return new Response(
        JSON.stringify({ error: 'No transcript provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    enforceMaxLength(transcript, 10_000, 'transcript');

    const systemPrompt = `You are an AI that extracts contact information from spoken text.
The user has dictated information about a person they want to save as a contact.

Extract the following fields from the transcript. Only include fields that are clearly mentioned or strongly implied:

- name: Full name of the person (required - infer from context if possible)
- email: Email address if mentioned
- phone: Phone number if mentioned (include country code if given)
- company: Company or organization name
- title: Job title or role
- city: City or location
- specialty_summary: Brief description of what they do (their expertise, skills, or profession)
- linkedin_url: LinkedIn URL if mentioned
- instagram_handle: Instagram handle if mentioned

Return a JSON object with these fields. Use null for any field not mentioned.
Be smart about context: "designer at Nike" means title="Designer" and company="Nike".
If they say "based in Portland" that's city="Portland".
If an email domain gives company context (e.g. sarah@nike.com), use it.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        store: false,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status);
      return new Response(
        JSON.stringify({ error: 'AI processing failed' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    const parsed = JSON.parse(result.choices[0].message.content);

    return new Response(
      JSON.stringify({ parsed, raw_transcript: transcript }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

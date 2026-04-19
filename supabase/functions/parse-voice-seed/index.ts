import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit, enforceMaxLength } from '../_shared/compliance.ts';

// Extracts named people from a voice-seed transcript.
// Used by the Circle cold-start fallback: "Name 5 people you trust most."

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { userId } = await requireAuth(req);
    checkRateLimit(`parse-voice-seed:${userId}`, 10, 60_000);

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(JSON.stringify({ error: 'Service unavailable' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { transcript } = await req.json();
    if (!transcript) {
      return new Response(JSON.stringify({ error: 'No transcript provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    enforceMaxLength(transcript, 8_000, 'transcript');

    const systemPrompt = `You parse a voice note where a user names a handful of people they trust or work with. Extract each distinct person the user mentions.

Return JSON: { "people": [ { "name": string, "hint": string | null, "company": string | null, "title": string | null } ], "summary": string }

Rules:
- Only include clear, actual people the user names. No guesses, no generic roles.
- "hint" is a brief phrase capturing how the user described them (e.g. "ex-colleague from Acme", "old boss", "friend from grad school"). Keep it under 60 chars.
- Fill company / title only when clearly stated.
- Cap at 10 people. If the user names fewer, return fewer.
- "summary" is a single short sentence back to the user, e.g. "Got 5 people. I'll weave them into your Circle."`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        store: false,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status);
      return new Response(JSON.stringify({ error: 'AI processing failed' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response.json();
    const parsed = JSON.parse(result.choices[0].message.content);
    const people = Array.isArray(parsed.people) ? parsed.people : [];

    return new Response(JSON.stringify({
      people,
      summary: typeof parsed.summary === 'string' ? parsed.summary : null,
      raw_transcript: transcript,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

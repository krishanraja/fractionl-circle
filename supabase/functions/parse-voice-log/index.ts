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
    checkRateLimit(`parse-voice-log:${userId}`, 20, 60_000);

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Service unavailable' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { transcript, clients = [], context = {} } = await req.json();

    if (!transcript) {
      return new Response(
        JSON.stringify({ error: 'No transcript provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    enforceMaxLength(transcript, 10_000, 'transcript');

    // Build client matching context with more detail
    const clientContext = clients.length > 0
      ? clients.map((c: any) => `"${c.name}"${c.engagement_type ? ` (${c.engagement_type})` : ''}`).join(', ')
      : 'None specified yet';

    const systemPrompt = `You are an AI assistant that parses voice activity logs for a portfolio entrepreneur.
Extract structured information from the transcript about business activities.

KNOWN CLIENTS (match these EXACTLY if mentioned, including partial matches or abbreviations):
${clientContext}

IMPORTANT CLIENT MATCHING RULES:
1. If a company/person name in the transcript closely matches a known client, use the EXACT known client name
2. Match partial names: "TechStart" should match "TechStart Inc", "Acme" should match "Acme Corp"
3. Match common abbreviations: "TS" could match "TechStart Inc" if context suggests it
4. If no known client matches, set client_name to null (NOT to the mentioned name)
5. Only return a client_name if you're confident it matches a known client

Return a JSON object with:
- activity_type: one of "meeting", "call", "email", "work", "admin", "networking", "other"
- client_name: the EXACT name from the known clients list if matched (or null if no match/personal)
- client_mentioned: the raw client/company name mentioned in transcript (for reference, even if no match)
- duration_minutes: estimated duration if mentioned (or null). Parse "3 hours" as 180, "2.5 hours" as 150, etc.
- revenue: any revenue/payment mentioned as number without currency symbol (or null). Parse "$1,200" as 1200.
- summary: a brief 1-2 sentence summary of the activity
- notes: any additional details mentioned
- confidence: your confidence in the parsing (0-1)

Be conservative with client matching - only match if you're confident.`;

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
        temperature: 0.3,
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
    const parsedContent = JSON.parse(result.choices[0].message.content);

    return new Response(
      JSON.stringify({
        parsed: parsedContent,
        raw_transcript: transcript
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

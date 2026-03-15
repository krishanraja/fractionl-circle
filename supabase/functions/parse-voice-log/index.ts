import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { transcript, clients = [], context = {} } = await req.json();
    
    if (!transcript) {
      console.error('No transcript provided');
      return new Response(
        JSON.stringify({ error: 'No transcript provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsing transcript:', transcript.substring(0, 100) + '...');

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
    const parsedContent = JSON.parse(result.choices[0].message.content);
    
    console.log('Parsed activity:', JSON.stringify(parsedContent));

    return new Response(
      JSON.stringify({ 
        parsed: parsedContent,
        raw_transcript: transcript 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Parse error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Parsing failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

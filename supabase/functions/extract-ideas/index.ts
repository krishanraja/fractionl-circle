import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit, enforceMaxLength } from '../_shared/compliance.ts';
import { loadUserAiPreferences, withPersonality } from '../_shared/aiPersonality.ts';

// Extracts revenue-stream Ideas from a user's first-run voice transcript.
// Returns a list of Idea candidates that the client will persist into `ideas`.

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, supabase } = await requireAuth(req);
    checkRateLimit(`extract-ideas:${userId}`, 10, 60_000);

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Service unavailable' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { transcript, posture } = await req.json();
    if (!transcript) {
      return new Response(
        JSON.stringify({ error: 'No transcript provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    enforceMaxLength(transcript, 15_000, 'transcript');

    // Two flavours of prompt, both produce the same Idea shape.
    // Greenfield: user is newly-fractional, propose 3 offers they could sell.
    // Established: user already has revenue, surface what they told us + one adjacent.
    const greenfield = `You are helping a fractional executive or consultant turn a voice introduction into 3 concrete revenue stream ideas they could sell.

For each Idea, return:
- title: short name (max 6 words)
- one_liner: one-sentence description of the offer
- offer: a 1-2 sentence concrete deliverable
- price_band: rough monthly/project range as text (e.g. "$3-8K/mo", "$15-25K project")
- icp: one-line description of the ideal customer profile

Return JSON: { "ideas": [ ... ], "posture": "greenfield" | "established", "summary": "one sentence back to the user" }

Be specific and opinionated. Use what they said about their skills, wins, and appetite. Prefer narrower ICPs over broader ones.`;

    const established = `The user is an established fractional operator. Mirror back the revenue streams they already run as Ideas, then propose ONE adjacent Idea they haven't considered.

For each Idea, return:
- title, one_liner, offer, price_band, icp (same shape as above)
- is_adjacent: boolean (true only for the one new adjacent Idea)

Return JSON: { "ideas": [ ... ], "posture": "established", "summary": "one sentence back to the user" }`;

    // Also mine the transcript for specific PEOPLE the user named, so onboarding
    // can seed their Circle (fixes the day-one "no people to match against" gap).
    const peopleClause = `

ALSO extract any specific PEOPLE the user mentioned by name (colleagues, clients, prospects, partners, contacts). For each, return: name (required), hint (a short phrase on how they relate or why they matter, e.g. "VP Marketing at the fintech, drowning in attribution"), company (if stated, else null), title (if stated, else null). Add a "people" array to the JSON you return: "people": [ { "name": string, "hint": string|null, "company": string|null, "title": string|null } ]. Only include real, specifically-named individuals (never the user themselves, never vague references like "a client"). If no one was named, return "people": [].`;

    const aiPrefs = await loadUserAiPreferences(supabase, userId);
    const basePrompt = (posture === 'established' ? established : greenfield) + peopleClause;
    const systemPrompt = withPersonality(basePrompt, aiPrefs);

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
          { role: 'user', content: transcript },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.4,
        store: false,
      }),
      signal: AbortSignal.timeout(20_000),
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
      JSON.stringify({
        ideas: Array.isArray(parsed.ideas) ? parsed.ideas : [],
        people: Array.isArray(parsed.people) ? parsed.people : [],
        posture: parsed.posture ?? (posture === 'established' ? 'established' : 'greenfield'),
        summary: typeof parsed.summary === 'string' ? parsed.summary : null,
        raw_transcript: transcript,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

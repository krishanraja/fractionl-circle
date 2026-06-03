import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit, enforceMaxLength } from '../_shared/compliance.ts';
import { loadUserAiPreferences, withPersonality } from '../_shared/aiPersonality.ts';

// P1 — the "borrowed conviction" engine. From the one thing a newly-independent
// exec can always answer in 90 seconds — what they ran and why they left — it
// PROPOSES a confident, specific, editable identity + lead offer + warm doors.
// It never interrogates an ICP/offer they don't have yet; it hands them a sharp
// draft to react to. Motivation is inferred from "why you left", never asked as
// jargon. Output is a proposal the client persists on accept.

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { userId, supabase } = await requireAuth(req);
    checkRateLimit(`extract-identity:${userId}`, 8, 60_000);

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(JSON.stringify({ error: 'Service unavailable' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { transcript } = await req.json();
    if (!transcript || typeof transcript !== 'string') {
      return new Response(JSON.stringify({ error: 'No transcript provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    enforceMaxLength(transcript, 15_000, 'transcript');

    const system = `You are the chief of staff for a newly-independent senior executive (a former VP/C-suite leader — CMO, CRO, CFO, COO, CTO) who has just gone fractional. They told you, in their own words, what they ran inside companies and why they went independent. They have deep capability but have NEVER had to generate their own demand, and most do NOT yet have a defined offer or ICP — that is exactly why they need you.

Your job is NOT to interrogate them. It is to ARRIVE WITH A CONFIDENT, SPECIFIC, EDITABLE HYPOTHESIS they can react to. Reacting to a sharp wrong answer is easy for them; generating a right one from scratch is paralyzing. Carry the load.

From what they said, infer and propose:
- motivation_type: "pushed" (left via layoff/restructure/aged-out — urgency, thinner runway), "pulled" (chose it — burnout/autonomy, conviction), or "lifestyle" (portfolio life, flexibility). Infer from WHY they left; if genuinely unclear, null.
- journey_stage: one of "0-3mo","3-6mo","6-12mo","12-18mo","18+mo" if they hint at it, else null.
- role: their functional role as a lowercase slug — one of cmo, cro, cfo, coo, cto, cpo, chief_of_staff, or other.
- offer_maturity: "vague","rough","tested", or "refined" — how defined their offer already sounds.
- identity_statement: ONE sentence in second person that gives them an identity to stand on, e.g. "You're the operator who turns a Series B's leaky funnel into predictable pipeline." Specific, never generic. No "I help companies grow."
- offer: the single lead offer you'd have them sell first — { title (max 6 words), one_liner, pain (the expensive, urgent problem it removes, in the buyer's words), price_band (e.g. "$8-15K/mo"), icp (one tight line: stage + type + the specific situation) }.
- warm_doors: up to 3 people they could reopen FIRST. If they named specific people, use them: { name, why }. If they named none, return [] (do NOT invent names).
- summary: one warm sentence spoken back to them.
- confidence: 0..1 — how much signal you had. Below 0.5 means you're guessing.

Rules: Be opinionated and concrete. Prefer a narrow ICP over a broad one. Name the pain in the buyer's own terms, not consultant-speak. Never fabricate a person's name. Return ONLY JSON:
{ "motivation_type": string|null, "journey_stage": string|null, "role": string|null, "offer_maturity": string|null, "identity_statement": string, "offer": { "title": string, "one_liner": string, "pain": string, "price_band": string, "icp": string }, "warm_doors": [ { "name": string, "why": string } ], "summary": string, "confidence": number }`;

    const aiPrefs = await loadUserAiPreferences(supabase, userId);
    const systemPrompt = withPersonality(system, aiPrefs);

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
        temperature: 0.5,
        store: false,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status);
      return new Response(JSON.stringify({ error: 'AI processing failed' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response.json();
    const parsed = JSON.parse(result.choices[0].message.content);
    const warmDoors = Array.isArray(parsed.warm_doors)
      ? parsed.warm_doors.filter((d: { name?: string }) => d && typeof d.name === 'string' && d.name.trim()).slice(0, 3)
      : [];

    return new Response(
      JSON.stringify({
        motivation_type: parsed.motivation_type ?? null,
        journey_stage: parsed.journey_stage ?? null,
        role: typeof parsed.role === 'string' ? parsed.role : null,
        offer_maturity: parsed.offer_maturity ?? null,
        identity_statement: typeof parsed.identity_statement === 'string' ? parsed.identity_statement : '',
        offer: parsed.offer && typeof parsed.offer === 'object' ? parsed.offer : null,
        warm_doors: warmDoors,
        summary: typeof parsed.summary === 'string' ? parsed.summary : null,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        raw_transcript: transcript,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

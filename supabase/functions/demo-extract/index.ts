import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { getCorsHeaders, checkRateLimitDurable, RateLimitError } from '../_shared/compliance.ts';

// Anonymous "live-mic demo" extractor for logged-OUT visitors.
//
// This is an UNAUTHENTICATED endpoint (deployed verify_jwt=false) that calls a
// paid LLM API, so safety is load-bearing:
//   - Hard IP rate-limit via the durable limiter (3 demo calls / IP / hour).
//   - Input is capped (transcript ~1200 chars; audio handled by Whisper's own cap).
//   - Stateless: NO auth, NO user data, NO DB writes other than the rate_limits
//     row the limiter itself increments.
// It reuses the real pipeline (Whisper + gpt-4o-mini) but returns ideas only.

const MAX_TRANSCRIPT_CHARS = 1200;
// ~6MB base64 of audio is plenty for a few seconds; reject obvious abuse early.
const MAX_AUDIO_CHARS = 6 * 1024 * 1024;
const ALLOWED_FORMATS = ['webm', 'mp3', 'mp4', 'wav', 'ogg', 'm4a'];

// Derive a best-effort client IP. Supabase puts the real client IP at the head
// of x-forwarded-for; fall back to x-real-ip, then a constant so the limiter
// still buckets unknown callers together (fail-safe, never fail-open per-IP).
function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

const greenfieldPrompt = `You are helping a fractional executive or consultant turn a short spoken (or typed) introduction into up to 3 concrete, sellable revenue stream ideas.

For each Idea, return:
- title: short name (max 6 words)
- one_liner: one-sentence description of the offer
- price_band: rough monthly/project range as text (e.g. "$3-8K/mo", "$15-25K project")
- icp: one-line description of the ideal customer profile

Return JSON: { "ideas": [ ... ] } with at most 3 ideas.

Be specific and opinionated. Use what they said about their skills, wins, and appetite. Prefer narrower ICPs over broader ones. Do not include any other keys.`;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Durable, cross-instance IP rate limit: 3 demo calls per IP per hour.
    // check_rate_limit is security-definer and revoked from public, so it must
    // be called with the service-role client (NOT the anon key).
    const ip = getClientIp(req);
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );
    await checkRateLimitDurable(admin, `demo-extract:${ip}`, 3, 3600);

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Service unavailable' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { transcript, audio, format = 'webm' } = body as {
      transcript?: string;
      audio?: string;
      format?: string;
    };

    // Resolve transcript text: either provided directly, or via Whisper on audio.
    let text = typeof transcript === 'string' ? transcript.trim() : '';

    if (!text && typeof audio === 'string' && audio.length > 0) {
      if (audio.length > MAX_AUDIO_CHARS) {
        return new Response(
          JSON.stringify({ error: 'Audio too large for the demo. Keep it to a few seconds.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!ALLOWED_FORMATS.includes(format)) {
        return new Response(
          JSON.stringify({ error: 'Unsupported audio format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Inline Whisper call, replicating the transcribe function.
      const binaryString = atob(audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const formData = new FormData();
      formData.append('file', new Blob([bytes], { type: `audio/${format}` }), `audio.${format}`);
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');

      const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiApiKey}` },
        body: formData,
        signal: AbortSignal.timeout(60_000),
      });
      if (!whisperRes.ok) {
        console.error('Whisper API error:', whisperRes.status);
        return new Response(
          JSON.stringify({ error: 'Transcription failed' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const whisperResult = await whisperRes.json();
      text = (whisperResult.text ?? '').trim();
    }

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Tell me a little about what you have been working on.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cap input length (defense against cost abuse on an unauthenticated route).
    if (text.length > MAX_TRANSCRIPT_CHARS) {
      text = text.slice(0, MAX_TRANSCRIPT_CHARS);
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: greenfieldPrompt },
          { role: 'user', content: text },
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
    const ideas = (Array.isArray(parsed.ideas) ? parsed.ideas : [])
      .slice(0, 3)
      .map((i: Record<string, unknown>) => ({
        title: typeof i.title === 'string' ? i.title : '',
        one_liner: typeof i.one_liner === 'string' ? i.one_liner : null,
        price_band: typeof i.price_band === 'string' ? i.price_band : null,
        icp: typeof i.icp === 'string' ? i.icp : null,
      }))
      .filter((i: { title: string }) => i.title.length > 0);

    return new Response(
      JSON.stringify({ ideas }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    if (error instanceof RateLimitError) {
      return new Response(
        JSON.stringify({ error: 'You have tried the demo a few times. Sign up to keep going.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.error('demo-extract error:', error);
    return new Response(
      JSON.stringify({ error: 'An internal error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

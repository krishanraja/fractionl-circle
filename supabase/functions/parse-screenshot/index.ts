import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit, enforceMaxLength } from '../_shared/compliance.ts';

/**
 * parse-screenshot edge function.
 *
 * Accepts a base64-encoded image of a LinkedIn / Instagram / Contacts profile
 * screenshot and returns structured contact fields. Uses a vision model to
 * detect the platform and extract fields.
 *
 * Modes:
 *   - { image, mime } — one-shot parse (synchronous response).
 *   - { parse_id } — fetch a previously-stored parse (used by the iOS Shortcut
 *                    flow that POSTs the image separately then opens the app).
 *
 * Required secrets:
 *   - ANTHROPIC_API_KEY (preferred) OR OPENAI_API_KEY
 *
 * Rate limit: 20 parses per minute per user.
 */

interface ParsedScreenshot {
  platform?: 'linkedin' | 'instagram' | 'contacts' | 'unknown';
  name?: string;
  headline?: string;
  company?: string;
  title?: string;
  location?: string;
  handle?: string;
  profile_url?: string;
  email?: string;
  phone?: string;
}

const PROMPT = `You are an assistant that extracts contact info from app screenshots.
The screenshot is of one of:
- A LinkedIn profile (blue top bar, "Connect" / "Message" buttons, experience list)
- An Instagram profile (grid of posts, "Follow" button, bio)
- An iOS Contacts card (white rows, phone/email labels)
- Something else (platform = "unknown")

Extract ONLY what's visible. Return STRICT JSON with these fields (omit any you can't read):
{
  "platform": "linkedin" | "instagram" | "contacts" | "unknown",
  "name": string,
  "headline": string,
  "company": string,
  "title": string,
  "location": string,
  "handle": string,
  "profile_url": string,
  "email": string,
  "phone": string
}

Rules:
- If the screenshot is LinkedIn, name and headline are usually at the top. Company is often the most-recent experience.
- If Instagram, the handle is the bold text at the top; "name" is the display name just below. Bio → headline.
- If Contacts, name is at the top; phone and email are labeled rows.
- Never invent values. If unsure, omit the field.
- Output must be pure JSON with no prose, no markdown fences.`;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { userId } = await requireAuth(req);
    checkRateLimit(`parse-screenshot:${userId}`, 20, 60_000);

    const body = await req.json();

    if (body.parse_id) {
      // Retrieve a previously-stored parse. Currently returns empty — wire up
      // a `screenshot_parses` table when iOS Shortcut flow graduates.
      return json({ parsed: {} }, corsHeaders);
    }

    if (!body.image) {
      return json({ error: 'image is required' }, corsHeaders, 400);
    }
    enforceMaxLength(body.image, 8_000_000, 'image'); // ~6MB b64

    const mime = body.mime || 'image/png';
    const parsed = await parseWithVisionModel(body.image, mime);

    return json({ parsed }, corsHeaders);
  } catch (err) {
    return safeErrorResponse(err, corsHeaders);
  }
});

async function parseWithVisionModel(b64: string, mime: string): Promise<ParsedScreenshot> {
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (anthropicKey) return parseWithClaude(b64, mime, anthropicKey);

  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (openaiKey) return parseWithOpenAI(b64, mime, openaiKey);

  throw new Error('No vision model API key configured (set ANTHROPIC_API_KEY or OPENAI_API_KEY)');
}

async function parseWithClaude(b64: string, mime: string, apiKey: string): Promise<ParsedScreenshot> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mime, data: b64 } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic error: ${res.status} ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text || '{}';
  return extractJson(text);
}

async function parseWithOpenAI(b64: string, mime: string, apiKey: string): Promise<ParsedScreenshot> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 512,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mime};base64,${b64}` } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || '{}';
  return extractJson(text);
}

function extractJson(text: string): ParsedScreenshot {
  // Strip markdown fences if the model added them despite instructions.
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Find the first { ... } block and parse that.
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { /* ignore */ }
    }
    return {};
  }
}

function json(body: unknown, corsHeaders: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

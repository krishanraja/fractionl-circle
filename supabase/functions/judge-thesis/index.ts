import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit } from '../_shared/compliance.ts';
import { chatJSON } from '../_shared/llm.ts';

// judge-thesis: the cheap "is this enough to validate?" gate that runs before we spend a
// live research call. A good thesis names WHO it is for, WHAT the service is, and ideally
// WHY them. We push back on thin inputs, route questions into discovery, lists into a
// pick-one, and verbose inputs into a play-back. Plain language, honest, no hype. Runs on
// the provider-fallback LLM (Gemini today). The client also has a deterministic fallback,
// so this never hard-blocks the user if the model is down.

const SYSTEM = `You gate a fractional executive's one-line business thesis before we spend a live market research call on it. A strong thesis names WHO it is for (a specific buyer), WHAT the service is, and ideally WHY them (an edge). Classify the input.

Return ONLY JSON:
{
 "kind": "strong" | "thin" | "question" | "multiple" | "essay",
 "followup": string,
 "distilled": string,
 "options": [string]
}

Definitions:
- "strong": names a specific buyer AND a concrete service. A qualified audience like "seed-stage B2B SaaS founders" counts as specific; "startups" or "businesses" alone does not. Set followup to "" and distilled to a clean one-line version of their thesis.
- "thin": too vague, generic, or one word (e.g. "marketing services", "consulting"). followup = one short, kind, specific nudge naming exactly what is missing (the who, or the why-you), with a concrete example they could copy. distilled "", options [].
- "question": the person is asking what to offer, or says they are unsure (e.g. "what should I offer?", "I don't know yet"). followup = one plain discovery question that helps them find it, like asking what they have spent the most years doing. distilled "", options [].
- "multiple": names two or more distinct offers or roles (e.g. "fractional CMO and CFO, plus coaching"). options = the distinct offers as short labels. followup = ask which one to pressure-test first. distilled "".
- "essay": a long, rambling, or unfocused input. distilled = one crisp line capturing the core of what they mean. followup = ask if that one line is right. options [].

Rules: plain language, no jargon, no hype, no em dashes, no exclamation marks. Keep followup under 240 characters. Never invent facts about them.`;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { userId } = await requireAuth(req);
    checkRateLimit(`judge-thesis:${userId}`, 20, 60_000);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const thesis: string = typeof body?.thesis === 'string' ? body.thesis.slice(0, 1000) : '';
    const round: number = typeof body?.round === 'number' ? body.round : 0;
    if (!thesis.trim()) {
      return new Response(JSON.stringify({ error: 'Empty thesis.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { content } = await chatJSON({
      system: SYSTEM,
      user: `THESIS: ${thesis}${round >= 2 ? '\n\n(This is their second attempt after a nudge. If it is still thin, be a touch warmer and more concrete.)' : ''}`,
      temperature: 0.2,
      maxTokens: 400,
    });
    const parsed = JSON.parse(content);
    const kind = ['strong', 'thin', 'question', 'multiple', 'essay'].includes(parsed?.kind) ? parsed.kind : 'thin';
    const out = {
      kind,
      followup: typeof parsed?.followup === 'string' ? parsed.followup : '',
      distilled: typeof parsed?.distilled === 'string' ? parsed.distilled : '',
      options: Array.isArray(parsed?.options) ? parsed.options.filter((x: unknown) => typeof x === 'string').slice(0, 4) : [],
    };
    return new Response(JSON.stringify(out), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

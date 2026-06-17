import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit } from '../_shared/compliance.ts';
import { chatJSON } from '../_shared/llm.ts';

// extract-read: infer the adaptive "Read" from a fractional exec's own words and
// write it to the_read. The optional, smart onboarding path (vs the pill fallback).
// Provider-fallback LLM (OpenAI exhausted -> Gemini gateway). Honest: blank what
// cannot be grounded; never use contact-count to segment.

const SYSTEM = `You read a fractional executive's own words about where they are and infer a structured "Read" of their situation.

Return ONLY JSON:
{ "segment": "new" | "seasoned" | "lifestyle", "function": string | null, "niche": string | null, "stage": string | null, "client_count": number | null, "motivation_type": "pushed" | "pulled" | "lifestyle" | null, "offer_one_liner": string | null, "lit_fork_domain": "offer_pricing" | "icp_positioning" | "network_strategy" | "scaling_leverage", "confidence": number }

Rules:
- segment: "new" if they just left / are pre-revenue / chasing the first or second client; "seasoned" if 2+ years in, multiple clients, talking plateau/productize/leverage/equity; "lifestyle" if they want a steady small portfolio and explicitly do NOT want to grow. NEVER use contact-count to decide segment (a new exec can have a fat address book).
- function: the discipline they led (marketing, finance, revenue, operations, product, people), or null.
- motivation_type: "pushed" (layoff/restructure), "pulled" (chose it, burnout/autonomy), "lifestyle" (portfolio life). null if unclear.
- lit_fork_domain = the single most pressing decision: new + no clear niche -> "icp_positioning"; new + has a niche but underpriced/hourly -> "offer_pricing"; new + needs the second client -> "network_strategy"; seasoned at the plateau -> "scaling_leverage".
- offer_one_liner: a short paraphrase of what they help with, in their words, or null.
- Blank (null) any field the words do not support. Do not invent. confidence (0..1) reflects how well the words supported the read.`;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { userId, supabase } = await requireAuth(req);
    checkRateLimit(`extract-read:${userId}`, 8, 60_000);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const text: string = typeof body?.text === 'string' ? body.text.slice(0, 2000) : '';
    if (!text.trim()) {
      return new Response(JSON.stringify({ error: 'Tell me a sentence about where you are.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let parsed: Record<string, unknown>;
    try {
      const { content } = await chatJSON({ system: SYSTEM, user: text, temperature: 0.2 });
      parsed = JSON.parse(content);
    } catch (e) {
      return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'inference failed' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const seg = ['new', 'seasoned', 'lifestyle'].includes(String(parsed.segment)) ? String(parsed.segment) : 'new';
    const fork = ['offer_pricing', 'icp_positioning', 'network_strategy', 'scaling_leverage'].includes(String(parsed.lit_fork_domain))
      ? String(parsed.lit_fork_domain) : (seg === 'seasoned' ? 'scaling_leverage' : 'icp_positioning');
    const conf = typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : null;

    const row = {
      user_id: userId,
      segment: seg,
      segment_confidence: conf,
      function: (parsed.function as string) ?? null,
      niche: (parsed.niche as string) ?? null,
      stage: (parsed.stage as string) ?? null,
      client_count: typeof parsed.client_count === 'number' ? parsed.client_count : null,
      motivation_type: (parsed.motivation_type as string) ?? null,
      offer_one_liner: (parsed.offer_one_liner as string) ?? null,
      lit_fork_domain: fork,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('the_read').upsert(row, { onConflict: 'user_id' }).select().maybeSingle();
    if (error) throw error;

    return new Response(JSON.stringify({ read: data, confidence: conf }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

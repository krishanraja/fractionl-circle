import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit } from '../_shared/compliance.ts';

// extract-admire: the user screenshots a business / profile / site they admire and want to
// build something like. Unlike extract-contact (which adds a person to the circle), this
// reads HOW THEY POSITION so we can sharpen the user's own edge. It writes nothing to the
// circle. Honest: if the image is unreadable or not a business/profile, it says so. It also
// flags when the shot is a direct competitor (a benchmark, not a template) or a different
// field (keep only the transferable part).

interface Admire {
  ok: boolean;
  name?: string;
  positioning?: string;       // how they position / what makes them notable, one line
  kind?: 'business' | 'person' | 'competitor';
  field?: string;             // set when clearly a different industry than fractional advisory
  confidence?: number;
  reject?: string;            // why we could not use it
}

async function visionAdmire(imageB64: string, mime: string, thesis: string): Promise<Admire> {
  const key = Deno.env.get('GOOGLE_API_KEY');
  if (!key) throw new Error('GOOGLE_API_KEY not set');
  const prompt = `This is a screenshot of a business, a profile (LinkedIn / Instagram), or a website that a fractional executive admires and wants to build something like. Their own thesis is: "${thesis || '(not given)'}".
Read how this admired business or person positions itself. Return JSON ONLY:
{"ok": boolean, "name": string|null, "positioning": string|null, "kind": "business"|"person"|"competitor"|null, "field": string|null, "confidence": number 0..1}
- "positioning": one plain line on what makes them notable or how they package their offer (productized? premium? niche? content-led?). Not a description of the image.
- "kind": "competitor" if they offer nearly the same thing to nearly the same buyers as the user's thesis; "person" if it is an individual with no clear business; otherwise "business".
- "field": only if they are clearly in a different industry than fractional / advisory work (e.g. food, fashion), naming that field; otherwise null.
- If the image is unreadable, or not a business/profile/site at all (a meme, a random photo), set "ok": false and "confidence" below 0.4.
Do not invent details you cannot see.`;
  const body = { contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: imageB64 } }] }], generationConfig: { temperature: 0.1 } };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const j = await res.json();
  const text: string = j.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no json from vision');
  return JSON.parse(m[0]);
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { userId } = await requireAuth(req);
    checkRateLimit(`extract-admire:${userId}`, 20, 60_000);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    let image: string = typeof body?.image === 'string' ? body.image : '';
    const thesis: string = typeof body?.thesis === 'string' ? body.thesis.slice(0, 500) : '';
    let mime = 'image/png';
    const dataUrl = image.match(/^data:(image\/[a-z]+);base64,(.*)$/s);
    if (dataUrl) { mime = dataUrl[1]; image = dataUrl[2]; }
    if (!image) {
      return new Response(JSON.stringify({ error: 'No image received.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let a: Admire;
    try { a = await visionAdmire(image, mime, thesis); }
    catch (e) { return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'vision failed' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }

    if (!a.ok || (typeof a.confidence === 'number' && a.confidence < 0.4) || !a.name) {
      return new Response(JSON.stringify({ ok: false, reject: 'I could not read a profile or business in that clearly. Try a sharper screenshot, or just tell me in one line what they do.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      ok: true,
      name: a.name,
      positioning: a.positioning ?? null,
      kind: ['business', 'person', 'competitor'].includes(a.kind ?? '') ? a.kind : 'business',
      field: a.field ?? null,
      confidence: a.confidence ?? null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

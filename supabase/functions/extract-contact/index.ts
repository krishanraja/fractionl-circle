import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit } from '../_shared/compliance.ts';

// extract-contact: the immediate "see the machine work" magic. The user screenshots a
// LinkedIn or Instagram profile (or a business card); Gemini vision reads the person and
// we add them to their circle. Honest: if it cannot read the image confidently, it says
// so rather than inventing a contact. This is the instant network-in path while the full
// LinkedIn Connections export (24 to 48 hours) is in flight.

async function visionExtract(imageB64: string, mime: string): Promise<{ name?: string; title?: string; company?: string; note?: string; confidence?: number }> {
  const key = Deno.env.get('GOOGLE_API_KEY');
  if (!key) throw new Error('GOOGLE_API_KEY not set');
  const prompt = `This is a screenshot of a professional profile (LinkedIn, Instagram, or a business card). Extract the person as JSON ONLY:
{"name": string, "title": string|null, "company": string|null, "note": string|null, "confidence": number between 0 and 1}
"note" is one short line of anything notable (their focus, background). If the image is not a person/profile or you cannot read it, return confidence below 0.4. Do not invent details.`;
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
    const { userId, supabase } = await requireAuth(req);
    checkRateLimit(`extract-contact:${userId}`, 20, 60_000);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    let image: string = typeof body?.image === 'string' ? body.image : '';
    let mime = 'image/png';
    const dataUrl = image.match(/^data:(image\/[a-z]+);base64,(.*)$/s);
    if (dataUrl) { mime = dataUrl[1]; image = dataUrl[2]; }
    if (!image) {
      return new Response(JSON.stringify({ error: 'No image received.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let p: { name?: string; title?: string; company?: string; note?: string; confidence?: number };
    try { p = await visionExtract(image, mime); }
    catch (e) { return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'vision failed' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }

    if (!p.name || (typeof p.confidence === 'number' && p.confidence < 0.4)) {
      return new Response(JSON.stringify({ error: 'I could not read a profile in that image clearly. Try a sharper screenshot of the name, title, and company.' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data, error } = await supabase.from('circle_person')
      .insert({ user_id: userId, display_name: p.name, title: p.title ?? null, company: p.company ?? null, note: p.note ?? null, source: 'screenshot' })
      .select('id, display_name, title, company, note')
      .maybeSingle();
    if (error) throw error;

    return new Response(JSON.stringify({ person: data, confidence: p.confidence ?? null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

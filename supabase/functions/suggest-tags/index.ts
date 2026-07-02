import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit, enforceMaxLength } from '../_shared/compliance.ts';
import { chatJSON } from '../_shared/llm.ts';

// suggest-tags: given the little we know about a just-captured contact (name,
// title, company, headline, notes), propose intent tags for the three buckets the
// confirm card offers. The UI always shows the static presets; these AI picks are
// a head start, pre-highlighted but not auto-selected. Degrades to an empty
// object when no LLM key is configured - never blocks the add.

// Allowed preset slugs per bucket. Mirrors src/lib/contactTags.ts. The model is
// told to prefer these and may add at most two short free slugs per bucket.
const PRESETS = {
  met: ['conference', 'intro', 'worked_together', 'linkedin', 'cold_inbound', 'event', 'mutual_friend', 'community'],
  brings: ['capital', 'customers', 'hiring', 'distribution', 'domain_expertise', 'operator', 'advisor', 'audience'],
  work: ['could_hire_me', 'could_refer_me', 'partner', 'mentor', 'peer', 'co_build'],
};

const SYSTEM = `You tag a newly-saved professional contact for a fractional executive's personal network, to help them remember why the person matters.

Return ONLY JSON: { "met": string[], "brings": string[], "work": string[] }
- "met" = where/how they likely met. "brings" = what this person brings to the user (capital, customers, expertise...). "work" = how they might work together.
- Prefer slugs from the allowed lists you are given. You MAY add at most TWO short lowercase_underscore free slugs per bucket when a preset clearly does not fit (e.g. a niche the person specializes in under "brings").
- Only suggest what the person's title/company/headline/notes actually support. "met" is usually unknowable from a profile - leave it empty unless the notes say so. Empty arrays are correct when you are unsure. Never invent.
- At most 3 slugs per bucket. No prose.`;

interface Suggestions { met: string[]; brings: string[]; work: string[]; }

const clean = (arr: unknown, max = 3): string[] =>
  Array.isArray(arr)
    ? Array.from(new Set(arr.filter((s): s is string => typeof s === 'string' && /^[a-z0-9_]{2,30}$/.test(s)))).slice(0, max)
    : [];

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { userId } = await requireAuth(req);
    checkRateLimit(`suggest-tags:${userId}`, 20, 60_000);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const company = typeof body?.company === 'string' ? body.company.trim() : '';
    const headline = typeof body?.headline === 'string' ? body.headline.trim() : '';
    const notes = typeof body?.notes === 'string' ? body.notes.trim() : '';
    enforceMaxLength(`${name}${title}${company}${headline}${notes}`, 4000, 'contact');

    // Nothing to go on, or no provider configured → empty (UI still shows presets).
    if (!name && !title && !company && !headline && !notes) {
      return json({ met: [], brings: [], work: [] }, corsHeaders);
    }

    const user = JSON.stringify({
      contact: { name, title, company, headline, notes },
      allowed: PRESETS,
    });

    let parsed: Partial<Suggestions> = {};
    try {
      const { content } = await chatJSON({ system: SYSTEM, user, temperature: 0.2, maxTokens: 300 });
      parsed = JSON.parse(content);
    } catch {
      // No key / provider down / bad JSON → graceful empty.
      return json({ met: [], brings: [], work: [] }, corsHeaders);
    }

    return json({ met: clean(parsed.met), brings: clean(parsed.brings), work: clean(parsed.work) }, corsHeaders);
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

function json(data: Record<string, unknown>, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

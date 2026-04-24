import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit } from '../_shared/compliance.ts';

// Phase 3: LLM-powered Circle dedupe.
// Scans the caller's circle_person for likely duplicates, returns suggestions.
// Auto-merge happens client-side via `merge-persons` after the user confirms
// (>=0.92 candidates are pre-marked auto_accept for one-tap bulk accept).

interface Person {
  id: string;
  display_name: string;
  primary_email: string | null;
  primary_phone: string | null;
  linkedin_url: string | null;
  company: string | null;
  title: string | null;
  fingerprint: string | null;
}

interface LlmPair {
  a_id: string;
  b_id: string;
  confidence: number;
  rationale?: string | null;
}

interface Suggestion {
  a: Person;
  b: Person;
  confidence: number;
  rationale: string | null;
  auto_accept: boolean;
}

const AUTO_ACCEPT_THRESHOLD = 0.92;
const MAX_CIRCLE_SIZE = 600;
const MAX_PAIRS_RETURNED = 100;

const firstToken = (s: string | null): string => {
  const name = (s ?? '').toLowerCase().trim();
  return name.split(/\s+/)[0] ?? '';
};

// Group by first-name token to keep LLM chunks small + signal-dense.
const chunkByFirstName = (people: Person[]): Person[][] => {
  const groups = new Map<string, Person[]>();
  for (const p of people) {
    const key = firstToken(p.display_name);
    if (!key) continue;
    const bucket = groups.get(key) ?? [];
    bucket.push(p);
    groups.set(key, bucket);
  }
  // Only keep groups with >1 person — singletons can't dupe.
  const chunks: Person[][] = [];
  for (const bucket of groups.values()) {
    if (bucket.length < 2) continue;
    // Split oversize buckets so each LLM prompt stays small.
    const MAX = 30;
    for (let i = 0; i < bucket.length; i += MAX) {
      chunks.push(bucket.slice(i, i + MAX));
    }
  }
  return chunks;
};

const buildPrompt = (chunk: Person[]) => {
  const system = `You are identifying duplicate contact records in a personal network. Given a short list of people who share a first name, return pairs that are the SAME person across different source records (e.g. "Sarah Johnson" from LinkedIn + "Sarah J." from email).

Return JSON: { "pairs": [ { "a_id": string, "b_id": string, "confidence": 0..1, "rationale": short string } ] }

Rules:
- Only return pairs you're genuinely confident about (>=0.75). No wild guesses.
- Use id values exactly as provided.
- Do not pair someone with themselves.
- Do not return more than ${MAX_PAIRS_RETURNED} pairs.
- "rationale" is a short phrase like "same LinkedIn URL" or "same email domain + same title" — under 60 chars.

Strong signals (score >=0.9): identical email, identical linkedin_url, identical phone.
Medium (0.75-0.9): same last name + same company; same email domain + same title.
Weak (<0.75): do not return.`;

  const user = JSON.stringify({
    people: chunk.map((p) => ({
      id: p.id,
      name: p.display_name,
      email: p.primary_email,
      phone: p.primary_phone,
      linkedin: p.linkedin_url,
      company: p.company,
      title: p.title,
    })),
  });
  return { system, user };
};

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { userId, supabase } = await requireAuth(req);
    checkRateLimit(`dedupe-circle:${userId}`, 4, 60_000);

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(JSON.stringify({ error: 'Service unavailable' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: circle, error } = await supabase
      .from('circle_person')
      .select('id, display_name, primary_email, primary_phone, linkedin_url, company, title, fingerprint')
      .eq('user_id', userId)
      .order('last_interaction_at', { ascending: false })
      .limit(MAX_CIRCLE_SIZE);
    if (error) throw error;
    if (!circle || circle.length < 2) {
      return new Response(JSON.stringify({ suggestions: [], scanned: circle?.length ?? 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const byId = new Map<string, Person>((circle as Person[]).map((p) => [p.id, p]));
    const chunks = chunkByFirstName(circle as Person[]);
    const seenPair = new Set<string>();
    const suggestions: Suggestion[] = [];

    for (const chunk of chunks) {
      const { system, user } = buildPrompt(chunk);
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          store: false,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!resp.ok) continue;
      const result = await resp.json();
      let parsed: { pairs?: LlmPair[] };
      try {
        parsed = JSON.parse(result.choices[0].message.content);
      } catch {
        continue;
      }
      for (const pair of parsed.pairs ?? []) {
        if (!pair.a_id || !pair.b_id || pair.a_id === pair.b_id) continue;
        const a = byId.get(pair.a_id);
        const b = byId.get(pair.b_id);
        if (!a || !b) continue;
        // Canonical key: sorted ids so (a,b) == (b,a).
        const key = [pair.a_id, pair.b_id].sort().join('::');
        if (seenPair.has(key)) continue;
        seenPair.add(key);
        const confidence = Math.max(0, Math.min(1, Number(pair.confidence) || 0));
        if (confidence < 0.75) continue;
        suggestions.push({
          a,
          b,
          confidence,
          rationale: pair.rationale ?? null,
          auto_accept: confidence >= AUTO_ACCEPT_THRESHOLD,
        });
        if (suggestions.length >= MAX_PAIRS_RETURNED) break;
      }
      if (suggestions.length >= MAX_PAIRS_RETURNED) break;
    }

    suggestions.sort((x, y) => y.confidence - x.confidence);

    return new Response(JSON.stringify({
      suggestions,
      scanned: circle.length,
      chunks: chunks.length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

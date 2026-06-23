import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit } from '../_shared/compliance.ts';
import { chatJSON } from '../_shared/llm.ts';

// enrich-linkedin: take a circle person, identify their EXACT LinkedIn profile
// (disambiguating among candidates when needed), then pull a rich dossier from
// whatever providers are configured and store it on circle_person.
//
// Request: { person_id, linkedin_url? }
//   - linkedin_url given (or already on the person) -> go straight to the dossier.
//   - otherwise resolve candidates by name (+company) via Apollo. One/clear match
//     -> proceed; several -> return them for the user to pick.
//
// Responses:
//   { status: 'done', dossier, note }
//   { status: 'needs_disambiguation', candidates: [...] }
//   { status: 'no_keys' }     (nothing configured — the contact still exists)
//   { status: 'failed', reason }
//
// Providers (all optional; graceful when a key is absent):
//   APOLLO_API_KEY     — candidate search + enrich by linkedin_url
//   PROXYCURL_API_KEY  — full public-profile scrape
//   any LLM key        — grounded summary fallback (via _shared/llm.ts)
//
// Privacy: user-initiated, one person at a time, public-profile data only.

interface Candidate {
  name: string;
  headline: string;
  url: string;
  photo_url?: string;
  company?: string;
  title?: string;
  city?: string;
}

interface PersonRow {
  id: string;
  display_name: string;
  linkedin_url: string | null;
  company: string | null;
  title: string | null;
  location: string | null;
  avatar_url: string | null;
  note: string | null;
}

const json = (data: Record<string, unknown>, cors: Record<string, string>, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// Free tier gets a monthly allowance of deep dives (the costly, Pro-flavoured
// action); Pro/Executive are unlimited. Tune freely — this is just config.
const FREE_DEEP_ENRICH_PER_MONTH = 5;
const ENRICH_FEATURE = 'deep_enrich';

const monthStart = () => { const d = new Date(); d.setUTCDate(1); d.setUTCHours(0, 0, 0, 0); return d; };

// deno-lint-ignore no-explicit-any
async function effectiveTier(supabase: any, userId: string): Promise<'free' | 'pro' | 'executive'> {
  try {
    const { data } = await supabase.from('subscriptions').select('tier, status, trial_ends_at').eq('user_id', userId).maybeSingle();
    if (!data) return 'free';
    const trialing = data.status === 'trialing' && data.trial_ends_at && new Date(data.trial_ends_at) > new Date();
    return (trialing ? 'pro' : (data.tier ?? 'free')) as 'free' | 'pro' | 'executive';
  } catch {
    return 'free'; // fail open on a billing hiccup — never trap the user
  }
}

// deno-lint-ignore no-explicit-any
async function deepEnrichUsed(supabase: any, userId: string): Promise<number> {
  try {
    const { data } = await supabase.from('usage_tracking').select('count')
      .eq('user_id', userId).eq('feature', ENRICH_FEATURE).gte('period_start', monthStart().toISOString()).maybeSingle();
    return typeof data?.count === 'number' ? data.count : 0;
  } catch {
    return 0;
  }
}

// deno-lint-ignore no-explicit-any
async function bumpDeepEnrich(supabase: any, userId: string): Promise<void> {
  const start = monthStart();
  const end = new Date(start); end.setUTCMonth(end.getUTCMonth() + 1);
  try {
    await supabase.rpc('increment_usage', {
      p_user_id: userId, p_feature: ENRICH_FEATURE,
      p_period_start: start.toISOString(), p_period_end: end.toISOString(),
    });
  } catch { /* usage tracking is best-effort */ }
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const { userId, supabase } = await requireAuth(req);
    checkRateLimit(`enrich-linkedin:${userId}`, 10, 60_000);

    const body = await req.json().catch(() => ({}));
    const personId: string = typeof body?.person_id === 'string' ? body.person_id : '';
    let linkedinUrl: string | null = typeof body?.linkedin_url === 'string' ? body.linkedin_url.trim() : null;
    if (!personId) return json({ error: 'person_id required' }, cors, 400);

    // Load the person (RLS scopes this to the caller).
    const { data: personData, error: personErr } = await supabase
      .from('circle_person')
      .select('id, display_name, linkedin_url, company, title, location, avatar_url, note')
      .eq('id', personId)
      .maybeSingle();
    if (personErr) throw personErr;
    const person = personData as PersonRow | null;
    if (!person) return json({ error: 'not found' }, cors, 404);

    // Monetization gate: free tier gets a monthly deep-dive allowance.
    const tier = await effectiveTier(supabase, userId);
    if (tier === 'free') {
      const used = await deepEnrichUsed(supabase, userId);
      if (used >= FREE_DEEP_ENRICH_PER_MONTH) {
        return json({ status: 'limit', limit: FREE_DEEP_ENRICH_PER_MONTH }, cors);
      }
    }

    linkedinUrl = linkedinUrl || person.linkedin_url;

    const apolloKey = Deno.env.get('APOLLO_API_KEY');
    const proxycurlKey = Deno.env.get('PROXYCURL_API_KEY');
    const hasLlm = !!(Deno.env.get('OPENAI_API_KEY') || Deno.env.get('LOVABLE_API_KEY') || Deno.env.get('ANTHROPIC_API_KEY'));

    // Nothing configured at all → mark and bail without failing the contact.
    if (!apolloKey && !proxycurlKey && !hasLlm) {
      await supabase.from('circle_person').update({
        enrichment_status: 'no_keys',
        enrichment_last_attempt_at: new Date().toISOString(),
      }).eq('id', personId);
      return json({ status: 'no_keys' }, cors);
    }

    // ── Step 1/2: resolve the exact profile when we don't have a URL yet ──────
    if (!linkedinUrl && apolloKey) {
      const candidates = await searchCandidates(person.display_name, person.company, apolloKey);
      if (candidates.length > 1) {
        const auto = highConfidencePick(candidates, person.company);
        if (auto) {
          linkedinUrl = auto.url;
        } else {
          await supabase.from('circle_person').update({
            enrichment_status: 'needs_disambiguation',
            enrichment_last_attempt_at: new Date().toISOString(),
          }).eq('id', personId);
          return json({ status: 'needs_disambiguation', candidates }, cors);
        }
      } else if (candidates.length === 1) {
        linkedinUrl = candidates[0].url;
      }
    }

    // ── Step 3: build the dossier ────────────────────────────────────────────
    await supabase.from('circle_person').update({
      enrichment_status: 'pending',
      enrichment_last_attempt_at: new Date().toISOString(),
    }).eq('id', personId);

    const sources: string[] = [];
    const dossier: Record<string, unknown> = {
      identity: { name: person.display_name, linkedin_url: linkedinUrl ?? null },
    };
    let title = person.title;
    let company = person.company;
    let location = person.location;
    let photoUrl = person.avatar_url;

    if (linkedinUrl && apolloKey) {
      const a = await apolloByLinkedin(linkedinUrl, apolloKey);
      if (a) {
        sources.push('apollo');
        title = title || a.title || null;
        company = company || a.company || null;
        location = location || a.city || null;
        photoUrl = photoUrl || a.photo_url || null;
        dossier.current_role = { title: a.title ?? null, company: a.company ?? null };
        if (a.experience?.length) dossier.experience = a.experience;
      }
    }

    if (linkedinUrl && proxycurlKey) {
      const p = await proxycurl(linkedinUrl, proxycurlKey);
      if (p) {
        sources.push('proxycurl');
        title = title || p.title || null;
        company = company || p.company || null;
        location = location || p.location || null;
        photoUrl = photoUrl || p.photo_url || null;
        if (p.summary) dossier.summary = p.summary;
        if (p.experience?.length) dossier.experience = p.experience;
        if (p.education?.length) dossier.education = p.education;
        if (p.skills?.length) dossier.skills = p.skills;
      }
    }

    // LLM fallback / synthesizer: grounded one-paragraph read of who they are.
    if (hasLlm) {
      const summary = await llmSummary({ name: person.display_name, title, company, location, linkedinUrl });
      if (summary) {
        sources.push('llm');
        if (!dossier.summary) dossier.summary = summary;
        else dossier.llm_summary = summary;
      }
    }

    dossier.identity = { name: person.display_name, linkedin_url: linkedinUrl ?? null, location: location ?? null, photo_url: photoUrl ?? null };
    dossier.sources = sources;
    dossier.enriched_at = new Date().toISOString();

    // Compose a short human note. Don't clobber an existing user note.
    const summaryText = typeof dossier.summary === 'string' ? dossier.summary : '';
    const roleLine = [title, company].filter(Boolean).join(' at ');
    const note = person.note || [roleLine, summaryText].filter(Boolean).join(' — ') || null;

    const update: Record<string, unknown> = {
      dossier,
      enrichment_status: 'done',
      enrichment_failure_reason: null,
      enrichment_last_attempt_at: new Date().toISOString(),
    };
    if (linkedinUrl && !person.linkedin_url) update.linkedin_url = linkedinUrl;
    if (title && !person.title) update.title = title;
    if (company && !person.company) update.company = company;
    if (location && !person.location) update.location = location;
    if (photoUrl && !person.avatar_url) update.avatar_url = photoUrl;
    if (note && !person.note) update.note = note;

    await supabase.from('circle_person').update(update).eq('id', personId);
    if (tier === 'free') await bumpDeepEnrich(supabase, userId);
    return json({ status: 'done', dossier, note }, cors);
  } catch (error) {
    return safeErrorResponse(error, cors);
  }
});

// ── Apollo: candidate search by name (+company) ──────────────────────────────
async function searchCandidates(name: string, company: string | null, apiKey: string): Promise<Candidate[]> {
  try {
    const parts = name.split(/\s+/);
    const res = await fetch('https://api.apollo.io/v1/mixed_people/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
      body: JSON.stringify({
        q_keywords: [name, company].filter(Boolean).join(' '),
        per_page: 5,
        ...(parts.length > 1 ? { person_name_first: parts[0], person_name_last: parts.slice(1).join(' ') } : {}),
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.people || [])
      .filter((p: Record<string, unknown>) => p.linkedin_url)
      .slice(0, 5)
      .map((p: Record<string, any>): Candidate => ({
        name: [p.first_name, p.last_name].filter(Boolean).join(' ') || name,
        headline: [p.title, p.organization?.name].filter(Boolean).join(' at ') || '',
        url: p.linkedin_url,
        photo_url: p.photo_url || undefined,
        company: p.organization?.name || undefined,
        title: p.title || undefined,
        city: p.city || undefined,
      }));
  } catch {
    return [];
  }
}

// Auto-pick only when one candidate's company clearly agrees with what we know.
function highConfidencePick(candidates: Candidate[], company: string | null): Candidate | null {
  if (!company) return null;
  const want = company.toLowerCase();
  const matches = candidates.filter((c) => (c.company ?? '').toLowerCase().includes(want) || want.includes((c.company ?? '').toLowerCase()));
  return matches.length === 1 ? matches[0] : null;
}

// ── Apollo: enrich by linkedin_url ───────────────────────────────────────────
async function apolloByLinkedin(url: string, apiKey: string): Promise<{
  title?: string; company?: string; city?: string; photo_url?: string;
  experience?: Array<{ title?: string; company?: string }>;
} | null> {
  try {
    const res = await fetch('https://api.apollo.io/v1/people/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
      body: JSON.stringify({ linkedin_url: url }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const person = data.person;
    if (!person) return null;
    const experience = Array.isArray(person.employment_history)
      ? person.employment_history.slice(0, 8).map((e: Record<string, unknown>) => ({ title: e.title, company: e.organization_name }))
      : undefined;
    return {
      title: person.title || undefined,
      company: person.organization?.name || undefined,
      city: person.city || undefined,
      photo_url: person.photo_url || undefined,
      experience,
    };
  } catch {
    return null;
  }
}

// ── Proxycurl: full public-profile scrape (optional) ─────────────────────────
async function proxycurl(url: string, apiKey: string): Promise<{
  title?: string; company?: string; location?: string; photo_url?: string; summary?: string;
  experience?: Array<{ title?: string; company?: string }>;
  education?: Array<{ school?: string; degree?: string }>;
  skills?: string[];
} | null> {
  try {
    const endpoint = `https://nubela.co/proxycurl/api/v2/linkedin?url=${encodeURIComponent(url)}&use_cache=if-present`;
    const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!res.ok) return null;
    const d = await res.json();
    const exp = Array.isArray(d.experiences) ? d.experiences.slice(0, 8) : [];
    const edu = Array.isArray(d.education) ? d.education.slice(0, 5) : [];
    return {
      title: exp[0]?.title || undefined,
      company: exp[0]?.company || undefined,
      location: [d.city, d.country_full_name].filter(Boolean).join(', ') || undefined,
      photo_url: d.profile_pic_url || undefined,
      summary: d.summary || undefined,
      experience: exp.map((e: Record<string, unknown>) => ({ title: e.title, company: e.company })),
      education: edu.map((e: Record<string, unknown>) => ({ school: e.school, degree: e.degree_name })),
      skills: Array.isArray(d.skills) ? d.skills.slice(0, 12) : undefined,
    };
  } catch {
    return null;
  }
}

// ── LLM: grounded one-paragraph read (lower confidence) ──────────────────────
async function llmSummary(p: { name: string; title: string | null; company: string | null; location: string | null; linkedinUrl: string | null }): Promise<string | null> {
  try {
    const system = `You write a tight, factual one-paragraph read of a professional contact for someone's personal CRM. Use ONLY the fields given; do not invent specifics (no fake employers, dates, or achievements). If there is little to go on, write a short honest sentence. Return ONLY JSON: { "summary": string }.`;
    const { content } = await chatJSON({ system, user: JSON.stringify(p), temperature: 0.3, maxTokens: 300 });
    const parsed = JSON.parse(content);
    return typeof parsed?.summary === 'string' && parsed.summary.trim() ? parsed.summary.trim() : null;
  } catch {
    return null;
  }
}

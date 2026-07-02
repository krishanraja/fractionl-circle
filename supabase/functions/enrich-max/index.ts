import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit } from '../_shared/compliance.ts';
import { chatJSON } from '../_shared/llm.ts';
import { embedPersons } from '../_shared/circleEmbed.ts';

// enrich-max: the credit-gated "10/10, leave nothing on the table" enrichment for a
// single person. Where the free enrich-linkedin tier pulls a profile from the people
// APIs, this tier runs live OPEN-WEB research (Perplexity) and synthesises what it
// finds into the dossier - the long-tail signal that LinkedIn scraping misses (press,
// talks, portfolios, sector moves). It then re-embeds the person so the richer profile
// is immediately searchable.
//
// Money-safety, in order:
//   1. If we CAN'T deliver (no research/LLM provider), return no_keys WITHOUT charging.
//   2. Spend credits ATOMICALLY before any paid call (service-role RPC; the user was
//      verified via requireAuth). Insufficient balance -> return without charging.
//   3. If the run wholly fails, REFUND the credits. The user never pays for nothing.
//
// The credit RPCs are service_role-only, so this trusted function is the only path
// that can move a user's balance - the client cannot mint or spend credits directly.

const DEEP_ENRICH_CREDITS = 20; // keep in sync with src/lib/creditCosts.ts

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const json = (data: Record<string, unknown>, cors: Record<string, string>, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

interface PersonRow {
  id: string;
  display_name: string;
  title: string | null;
  company: string | null;
  location: string | null;
  linkedin_url: string | null;
  note: string | null;
  dossier: Record<string, unknown> | null;
}

// Live open-web research about this specific person.
async function research(p: PersonRow): Promise<{ text: string; citations: string[] } | null> {
  const key = Deno.env.get('PERPLEXITY_API_KEY');
  if (!key) return null;
  const who = [p.display_name, [p.title, p.company].filter(Boolean).join(' at '), p.location].filter(Boolean).join(' - ');
  const prompt = `Find current, public professional information about this specific person for a personal CRM dossier.
PERSON: ${who}
${p.linkedin_url ? `LINKEDIN: ${p.linkedin_url}` : ''}
Report, with inline source numbers, only what you can actually find:
1. Their current role and company, and a one-line summary of what they do.
2. Notable background: past companies/roles, funds, or organisations they've been part of.
3. Sectors, domains, or communities they're active in.
4. Anything publicly notable (talks, writing, press, portfolio, investments, board seats).
If you cannot confidently identify this exact person, say so plainly rather than guessing. Never invent facts.`;
  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'sonar', messages: [{ role: 'user', content: prompt }], max_tokens: 800 }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const text: string = j.choices?.[0]?.message?.content ?? '';
    const citations: string[] = (j.citations ?? (j.search_results ?? []).map((s: { url?: string }) => s.url)).filter(Boolean);
    return text.trim() ? { text, citations } : null;
  } catch {
    return null;
  }
}

const SYNTH = `You turn live web research about a professional contact into a compact, HONEST dossier fragment for a personal CRM. You are given the research text (with source numbers) and what we already knew.

Return ONLY JSON: { "summary": string, "highlights": string[], "sectors": string[] }

Rules:
- Use ONLY facts supported by the research. Never invent employers, roles, dates, or achievements.
- "summary": 1–2 tight sentences on who they are and what they do now.
- "highlights": up to 5 short, concrete, sourced facts (past roles, notable work, affiliations). Empty array if the research is thin.
- "sectors": up to 6 short domain/industry tags they're credibly associated with.
- If the research says the person could not be confidently identified, return a short honest summary and empty arrays.`;

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const { userId, supabase } = await requireAuth(req);
    checkRateLimit(`enrich-max:${userId}`, 8, 60_000);

    const body = await req.json().catch(() => ({}));
    const personId: string = typeof body?.person_id === 'string' ? body.person_id : '';
    if (!personId) return json({ error: 'person_id required' }, cors, 400);

    // Load the person (RLS scopes to the caller).
    const { data: personData, error: personErr } = await supabase
      .from('circle_person')
      .select('id, display_name, title, company, location, linkedin_url, note, dossier')
      .eq('id', personId)
      .maybeSingle();
    if (personErr) throw personErr;
    const person = personData as PersonRow | null;
    if (!person) return json({ error: 'not found' }, cors, 404);

    // 1. Can we deliver? Need both research (Perplexity) and a synthesis LLM. If not,
    //    don't charge - the free profile enrichment still exists via enrich-linkedin.
    const hasResearch = !!Deno.env.get('PERPLEXITY_API_KEY');
    const hasLlm = !!(Deno.env.get('OPENAI_API_KEY') || Deno.env.get('LOVABLE_API_KEY') || Deno.env.get('ANTHROPIC_API_KEY'));
    if (!hasResearch || !hasLlm) return json({ status: 'no_keys' }, cors);

    // Service-role client purely for the credit RPCs (they're service_role-only). The
    // user was already verified above; we pass their id explicitly.
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 2. Spend before any paid call.
    const { data: spend } = await admin.rpc('spend_credits', {
      p_user_id: userId, p_amount: DEEP_ENRICH_CREDITS, p_reason: 'spend', p_ref: personId,
    });
    const spendRow = Array.isArray(spend) ? spend[0] : spend;
    if (!spendRow?.ok) {
      return json({ status: 'insufficient', needed: DEEP_ENRICH_CREDITS, balance: spendRow?.balance ?? 0 }, cors);
    }

    const refund = async (reason: string) => {
      const { data } = await admin.rpc('refund_credits', {
        p_user_id: userId, p_amount: DEEP_ENRICH_CREDITS, p_reason: 'refund', p_ref: personId,
      });
      return { balance: typeof data === 'number' ? data : null, reason };
    };

    // 3. Do the work; refund on any total failure.
    try {
      const r = await research(person);
      if (!r) { const b = await refund('no_research'); return json({ status: 'failed', ...b }, cors); }

      let synth: { summary?: string; highlights?: string[]; sectors?: string[] };
      try {
        const { content } = await chatJSON({
          system: SYNTH,
          user: JSON.stringify({ research: r.text, known: { name: person.display_name, title: person.title, company: person.company } }),
          temperature: 0.2, maxTokens: 500,
        });
        synth = JSON.parse(content);
      } catch {
        const b = await refund('synthesis_failed'); return json({ status: 'failed', ...b }, cors);
      }

      const webResearch = {
        summary: typeof synth.summary === 'string' ? synth.summary : '',
        highlights: Array.isArray(synth.highlights) ? synth.highlights.filter((h) => typeof h === 'string').slice(0, 5) : [],
        sectors: Array.isArray(synth.sectors) ? synth.sectors.filter((s) => typeof s === 'string').slice(0, 6) : [],
        sources: r.citations.slice(0, 8),
        researched_at: new Date().toISOString(),
      };
      const dossier = { ...(person.dossier ?? {}), web_research: webResearch };
      const sources = Array.isArray((dossier as Record<string, unknown>).sources) ? (dossier as { sources: string[] }).sources : [];
      (dossier as Record<string, unknown>).sources = Array.from(new Set([...sources, 'perplexity']));

      const update: Record<string, unknown> = { dossier, enrichment_status: 'done', enrichment_last_attempt_at: new Date().toISOString() };
      // Fold a fresh summary into the human note only if there isn't one already.
      if (!person.note && webResearch.summary) update.note = webResearch.summary;

      const { error: upErr } = await supabase.from('circle_person').update(update).eq('id', personId);
      if (upErr) { const b = await refund('save_failed'); return json({ status: 'failed', ...b }, cors); }

      // Re-embed so the richer profile is immediately searchable (best-effort).
      try { await embedPersons(supabase, [personId]); } catch { /* cron will catch it */ }

      return json({ status: 'done', dossier, balance: spendRow.balance }, cors);
    } catch (e) {
      const b = await refund('error');
      return json({ status: 'failed', reason: e instanceof Error ? e.message : 'enrich failed', ...b }, cors);
    }
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

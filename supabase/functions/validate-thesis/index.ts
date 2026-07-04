import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit } from '../_shared/compliance.ts';
import { chatJSON } from '../_shared/llm.ts';
import { loadProfileContext, profilePromptBlock, profileFactsLine } from '../_shared/profileContext.ts';
import { loadUserAiPreferences, personalitySystemSuffix } from '../_shared/aiPersonality.ts';
import { settledDecisionsBlock, newDecisionsBlock, priorReadBlock, corpusFactsBlock, type DecisionRow, type BenchmarkRow, type LandmineRow } from '../_shared/decisionContext.ts';
import { freeReadCapReached } from '../_shared/tiers.ts';

// validate-thesis: the real research harness behind the hero. Takes a fractional exec's
// thesis (+ background), runs live web research via Perplexity (sourced), then structures
// the findings into the corpus-grounded scorecard + the deconstructed steps via the
// provider-fallback LLM. Honest: bands with evidence and confidence, never fake numbers;
// low-confidence findings are flagged, not hidden. The "Can you win it" warm-reach line
// stays low-confidence until the user's network is connected (later, Apify).
//
// The read carries the user's full memory, not a cold start: the shared profile
// envelope (who they are, in their own words), decisions already settled in earlier
// reads, fresh decisions to fold in, the previous read as a movement baseline, and
// the seeded corpus benchmarks/landmines that ground flags and pricing.

async function perplexity(thesis: string, background: string, linkedin: string, identity: string): Promise<{ text: string; citations: string[] }> {
  const key = Deno.env.get('PERPLEXITY_API_KEY');
  if (!key) throw new Error('PERPLEXITY_API_KEY not set');
  const prompt = `You are validating a fractional executive's business thesis using current, real sources.
THESIS: ${thesis}
${background ? `THEIR STATED BACKGROUND: ${background}` : identity ? `WHO THEY ARE (from their profile): ${identity}` : ''}
${linkedin ? `THEIR LINKEDIN PROFILE: ${linkedin} (look up any public information about this person to assess their fit and credibility for this thesis)` : ''}
Assess concisely, with evidence and inline source numbers:
1. Demand versus supply for this SPECIFIC niche (not the broad category).
2. How crowded and competitive this exact niche is.
3. Real buyer pain and urgency, citing community discussion (Reddit, LinkedIn) where you can find it.
4. Typical monthly retainer pricing for this kind of work.
5. This person's fit and credibility for this thesis, based on any public background you can find${linkedin ? ' from their LinkedIn' : ''}.
End each point with a confidence of high, medium, or low. Be specific.`;
  const body = { model: 'sonar', messages: [{ role: 'user', content: prompt }], max_tokens: 800 };
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`perplexity ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  const text: string = j.choices?.[0]?.message?.content ?? '';
  const citations: string[] = (j.citations ?? (j.search_results ?? []).map((s: { url?: string }) => s.url)).filter(Boolean);
  return { text, citations };
}

const STRUCT_SYSTEM = `You turn live market research into an honest scorecard for a fractional executive deciding whether to pursue a thesis. You are given their thesis, their background, and sourced research.

Return ONLY JSON:
{
 "read": string,
 "from": string,
 "to": string,
 "opportunity": [ {"label": string, "band": "weak"|"mixed"|"strong"|"risk", "evidence": string, "confidence": "high"|"medium"|"low"} ],
 "ability": [ {"label": string, "band": "weak"|"mixed"|"strong"|"risk", "evidence": string, "confidence": "high"|"medium"|"low"} ],
 "case_against": string,
 "flags": [string],
 "steps": [ {"title": string, "why": string, "tag"?: string, "big"?: boolean} ],
 "journey": [ {"label": string, "finding": string, "source": string, "low"?: boolean} ]
}

Rules:
- "opportunity" MUST have exactly these four labels in order: "Demand", "Burning need", "Crowding", "What makes you different". Crowding is scored as a risk: high saturation = band "risk". Ground each in the research; do not invent statistics. For "What makes you different": if BUSINESSES THEY ADMIRE are given, use what they want to take from those models to articulate a sharper, more specific edge, and reference it plainly; never copy a competitor, treat any flagged competitor as the bar to beat.
- "ability" MUST have exactly these three labels in order: "Fit to you", "Warm reach", "Credibility". Score Fit and Credibility from the person's assessed background in the research and any stated background; if little public background was found, keep them at medium or low confidence and say plainly that connecting more detail would sharpen it. For "Warm reach": you are given THEIR CIRCLE. If the circle is empty, band "mixed", confidence "low", evidence telling them to connect their network. If it has people, judge how many plausibly fit the thesis's buyer (founders or leaders at the target kind of company): several clear fits = band "strong", a few = "mixed", and state how many fit. Confidence "high" only with a real circle. Never invent people not in the circle. This is the honesty rule, follow it.
- "read": one or two plain sentences, the honest overall call. No jargon, no hype.
- "from": one plain sentence on where they are now, drawn from their background. "to": one plain sentence on where this thesis takes them, their goal. Both short and concrete.
- "case_against": the single strongest evidence-backed argument AGAINST pursuing this thesis, drawn from the research or the corpus facts. One or two plain sentences, direct and specific, never softened and never generic. This is the sceptic's best shot, written so the user can answer it. If the evidence is genuinely thin on the downside, say what would most likely kill it anyway.
- "flags": 3 to 5 short "worth knowing before you commit" notes (income ramp, scope, pricing band, productization, AI risk) only where the research, the thesis, or the CORPUS BENCHMARKS support them. When a number comes from the corpus benchmarks, keep it a band and reflect its provenance tier in the wording (a survey or practitioner number reads as "typically" or "practitioners report", never as a hard fact).
- DECISIONS THEY HAVE ALREADY MADE are settled ground: build the read on top of them and never re-open, contradict, or re-ask them.
- THEIR PREVIOUS READ, when given, is the baseline: hold bands steady unless the new evidence genuinely moves them, note real movement plainly in "read", and never fabricate improvement.
- "steps": 5 small, ordered, doable moves from where they are to their first retained clients. Each "why" is one plain sentence on why it works. Mark the warm-network / referral move with "big": true (it is the strongest first-client lever). When THEIR CIRCLE contains people who fit the buyer, that big move must NAME one to three of them specifically and set "touches" to the number who fit; if the circle is empty, keep it generic and invent no names. Use "tag":"this week" on the first move.
- "journey": 5 to 6 short labels describing what the research did (reading background, sizing demand vs supply, scanning buyer pain, checking competition, mapping network, pricing), each with the one-line finding and a plain source label; mark any genuinely uncertain one with "low": true.
- Plain, humanized language. No em dashes. No exclamation marks. Bands and words, never invented precise numbers.`;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { userId, supabase } = await requireAuth(req);
    checkRateLimit(`validate-thesis:${userId}`, 5, 60_000);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const thesis: string = typeof body?.thesis === 'string' ? body.thesis.slice(0, 1000) : '';
    const background: string = typeof body?.background === 'string' ? body.background.slice(0, 1500) : '';
    const linkedin: string = typeof body?.linkedin_url === 'string' ? body.linkedin_url.slice(0, 200) : '';
    if (!thesis.trim()) {
      return new Response(JSON.stringify({ error: 'Tell me your thesis: what you want to offer, and to whom.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Server-side entitlement. The client gates deep phases for free users, but the
    // server must enforce it too or a free JWT can run unlimited paid reads via the
    // API. Free (post-trial) users get one read; then 402. Trial + Pro + Executive
    // are unlimited (getUserTier treats an active trial as pro).
    if (await freeReadCapReached(supabase, userId)) {
      return new Response(
        JSON.stringify({ error: 'Your free plan includes one read. Upgrade to Pro for unlimited reads as your plan evolves.', code: 'upgrade_required' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // The user model: the shared envelope every other AI surface already loads.
    const profile = await loadProfileContext(supabase, userId);
    const prefs = await loadUserAiPreferences(supabase, userId);

    const { data: circleRows } = await supabase.from('circle_person').select('display_name, title, company').eq('user_id', userId).limit(60);
    const circle = (circleRows ?? []).map((p: { display_name: string; title: string | null; company: string | null }) =>
      `${p.display_name}${p.title ? ', ' + p.title : ''}${p.company ? ' at ' + p.company : ''}`);

    // Businesses the user admires (from the after-read fuel panel) sharpen "What makes you different".
    const { data: inspRows } = await supabase.from('thesis_inspiration').select('name, positioning, kind, field, why').eq('user_id', userId).order('created_at', { ascending: false }).limit(8);
    const inspiration = (inspRows ?? []).map((r: { name: string | null; positioning: string | null; kind: string | null; field: string | null; why: string | null }) =>
      `${r.name}${r.kind === 'competitor' ? ' (a direct competitor, treat as the bar to beat, not a template)' : ''}${r.field ? ' (different field: ' + r.field + ', keep only the transferable part)' : ''}: positions as ${r.positioning || 'unknown'}. The user admires their ${r.why || 'approach'}.`);

    // Decisions the user has made via the proactive sharpen questions. Two kinds:
    // fresh (unapplied) decisions fold into THIS read and raise the matching bands;
    // settled (already-applied) decisions are permanent memory the read builds on,
    // so a decision made three reads ago never evaporates. Skipped questions are
    // excluded from both.
    const { data: answerRows } = await supabase.from('thesis_answers').select('id, dimension, question, answer, outcome').eq('user_id', userId).eq('status', 'answered').is('applied_at', null).order('created_at', { ascending: false }).limit(20);
    const { data: settledRows } = await supabase.from('thesis_answers').select('dimension, question, answer, outcome').eq('user_id', userId).eq('status', 'answered').not('applied_at', 'is', null).order('created_at', { ascending: false }).limit(15);

    // The previous read is the movement baseline (thesis_runs keeps full history;
    // this is the first surface that reads it back).
    const { data: priorRun } = await supabase.from('thesis_runs').select('result').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle();

    // Seeded corpus reference facts (shared, read-only tables): pricing/ramp bands
    // with honest provenance tiers, plus the named failure modes for this path.
    const roleToFn: Record<string, string> = { cmo: 'marketing', cfo: 'finance', cro: 'revenue' };
    const fn = profile?.role ? roleToFn[profile.role] ?? null : null;
    let benchQuery = supabase.from('benchmarks').select('metric, value_low, value_mid, value_high, unit, source_tier').limit(20);
    benchQuery = fn ? benchQuery.or(`function.is.null,function.eq.${fn}`) : benchQuery.is('function', null);
    const { data: benchRows } = await benchQuery;
    const { data: landmineRows } = await supabase.from('landmines').select('name, description, survivor_pattern').limit(10);

    const research = await perplexity(thesis, background, linkedin, profileFactsLine(profile));

    const contextBlocks = [
      `THESIS: ${thesis}`,
      `BACKGROUND: ${background || '(not provided)'}`,
      settledDecisionsBlock((settledRows ?? []) as DecisionRow[]),
      newDecisionsBlock((answerRows ?? []) as DecisionRow[]),
      priorReadBlock(priorRun?.result),
      corpusFactsBlock((benchRows ?? []) as BenchmarkRow[], (landmineRows ?? []) as LandmineRow[]),
      `THEIR CIRCLE (${circle.length} people):\n${circle.length ? circle.join('\n') : '(none connected yet)'}`,
      `BUSINESSES THEY ADMIRE (${inspiration.length}):\n${inspiration.length ? inspiration.join('\n') : '(none added yet)'}`,
      `SOURCED RESEARCH:\n${research.text}`,
    ].filter(Boolean);

    let parsed: Record<string, unknown>;
    try {
      const { content } = await chatJSON({
        system: STRUCT_SYSTEM + profilePromptBlock(profile) + personalitySystemSuffix(prefs?.ai_personality),
        user: contextBlocks.join('\n\n'),
        temperature: 0.2,
      });
      parsed = JSON.parse(content);
    } catch (e) {
      return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'structuring failed' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // The case against is honesty-critical: render it only when the model gave a real one.
    if (typeof parsed.case_against !== 'string' || !(parsed.case_against as string).trim()) delete parsed.case_against;

    const result = { ...parsed, citations: research.citations };
    await supabase.from('thesis_runs').insert({ user_id: userId, thesis, background: background || null, result });
    // Mark the clarifications this read folded in, so they stop adding provisional
    // lift and the next question moves on.
    if (answerRows?.length) {
      const ids = (answerRows as Array<{ id: string }>).map((a) => a.id);
      await supabase.from('thesis_answers').update({ applied_at: new Date().toISOString() }).in('id', ids);
    }
    return new Response(JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

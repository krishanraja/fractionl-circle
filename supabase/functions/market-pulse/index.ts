import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit } from '../_shared/compliance.ts';
import { chatJSON } from '../_shared/llm.ts';
import { roleFromThesis } from '../_shared/pulseFacts.ts';

// market-pulse: the live "market movement" instrument for the command-center Home, fed by
// the sister product fractionl-pulse (public, no-auth APIs). Role-level (Pulse is not
// niche-grained): we derive the user's fractional role from their plan, then pull the
// overall Fractional Working Index (score + 30-day move + demand/supply/culture breakdown),
// the role's demand band, rank among the tracked roles and this-week human read, and the
// top rising themes (role-matched first, each with its summary). Pulse refreshes daily, so
// this genuinely moves "overnight". Robust by construction: any Pulse call can fail and we
// still return what we have.

const PULSE = 'https://dtlcprcpvdomrehbejhw.supabase.co/functions/v1';

// The role mapping lives in _shared/pulseFacts.ts, shared with the weekly
// chief-of-staff brief so both read Pulse the same way.

function toNum(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function roundOrNull(v: unknown): number | null {
  const n = toNum(v);
  return n != null ? Math.round(n) : null;
}

// From the meta scale string ("0-100: <30 Contracting · 30-44 Cooling · 45-59
// Stable · …") pull the band segment matching this week's label, e.g. "45-59 Stable".
function bandLegend(scale: unknown, label: unknown): string | null {
  if (typeof scale !== 'string' || typeof label !== 'string') return null;
  const seg = scale.split('·').map((s) => s.trim()).find((s) => s.toLowerCase().includes(label.toLowerCase()));
  return seg ? seg.replace(/^0-100:\s*/, '').trim() : null;
}

async function getJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { userId } = await requireAuth(req);
    checkRateLimit(`market-pulse:${userId}`, 30, 60_000);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const thesis: string = typeof body?.thesis === 'string' ? body.thesis : '';
    const role = roleFromThesis(thesis);

    const [cur, roles, radar, hist] = await Promise.all([
      getJson(`${PULSE}/fwi-api/current`),
      getJson(`${PULSE}/fwi-roles`),
      getJson(`${PULSE}/content-api/radar`),
      getJson(`${PULSE}/fwi-api/history?months=3`),
    ]);

    // Real 30-day change for each FWI component, from the daily history - this is what
    // powers the colour-coded arrows (only the overall index carries its own delta).
    const histRows: any[] = Array.isArray(hist?.history) ? hist.history : [];
    const delta30 = (field: string): number | null => {
      if (histRows.length < 2) return null;
      const latest = histRows[histRows.length - 1];
      const t = new Date(latest?.date ?? '').getTime();
      if (!Number.isFinite(t)) return null;
      let prior = histRows[0];
      for (const p of histRows) {
        const pt = new Date(p?.date ?? '').getTime();
        if (Number.isFinite(pt) && pt <= t - 30 * 86_400_000) prior = p; else break;
      }
      const a = toNum(latest?.[field]); const b = toNum(prior?.[field]);
      if (a == null || b == null) return null;
      return Math.round((a - b) * 10) / 10;
    };

    // overall market - score, 30-day move, and the demand/supply/culture breakdown
    // that explains WHY the score is where it is (all already in fwi-api/current).
    let market:
      | { score: number; label: string; delta: number | null; emoji: string | null; scale: string | null; components: { demand: number | null; supply: number | null; culture: number | null } | null }
      | null = null;
    if (cur?.score) {
      const comp = cur.score.components ?? null;
      const compOut = comp
        ? {
            demand: roundOrNull(comp.demand?.score),
            supply: roundOrNull(comp.supply?.score),
            culture: roundOrNull(comp.culture?.score),
          }
        : null;
      market = {
        score: Math.round(cur.score.overall),
        label: cur.score.label,
        delta: toNum(cur.score.delta30d) != null ? Math.round(cur.score.delta30d * 10) / 10 : null,
        emoji: typeof cur.score.emoji === 'string' ? cur.score.emoji : null,
        // the band legend for this score, pulled from the meta scale string
        scale: bandLegend(cur?.meta?.scale, cur.score.label),
        components: compOut && (compOut.demand != null || compOut.supply != null || compOut.culture != null) ? compOut : null,
      };
    }

    // the user's role: demand band + rank among all roles + this-week human read.
    let roleOut:
      | { key: string; label: string; demand: number | null; band: string | null; deltaPct: number | null; rank: number | null; total: number | null; insight: string | null }
      | null = null;
    if (role) {
      const roleList: any[] = Array.isArray(roles?.roles) ? roles.roles : [];
      const rr = roleList.find((r: any) => r.role === role.key) ?? null;
      const mv = Array.isArray(cur?.topMovers) ? cur.topMovers.find((m: any) => m.signalType === 'demand' && typeof m.role === 'string' && m.role.toLowerCase().includes(role.key)) : null;
      // rank by demand (highest demand = 1st), so we can say "3rd of 6 roles".
      let rank: number | null = null;
      const total = roleList.length || null;
      if (rr && toNum(rr.demand) != null) {
        const ranked = roleList
          .filter((r: any) => toNum(r.demand) != null)
          .sort((a: any, b: any) => b.demand - a.demand);
        const idx = ranked.findIndex((r: any) => r.role === role.key);
        if (idx >= 0) rank = idx + 1;
      }
      roleOut = {
        key: role.key, label: role.label,
        demand: rr && toNum(rr.demand) != null ? Math.round(rr.demand) : null,
        band: rr?.band ?? null,
        deltaPct: mv && toNum(mv.changePct) != null ? Math.round(mv.changePct * 10) / 10 : null,
        rank, total,
        insight: mv && typeof mv.insight === 'string' ? mv.insight : null,
      };
    }

    // Which roles are fractionalising - the whole role board, hottest first. Grounds
    // the "which roles are heating up" question and the synthesis below.
    const roleLandscape = (Array.isArray(roles?.roles) ? roles.roles : [])
      .filter((r: any) => toNum(r.demand) != null)
      .sort((a: any, b: any) => b.demand - a.demand)
      .map((r: any) => ({ label: String(r.label || r.role), demand: Math.round(r.demand), band: r.band ?? null }));

    // The radar's rising topics, role-matched first - the raw material + a graceful
    // fallback if the strategic synthesis call is unavailable.
    const topics: any[] = Array.isArray(radar?.rising_topics) ? radar.rising_topics : [];
    const matched = role ? topics.filter((t: any) => typeof t.role === 'string' && t.role.includes(role.key)) : [];
    const general = topics.filter((t: any) => !matched.includes(t));
    const baseThemes: Array<{ label: string; summary: string | null; breakout: boolean; angle?: string | null }> =
      [...matched, ...general].slice(0, 3)
        .map((t: any) => ({ label: t?.label ?? null, summary: typeof t?.summary === 'string' ? t.summary : null, breakout: !!t?.is_breakout }))
        .filter((t) => t.label);
    const rising = baseThemes[0]?.label ?? null;

    // ONE strategic synthesis: role-tailored metric insights + three SPECIFIC, grounded
    // trends that answer the operator's real questions (which roles are fractionalising,
    // what businesses are hiring, where THEIR function has an opening). Numbers all come
    // from the data we pass - the model only writes the strategic read, never figures.
    const roleName = roleOut?.label ? `fractional ${roleOut.label}` : 'fractional executive';
    const metricInsights: Record<string, string> = {};
    let strategicThemes: Array<{ label: string; summary: string; angle: string; breakout: boolean }> = [];
    try {
      const sys = `You are a sharp market strategist briefing a ${roleName} in plain English. Using ONLY the data given (never invent figures), produce SPECIFIC, STRATEGIC reads for THIS person - no vague platitudes, no generic "fractional vs full-time" filler.

Return ONLY JSON:
{
  "insights": {
    "demand": string,      // are companies hiring fractional execs, and who? (the pipeline is led by VC-backed startups: SEC Form D fundraising filings run 1-3 months ahead of hires)
    "role": string,        // where ${roleName} demand sits versus the other roles, and what that means for them
    "competition": string, // what the talent-supply move means for standing out
    "buzz": string         // what the awareness move means for being visible now
  },
  "themes": [              // EXACTLY 3, tailored to a ${roleName}, each answering a strategic question, grounded in the data
    { "label": string, "summary": string, "angle": string, "breakout": boolean }
  ]
}
The three themes must cover: (1) which roles are fractionalising fastest and what it signals for a ${roleName}; (2) what kinds of businesses are hiring fractional execs right now (VC-backed startups / recently funded scaleups per the Form D lead) and how a ${roleName} reaches them; (3) a concrete opening for a ${roleName} this week. Each: "label" max 60 chars; "summary" max 200 chars, plain and specific; "angle" one concrete action max 140 chars. No jargon, no em dashes.`;
      const usr = JSON.stringify({
        role: roleName,
        market: market ? { score: market.score, label: market.label, delta30d: market.delta } : null,
        components: market?.components ?? null,
        componentMoves30d: { demand: delta30('demand'), supply: delta30('supply'), culture: delta30('culture') },
        yourRole: roleOut ? { label: roleOut.label, demand: roleOut.demand, band: roleOut.band, rank: roleOut.rank, of: roleOut.total, weekMove: roleOut.deltaPct } : null,
        roleLandscape,
        buyerSignal: 'Fractional demand is led by VC-backed startups: SEC Form D fundraising filings run 1-3 months ahead of fractional hires.',
        radarTopics: baseThemes.map((t) => ({ label: t.label, summary: t.summary })),
        risingQuestions: Array.isArray(radar?.breakout_questions) ? radar.breakout_questions.slice(0, 5) : [],
      });
      const { content } = await chatJSON({ system: sys, user: usr, temperature: 0.5, maxTokens: 900 });
      const parsed = JSON.parse(content);
      if (parsed?.insights && typeof parsed.insights === 'object') {
        // Generous caps: guard against a runaway model, never clip a real insight
        // mid-sentence (the Pulse cards wrap now - no ellipsis truncation).
        for (const k of ['demand', 'role', 'competition', 'buzz']) {
          if (typeof parsed.insights[k] === 'string' && parsed.insights[k].trim()) metricInsights[k] = parsed.insights[k].trim().slice(0, 400);
        }
      }
      if (Array.isArray(parsed?.themes)) {
        strategicThemes = parsed.themes.slice(0, 3).map((t: any) => ({
          label: typeof t?.label === 'string' ? t.label.trim().slice(0, 140) : '',
          summary: typeof t?.summary === 'string' ? t.summary.trim().slice(0, 400) : '',
          angle: typeof t?.angle === 'string' ? t.angle.trim().slice(0, 300) : '',
          breakout: !!t?.breakout,
        })).filter((t: any) => t.label && t.summary);
      }
    } catch (_e) { /* fall back to plain insights + the radar themes below */ }

    // Deterministic fallback insights so the metric rail always reads sensibly.
    const fb = (k: string): string => {
      if (k === 'demand') return 'Companies are still hiring fractional execs; the pipeline is led by recently funded startups.';
      if (k === 'role') return roleOut?.band ? `Demand for fractional ${roleOut.label}s is ${String(roleOut.band).toLowerCase()} right now.` : 'Name your role in your plan to see demand for what you do.';
      if (k === 'competition') return 'More operators are entering - a sharp niche is how you stand out.';
      return 'Awareness is steady - a good time to be visible with a point of view.';
    };
    const ins = (k: string): string => metricInsights[k] || fb(k);

    // The eye-catching metric rail: a value + a real 30-day arrow (where we have one) +
    // a strategic one-liner. positiveWhenUp drives arrow colour (supply rising means MORE
    // competition, so "up" is not good there).
    const c = market?.components ?? null;
    const metrics: Array<{ key: string; label: string; value: string; delta: number | null; deltaSuffix: string; positiveWhenUp: boolean; insight: string }> = [];
    if (c?.demand != null) metrics.push({ key: 'demand', label: 'Companies hiring', value: String(c.demand), delta: delta30('demand'), deltaSuffix: '', positiveWhenUp: true, insight: ins('demand') });
    if (roleOut) metrics.push({ key: 'role', label: `Demand for ${roleOut.label}s`, value: roleOut.demand != null ? String(roleOut.demand) : (roleOut.band ?? '-'), delta: roleOut.deltaPct, deltaSuffix: '%', positiveWhenUp: true, insight: ins('role') });
    else if (market) metrics.push({ key: 'market', label: 'Fractional market', value: String(market.score), delta: market.delta, deltaSuffix: '', positiveWhenUp: true, insight: ins('role') });
    if (c?.supply != null) metrics.push({ key: 'competition', label: 'Competition', value: String(c.supply), delta: delta30('supply'), deltaSuffix: '', positiveWhenUp: false, insight: ins('competition') });
    if (c?.culture != null) metrics.push({ key: 'buzz', label: 'Market buzz', value: String(c.culture), delta: delta30('culture'), deltaSuffix: '', positiveWhenUp: true, insight: ins('buzz') });

    // Prefer the strategic trends; fall back to the radar-derived set so there's always
    // something to attach to.
    const outThemes = strategicThemes.length
      ? strategicThemes.map((t) => ({ label: t.label, summary: t.summary, breakout: t.breakout, angle: t.angle || null }))
      : (baseThemes.length ? baseThemes : null);

    const asOf = cur?.meta?.asOf ?? radar?.meta?.week_start ?? null;
    const nextUpdate = typeof cur?.meta?.nextUpdate === 'string' ? cur.meta.nextUpdate : null;
    return new Response(JSON.stringify({ market, role: roleOut, rising, metrics, themes: outThemes, roleLandscape, asOf, nextUpdate }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

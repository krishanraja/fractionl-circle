import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit } from '../_shared/compliance.ts';
import { chatJSON } from '../_shared/llm.ts';

// market-pulse: the live "market movement" instrument for the command-center Home, fed by
// the sister product fractionl-pulse (public, no-auth APIs). Role-level (Pulse is not
// niche-grained): we derive the user's fractional role from their plan, then pull the
// overall Fractional Working Index (score + 30-day move + demand/supply/culture breakdown),
// the role's demand band, rank among the tracked roles and this-week human read, and the
// top rising themes (role-matched first, each with its summary). Pulse refreshes daily, so
// this genuinely moves "overnight". Robust by construction: any Pulse call can fail and we
// still return what we have.

const PULSE = 'https://dtlcprcpvdomrehbejhw.supabase.co/functions/v1';

// Map the user's plan text to one of Pulse's six tracked fractional exec roles.
// Pulse is role-grained (not niche-grained), so we deliberately only match the six
// it tracks; genuinely different functions stay unmatched (the client shows an
// honest "add your role focus" state rather than a mis-mapped role.)
function roleFromThesis(t: string): { key: string; label: string } | null {
  const s = (t || '').toLowerCase();
  if (/\bcfo\b|finance|financial|fundrais|accounting|controller|fp&a|treasur/.test(s)) return { key: 'cfo', label: 'CFO' };
  if (/\bcmo\b|marketing|brand|demand gen|growth|content marketing|\bseo\b|advertising|paid media|lifecycle|social media/.test(s)) return { key: 'cmo', label: 'CMO' };
  if (/\bcto\b|engineering|technical|technology|head of product|fractional product|software|developer|devops|platform|infrastructure|\bai\b|machine learning|\bml\b|data engineer/.test(s)) return { key: 'cto', label: 'CTO' };
  if (/\bcoo\b|operations|\bops\b|operational|process|supply chain|chief of staff|program management/.test(s)) return { key: 'coo', label: 'COO' };
  if (/\bcro\b|revenue|\bsales\b|go-to-market|\bgtm\b|business development|bizdev|partnerships/.test(s)) return { key: 'cro', label: 'CRO' };
  if (/\bceo\b|interim ceo|general manager|managing director/.test(s)) return { key: 'ceo', label: 'CEO' };
  return null;
}

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

    const [cur, roles, radar] = await Promise.all([
      getJson(`${PULSE}/fwi-api/current`),
      getJson(`${PULSE}/fwi-roles`),
      getJson(`${PULSE}/content-api/radar`),
    ]);

    // overall market — score, 30-day move, and the demand/supply/culture breakdown
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

    // rising themes, role-matched first — up to three, each with its summary sentence
    // so the drawer reads as real insight rather than a bare tag.
    const topics: any[] = Array.isArray(radar?.rising_topics) ? radar.rising_topics : [];
    const matched = role ? topics.filter((t: any) => typeof t.role === 'string' && t.role.includes(role.key)) : [];
    const general = topics.filter((t: any) => !matched.includes(t));
    const ordered = [...matched, ...general].slice(0, 3);
    const themes: Array<{ label: string; summary: string | null; breakout: boolean; angle?: string | null }> = ordered.map((t: any) => ({
      label: t?.label ?? null,
      summary: typeof t?.summary === 'string' ? t.summary : null,
      breakout: !!t?.is_breakout,
    })).filter((t) => t.label);
    const rising = themes[0]?.label ?? null;

    // Turn each rising theme into ONE concrete "your angle" for the operator's role —
    // the layperson's "what do I do with this?". A bonus: any failure (no key, bad
    // JSON) just omits angles and the themes still ship with their descriptions.
    if (themes.length) {
      try {
        const roleLabel = roleOut?.label ? `fractional ${roleOut.label}` : 'fractional executive';
        const sys = `You help a ${roleLabel} turn market trends into ONE concrete action they can take this week. For each trend give "angle": one short sentence (max 140 chars) on how THEY could attach to it — post a take on LinkedIn, raise it in a client conversation, or work it into their pitch. Plain and specific, no jargon, no em dashes. Return ONLY JSON { "angles": [ { "label": string, "angle": string } ] }, echoing each label exactly.`;
        const usr = JSON.stringify({ role: roleLabel, trends: themes.map((t) => ({ label: t.label, summary: t.summary })) });
        const { content } = await chatJSON({ system: sys, user: usr, temperature: 0.5, maxTokens: 400 });
        const parsed = JSON.parse(content);
        const byLabel = new Map<string, string>();
        for (const a of (Array.isArray(parsed?.angles) ? parsed.angles : [])) {
          if (a?.label && typeof a?.angle === 'string' && a.angle.trim()) byLabel.set(String(a.label), a.angle.trim().slice(0, 160));
        }
        for (const t of themes) t.angle = byLabel.get(t.label) ?? null;
      } catch (_e) { /* angles are a bonus; themes still ship without them */ }
    }

    const asOf = cur?.meta?.asOf ?? radar?.meta?.week_start ?? null;
    const nextUpdate = typeof cur?.meta?.nextUpdate === 'string' ? cur.meta.nextUpdate : null;
    return new Response(JSON.stringify({ market, role: roleOut, rising, themes: themes.length ? themes : null, asOf, nextUpdate }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

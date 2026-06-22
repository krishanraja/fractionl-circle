import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit } from '../_shared/compliance.ts';

// market-pulse: the live "market movement" instrument for the command-center Home, fed by
// the sister product fractionl-pulse (public, no-auth APIs). Role-level (Pulse is not
// niche-grained): we derive the user's fractional role from their thesis, then pull the
// overall Fractional Working Index, the role's demand band + this-week mover, and a rising
// topic for that role. Pulse refreshes daily, so this genuinely moves "overnight". Robust
// by construction: any Pulse call can fail and we still return what we have.

const PULSE = 'https://dtlcprcpvdomrehbejhw.supabase.co/functions/v1';

function roleFromThesis(t: string): { key: string; label: string } | null {
  const s = (t || '').toLowerCase();
  if (/\bcfo\b|finance|financial|fractional finance/.test(s)) return { key: 'cfo', label: 'CFO' };
  if (/\bcmo\b|marketing|brand|demand gen|growth/.test(s)) return { key: 'cmo', label: 'CMO' };
  if (/\bcto\b|engineering|technical|technology|head of product|fractional product/.test(s)) return { key: 'cto', label: 'CTO' };
  if (/\bcoo\b|operations|\bops\b/.test(s)) return { key: 'coo', label: 'COO' };
  if (/\bcro\b|revenue|\bsales\b/.test(s)) return { key: 'cro', label: 'CRO' };
  if (/\bceo\b|interim ceo/.test(s)) return { key: 'ceo', label: 'CEO' };
  return null;
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

    // overall market
    let market: { score: number; label: string; delta: number | null } | null = null;
    if (cur?.score) market = { score: Math.round(cur.score.overall), label: cur.score.label, delta: typeof cur.score.delta30d === 'number' ? Math.round(cur.score.delta30d * 10) / 10 : null };

    // the user's role: demand band (fwi-roles) + this-week mover (current.topMovers)
    let roleOut: { key: string; label: string; demand: number | null; band: string | null; deltaPct: number | null } | null = null;
    if (role) {
      const rr = Array.isArray(roles?.roles) ? roles.roles.find((r: any) => r.role === role.key) : null;
      const mv = Array.isArray(cur?.topMovers) ? cur.topMovers.find((m: any) => m.signalType === 'demand' && typeof m.role === 'string' && m.role.toLowerCase().includes(role.key)) : null;
      roleOut = {
        key: role.key, label: role.label,
        demand: rr && typeof rr.demand === 'number' ? Math.round(rr.demand) : null,
        band: rr?.band ?? null,
        deltaPct: mv && typeof mv.changePct === 'number' ? Math.round(mv.changePct * 10) / 10 : null,
      };
    }

    // a rising topic, role-matched where possible
    let rising: string | null = null;
    const topics = Array.isArray(radar?.rising_topics) ? radar.rising_topics : [];
    if (topics.length) {
      const match = role ? topics.find((t: any) => typeof t.role === 'string' && t.role.includes(role.key)) : null;
      rising = (match || topics[0])?.label ?? null;
    }

    const asOf = cur?.meta?.asOf ?? radar?.meta?.week_start ?? null;
    return new Response(JSON.stringify({ market, role: roleOut, rising, asOf }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

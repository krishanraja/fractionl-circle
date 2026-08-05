// Compact, deterministic market facts from the sister product fractionl-pulse
// (public, no-auth APIs). Shared by market-pulse (the Home instrument, which adds
// an LLM synthesis on top) and the weekly chief-of-staff brief (which wants only
// honest numbers, no synthesis call). Every fetch is best-effort: any Pulse call
// can fail and callers still render what they have.

// deno-lint-ignore-file no-explicit-any

const PULSE = 'https://dtlcprcpvdomrehbejhw.supabase.co/functions/v1';

// Map the user's plan text to one of Pulse's six tracked fractional exec roles.
// Pulse is role-grained (not niche-grained), so we deliberately only match the six
// it tracks; genuinely different functions stay unmatched (callers show an honest
// "add your role focus" state rather than a mis-mapped role).
export function roleFromThesis(t: string): { key: string; label: string } | null {
  const s = (t || '').toLowerCase();
  if (/\bcfo\b|finance|financial|fundrais|accounting|controller|fp&a|treasur/.test(s)) return { key: 'cfo', label: 'CFO' };
  if (/\bcmo\b|marketing|brand|demand gen|growth|content marketing|\bseo\b|advertising|paid media|lifecycle|social media/.test(s)) return { key: 'cmo', label: 'CMO' };
  if (/\bcto\b|engineering|technical|technology|head of product|fractional product|software|developer|devops|platform|infrastructure|\bai\b|machine learning|\bml\b|data engineer/.test(s)) return { key: 'cto', label: 'CTO' };
  if (/\bcoo\b|operations|\bops\b|operational|process|supply chain|chief of staff|program management/.test(s)) return { key: 'coo', label: 'COO' };
  if (/\bcro\b|revenue|\bsales\b|go-to-market|\bgtm\b|business development|bizdev|partnerships/.test(s)) return { key: 'cro', label: 'CRO' };
  if (/\bceo\b|interim ceo|general manager|managing director/.test(s)) return { key: 'ceo', label: 'CEO' };
  return null;
}

async function getJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export interface PulseFacts {
  // Overall Fractional Working Index this week, with the real 30-day move.
  market: { score: number; label: string; delta: number | null } | null;
  // The user's role: demand + rank among tracked roles.
  role: { label: string; demand: number | null; band: string | null; rank: number | null; total: number | null } | null;
  asOf: string | null;
}

// The cheap read: two GETs, zero LLM. Numbers only, straight from Pulse.
export async function fetchPulseFacts(thesis: string): Promise<PulseFacts> {
  const role = roleFromThesis(thesis);
  const [cur, roles] = await Promise.all([
    getJson(`${PULSE}/fwi-api/current`),
    getJson(`${PULSE}/fwi-roles`),
  ]);

  const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

  let market: PulseFacts['market'] = null;
  if (cur?.score && num(cur.score.overall) != null) {
    market = {
      score: Math.round(cur.score.overall),
      label: String(cur.score.label ?? ''),
      delta: num(cur.score.delta30d) != null ? Math.round(cur.score.delta30d * 10) / 10 : null,
    };
  }

  let roleOut: PulseFacts['role'] = null;
  if (role) {
    const roleList: any[] = Array.isArray(roles?.roles) ? roles.roles : [];
    const rr = roleList.find((r: any) => r.role === role.key) ?? null;
    let rank: number | null = null;
    const total = roleList.length || null;
    if (rr && num(rr.demand) != null) {
      const ranked = roleList.filter((r: any) => num(r.demand) != null).sort((a: any, b: any) => b.demand - a.demand);
      const idx = ranked.findIndex((r: any) => r.role === role.key);
      if (idx >= 0) rank = idx + 1;
    }
    roleOut = {
      label: role.label,
      demand: rr && num(rr.demand) != null ? Math.round(rr.demand) : null,
      band: rr?.band ?? null,
      rank, total,
    };
  }

  return { market, role: roleOut, asOf: cur?.meta?.asOf ?? null };
}

// Plain-language lines for an email body. Empty array when Pulse was unreachable,
// so the brief simply omits the market section rather than faking one.
export function pulseFactLines(f: PulseFacts): string[] {
  const lines: string[] = [];
  if (f.market) {
    const move = f.market.delta != null
      ? ` (${f.market.delta > 0 ? 'up' : f.market.delta < 0 ? 'down' : 'flat'} ${Math.abs(f.market.delta)} in 30 days)`
      : '';
    lines.push(`The fractional market reads ${f.market.score} - ${f.market.label}${move}.`);
  }
  if (f.role) {
    const rank = f.role.rank && f.role.total ? `, ${ordinal(f.role.rank)} of ${f.role.total} tracked roles` : '';
    if (f.role.demand != null) lines.push(`Demand for fractional ${f.role.label}s: ${f.role.demand}${rank}${f.role.band ? ` (${String(f.role.band).toLowerCase()})` : ''}.`);
    else if (f.role.band) lines.push(`Demand for fractional ${f.role.label}s is ${String(f.role.band).toLowerCase()}${rank}.`);
  }
  return lines;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

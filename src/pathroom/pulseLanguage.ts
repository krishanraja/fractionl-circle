// Turns the raw Pulse market data into plain English for a time-poor, non-technical
// fractional operator. Pure + deterministic (no Date.now, no I/O) so it's easy to test
// and the drawer stays a dumb renderer. The numbers still exist behind a "see the
// numbers" toggle — this is the translation layer that leads with meaning.
import type { MarketPulse } from './thesisData';

export type Sentiment = 'good' | 'steady' | 'soft';

// Pulse's band vocabulary, weakest → strongest, and the plain phrase for each.
const BAND_RANK: Record<string, number> = { contracting: 0, cooling: 1, stable: 2, growing: 3, surging: 4 };
const BAND_BASE: Record<string, string> = {
  contracting: 'cooling down',
  cooling: 'a little quiet',
  stable: 'steady',
  growing: 'picking up',
  surging: 'running hot',
};

const key = (label?: string | null): string => (label || '').trim().toLowerCase();

// The 30-day move, in words. A small band around 0 is "holding" — we drop the
// clause entirely then, since the base level already says it (avoids "steady, and
// holding steady").
function trendPhrase(delta: number | null | undefined): string {
  if (delta == null) return '';
  if (delta >= 2) return 'and clearly on the rise';
  if (delta >= 0.5) return 'and edging up';
  if (delta <= -2) return 'and cooling';
  if (delta <= -0.5) return 'and easing off a touch';
  return '';
}

export interface MarketVerdict { sentence: string; followLine: string; sentiment: Sentiment }

// "The fractional market is steady, and edging up this month." + a plain follow-line.
export function marketVerdict(m: MarketPulse['market']): MarketVerdict | null {
  if (!m) return null;
  const k = key(m.label);
  const base = BAND_BASE[k] ?? (m.label ? m.label.toLowerCase() : 'steady');
  const rank = BAND_RANK[k] ?? 2;
  const delta = m.delta ?? null;
  const trend = trendPhrase(delta);
  const sentence = `The fractional market is ${base}${trend ? ', ' + trend : ''} this month.`;

  let sentiment: Sentiment;
  if (rank >= 3 || (rank === 2 && (delta ?? 0) >= 0.5)) sentiment = 'good';
  else if (rank <= 1 || (delta ?? 0) <= -0.5) sentiment = 'soft';
  else sentiment = 'steady';

  const followLine =
    sentiment === 'good' ? 'A good week to be putting yourself out there.'
    : sentiment === 'soft' ? 'Worth being proactive — lean on warm introductions right now.'
    : 'A fine time to keep your name in front of people.';

  return { sentence, followLine, sentiment };
}

function rankPhrase(rank?: number | null, total?: number | null): string {
  if (rank == null || total == null || total <= 0) return '';
  if (rank <= 2) return 'one of the most in-demand roles right now';
  if (rank <= Math.ceil(total / 2)) return 'right around the middle of the pack';
  return 'quieter than most roles right now';
}

function moveWord(deltaPct?: number | null): string {
  if (deltaPct == null) return '';
  if (deltaPct >= 1) return 'and rising';
  if (deltaPct <= -1) return 'and slipping a little';
  return '';
}

export interface RoleVerdict { sentence: string; meaning: string; sentiment: Sentiment }

// "Demand for fractional CMOs is steady — one of the most in-demand roles right now."
// plus a one-line read on what that means for the operator.
export function roleVerdict(role: MarketPulse['role']): RoleVerdict | null {
  if (!role) return null;
  const k = key(role.band);
  const base = BAND_BASE[k] ?? (role.band ? role.band.toLowerCase() : 'steady');
  const move = moveWord(role.deltaPct);
  const rankp = rankPhrase(role.rank, role.total);

  let sentence = `Demand for fractional ${role.label}s is ${base}`;
  if (move) sentence += ` ${move}`;
  if (rankp) sentence += ` — ${rankp}`;
  sentence += '.';

  const rank = BAND_RANK[k] ?? 2;
  const topRanked = role.rank != null && role.rank <= 2;
  let sentiment: Sentiment;
  if (topRanked || rank >= 3) sentiment = 'good';
  else if (rank <= 1 || (role.deltaPct ?? 0) <= -1) sentiment = 'soft';
  else sentiment = 'steady';

  const meaning =
    sentiment === 'good' ? 'A good sign for what you offer — buyers are out there.'
    : sentiment === 'soft' ? 'Quieter than usual — warm introductions will beat cold outreach.'
    : 'Steady enough to keep selling — just stay visible.';

  return { sentence, meaning, sentiment };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "2026-07-02" (or a full ISO) → "2 Jul". Parses the string directly to stay
// timezone-safe and free of Date.now.
export function shortDate(iso?: string | null): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const month = MONTHS[parseInt(m[2], 10) - 1];
  const day = parseInt(m[3], 10);
  return month ? `${day} ${month}` : null;
}

// A plain badge for a rising theme: breakout themes are "taking off", the rest "trending".
export function trendBadge(breakout?: boolean): string {
  return breakout ? 'taking off' : 'trending';
}

// The Path Room client engine. Deterministic-over-data: given the user's Read and
// the seeded shared-reference tables, it computes the SessionRead (path + gap +
// fork + ledger) with no LLM. The LLM-backed inference (extract-read) and reasoning
// (decision-engine) are P0.5; P0 runs on this + the corpus seed.

export type Segment = 'new' | 'seasoned' | 'lifestyle';
export type ForkDomain = 'offer_pricing' | 'icp_positioning' | 'network_strategy' | 'scaling_leverage';

export interface TheRead {
  user_id: string;
  segment: Segment | null;
  function: string | null;
  niche: string | null;
  stage: string | null;
  client_count: number | null;
  current_position: string | null;
  lit_fork_domain: ForkDomain | null;
  hold_position: boolean;
  offer_one_liner: string | null;
  inner_circle?: unknown;
  inner_circle_fork?: string | null;
}
export interface Benchmark {
  metric: string; function: string | null; niche: string | null; stage: string | null;
  value_low: number | null; value_mid: number | null; value_high: number | null;
  unit: string | null; source_tier: 'hard_telemetry' | 'survey' | 'expert_opinion';
}
export interface Landmine {
  fork_domain: string | null; trigger_position: string | null; name: string; description: string | null; survivor_pattern: string | null;
}
export interface Cohort {
  function: string | null; niche: string | null; fork_domain: string | null; stage_band: string | null;
  what_they_chose: string | null; what_happened: string | null; n_count: number;
}
export interface LedgerEntry {
  id: string; fork_domain: string | null; decision_one_liner: string; reasoning: string | null; outcome: string | null; committed_at: string;
}

export interface PathStage { key: string; label: string }
export interface GapRow { label: string; value: string; flag?: 'generic' | 'risk' }
export interface Branch { title: string; fit: string; benchmark: string; obstacle: string; recommended: boolean }
export interface SessionRead {
  segment: Segment;
  pathTitle: string;
  stages: PathStage[];
  markerIndex: number; // float; between-stage allowed
  litForkIndex: number;
  litFork: ForkDomain;
  litForkLabel: string;
  recognition: string;
  gap: GapRow[];
  branches: Branch[];
  benchmarkBand: { youPct: number; bandStartPct: number; youLabel: string; bandLabel: string } | null;
  landmine: { name: string; note: string } | null;
  cohortHasN: boolean; // false => "benchmark says" framing
}

const LAUNCH_STAGES: PathStage[] = [
  { key: 'exit', label: 'Exit' }, { key: 'niche', label: 'Niche' }, { key: 'offer', label: 'Offer' },
  { key: 'first_client', label: '1st client' }, { key: 'month_6', label: 'Month 6' }, { key: 'three_clients', label: '3 clients' },
];
const LEVERAGE_STAGES: PathStage[] = [
  { key: 'three_clients', label: '3 clients' }, { key: 'productize', label: 'Productize' },
  { key: 'pod', label: 'Pod' }, { key: 'equity', label: 'Equity' }, { key: 'audience', label: 'Audience' },
];

export const FORK_LABEL: Record<ForkDomain, string> = {
  offer_pricing: 'Offer & pricing',
  icp_positioning: 'Niche & positioning',
  network_strategy: 'Network strategy',
  scaling_leverage: 'Scaling & leverage',
};
// Which stage a fork lights at, per segment path.
const FORK_STAGE: Record<Segment, Partial<Record<ForkDomain, string>>> = {
  new: { icp_positioning: 'niche', offer_pricing: 'offer', network_strategy: 'first_client' },
  seasoned: { scaling_leverage: 'productize', offer_pricing: 'productize' },
  lifestyle: { scaling_leverage: 'three_clients' },
};

// The fork progression per segment: committing one fork lights the next.
export const NEXT_FORK: Record<Segment, Partial<Record<ForkDomain, ForkDomain>>> = {
  new: { icp_positioning: 'offer_pricing', offer_pricing: 'network_strategy' },
  seasoned: { scaling_leverage: 'offer_pricing' },
  lifestyle: {},
};
export const forkStageKey = (segment: Segment, fork: ForkDomain): string | undefined => FORK_STAGE[segment]?.[fork];

const num = (bms: Benchmark[], metric: string, key: 'value_low' | 'value_mid' | 'value_high' = 'value_mid'): number | null => {
  const b = bms.find((x) => x.metric === metric);
  return b ? b[key] : null;
};
const usd = (n: number | null): string => (n == null ? 'n/a' : `$${Math.round(n / 1000)}K`);

function buildGap(fork: ForkDomain, bm: Benchmark[]): GapRow[] {
  if (fork === 'icp_positioning') {
    const reach = num(bm, 'generic_positioning_reach');
    const niched = num(bm, 'time_to_three_clients_niched');
    const gen = num(bm, 'time_to_three_clients_generalist');
    return [
      { label: 'Your positioning', value: reach ? `fits ~${reach.toLocaleString()}` : 'fits everyone', flag: 'generic' },
      { label: 'Referrals firing', value: 'near zero' },
      { label: 'Time to 3 clients', value: niched && gen ? `~${niched} mo niched vs ~${gen} generalist` : 'much faster niched' },
    ];
  }
  if (fork === 'offer_pricing') {
    const lo = num(bm, 'retainer_band', 'value_low'); const mid = num(bm, 'retainer_band');
    return [
      { label: 'Your quote', value: 'hourly, under the lane' },
      { label: 'Lane retainer', value: lo && mid ? `${usd(lo)} to ${usd(num(bm, 'retainer_band', 'value_high'))}` : 'higher than you think' },
      { label: 'Fixed-scope close rate', value: `${num(bm, 'fixed_scope_close_speedup') ?? 3}x faster than hourly` },
    ];
  }
  if (fork === 'scaling_leverage') {
    return [
      { label: 'At the ceiling', value: 'months, not a hustle problem' },
      { label: 'Anchor client', value: `${Math.round((num(bm, 'anchor_concentration_risk') ?? 0.5) * 100)}% of revenue`, flag: 'risk' },
      { label: 'Model', value: 'bespoke retainers' },
    ];
  }
  return [
    { label: 'Warm channel', value: `${Math.round((num(bm, 'referral_share') ?? 0.93) * 100)}% of pipeline` },
    { label: 'Cold outreach', value: `${Math.round((num(bm, 'cold_outreach_share') ?? 0.19) * 100)}% (it does not work)` },
  ];
}

function buildBranches(fork: ForkDomain, cohort: Cohort[]): Branch[] {
  const match = cohort.filter((c) => c.fork_domain === fork);
  const rec = match[0];
  if (fork === 'icp_positioning') {
    return [
      { title: rec?.what_they_chose?.replace(/ by month four$/, '') ?? 'B2B SaaS, Series B, broken demand gen', fit: 'Where your network already concentrates.', benchmark: rec?.what_happened ?? 'Reached 3 clients about 2x faster.', obstacle: 'Crowded lane; you win on the specificity, not the title.', recommended: true },
      { title: 'PLG onboarding & activation', fit: 'Your strongest documented result.', benchmark: 'Smaller pool, faster cycle.', obstacle: 'Fewer Series-B budgets.', recommended: false },
      { title: 'Fintech growth', fit: 'A warm mirror already here.', benchmark: 'Highest retainers in your set.', obstacle: 'Least direct proof today.', recommended: false },
    ];
  }
  if (fork === 'scaling_leverage') {
    return [
      { title: 'Productize the highest-repeat engagement', fit: 'The work you have run several times.', benchmark: rec?.what_happened ?? 'Broke the ceiling without more hours.', obstacle: 'Feels less bespoke; that is the point.', recommended: true },
      { title: 'Build a 1099 associate pod', fit: 'Doubles capacity.', benchmark: 'Higher revenue, margin hit.', obstacle: 'You become a manager again.', recommended: false },
      { title: 'Trade up to fewer, higher anchors', fit: 'Less context-switching.', benchmark: 'Higher per-client, more concentration.', obstacle: 'Raises the anchor risk.', recommended: false },
    ];
  }
  if (fork === 'offer_pricing') {
    return [
      { title: 'Fixed-scope package at the lane median', fit: 'Your repeatable work, named and priced.', benchmark: rec?.what_happened ?? 'Closes ~3x faster than hourly.', obstacle: 'You will feel it is too high. It is not.', recommended: true },
      { title: 'Raise the retainer one step', fit: 'Lowest-friction move.', benchmark: 'Still under the lane median.', obstacle: 'Leaves productization upside on the table.', recommended: false },
    ];
  }
  return [
    { title: rec?.what_they_chose ?? 'Reactivate your warmest former colleagues', fit: 'Your first clients always came warm.', benchmark: rec?.what_happened ?? 'The next client comes from a referral, not cold.', obstacle: 'Feels slow; it compounds.', recommended: true },
  ];
}

export function computeSession(read: TheRead, data: { benchmarks: Benchmark[]; landmines: Landmine[]; cohort: Cohort[] }): SessionRead {
  const segment: Segment = read.segment ?? 'new';
  const stages = segment === 'seasoned' ? LEVERAGE_STAGES : LAUNCH_STAGES;
  const pathTitle = segment === 'seasoned' ? 'Leverage' : 'Launch';
  const defaultFork: ForkDomain = segment === 'seasoned' ? 'scaling_leverage' : 'icp_positioning';
  const litFork = read.lit_fork_domain ?? defaultFork;
  const litForkKey = FORK_STAGE[segment]?.[litFork];
  const litForkIndex = Math.max(0, stages.findIndex((s) => s.key === litForkKey));
  // Marker: where they are now (current_position key), default just before the lit fork's work.
  const markerKey = read.current_position;
  let markerIndex = markerKey ? stages.findIndex((s) => s.key === markerKey) : -1;
  if (markerIndex < 0) markerIndex = segment === 'seasoned' ? 0 : 3.4;

  const gap = buildGap(litFork, data.benchmarks);
  const branches = buildBranches(litFork, data.cohort);
  const cohortHasN = data.cohort.some((c) => c.fork_domain === litFork && c.n_count > 0);

  const lm = data.landmines.find((l) => (l.fork_domain === litFork) || (segment === 'new' && l.trigger_position === 'pre_second_client'));
  const landmine = lm ? { name: lm.name, note: lm.survivor_pattern ?? lm.description ?? '' } : null;

  const recognition = segment === 'seasoned'
    ? 'You have been at the ceiling for a while. The problem is structure, not sales.'
    : 'You are where most people land around month four. The first client is in, but the second will not come the same way.';

  // Benchmark band for the niche/pricing fork (you low, cohort ahead).
  const benchmarkBand = litFork === 'icp_positioning'
    ? { youPct: 14, bandStartPct: 46, youLabel: 'you', bandLabel: 'niched cohort' }
    : litFork === 'offer_pricing'
    ? { youPct: 16, bandStartPct: 52, youLabel: 'you', bandLabel: 'lane' }
    : null;

  return {
    segment, pathTitle, stages, markerIndex, litForkIndex, litFork,
    litForkLabel: FORK_LABEL[litFork], recognition, gap, branches, benchmarkBand, landmine, cohortHasN,
  };
}

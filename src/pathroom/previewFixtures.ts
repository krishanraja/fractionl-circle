// Fixtures for the interactive preview gallery. Uses the REAL engine (computeSession)
// over a small fixed dataset so the mocks match production behaviour, including the
// lifestyle / hold-position path. No Supabase, no auth: pure render fodder.
import { computeSession, type SessionRead, type TheRead, type Benchmark, type Landmine, type Cohort, type LedgerEntry } from './engine';
import type { RankedPerson, DecisionBrief } from './data';

const bm = (metric: string, value_mid: number, value_low: number | null = null, value_high: number | null = null): Benchmark =>
  ({ metric, function: null, niche: null, stage: null, value_low, value_mid, value_high, unit: null, source_tier: 'survey' });

const BENCHMARKS: Benchmark[] = [
  bm('generic_positioning_reach', 100000),
  bm('time_to_three_clients_niched', 5),
  bm('time_to_three_clients_generalist', 11),
  bm('retainer_band', 14000, 10000, 18000),
  bm('fixed_scope_close_speedup', 3),
  bm('anchor_concentration_risk', 0.5),
  bm('referral_share', 0.93),
  bm('cold_outreach_share', 0.19),
];
const LANDMINES: Landmine[] = [
  { fork_domain: 'icp_positioning', trigger_position: 'pre_second_client', name: 'The month-6 crisis', description: null, survivor_pattern: 'Survivors had a second warm conversation already moving by month four.' },
  { fork_domain: 'scaling_leverage', trigger_position: null, name: 'The three-client ceiling', description: null, survivor_pattern: 'Productised the highest-repeat engagement before adding a pod.' },
  { fork_domain: 'offer_pricing', trigger_position: null, name: 'The underpricing trap', description: null, survivor_pattern: 'Raised on renewal before resentment set in.' },
];
const COHORT: Cohort[] = []; // n=0 so the honesty gate shows "benchmark says"

const read = (over: Partial<TheRead>): TheRead => ({
  user_id: 'preview', segment: 'new', function: 'marketing', niche: null, stage: null,
  client_count: null, current_position: null, lit_fork_domain: 'icp_positioning',
  hold_position: false, offer_one_liner: null, ...over,
});

export const PREVIEW_SEGMENTS: Array<[string, string]> = [
  ['new', 'New · Launch'], ['seasoned', 'Seasoned · Leverage'], ['lifestyle', 'Lifestyle · Hold'],
];

export function previewSession(seg: string): SessionRead {
  const r = seg === 'seasoned' ? read({ segment: 'seasoned', lit_fork_domain: 'scaling_leverage', current_position: 'three_clients' })
    : seg === 'lifestyle' ? read({ segment: 'lifestyle', lit_fork_domain: 'offer_pricing' })
    : read({ segment: 'new', lit_fork_domain: 'icp_positioning' });
  return computeSession(r, { benchmarks: BENCHMARKS, landmines: LANDMINES, cohort: COHORT });
}

export const PREVIEW_RANKED: RankedPerson[] = [
  { id: '1', name: 'Liam Walsh', title: 'CEO', company: 'TechVentures Inc', role: 'PROOF', why: 'A CEO who scaled revenue without trading hours for dollars, living proof your path is viable.' },
  { id: '2', name: 'Yuki Tanaka', title: 'CMO', company: 'Acme Corp', role: 'UNLOCK', why: 'Sits inside the niche you are targeting, the warmest door to the buyer.' },
  { id: '3', name: 'Maria Santos', title: 'Co-founder', company: 'Halo AI', role: 'MIRROR', why: 'A peer one step ahead on the same path, worth comparing notes with.' },
];

export const PREVIEW_LEDGER: LedgerEntry[] = [
  { id: 'l1', fork_domain: 'icp_positioning', decision_one_liner: 'Niche and positioning: Narrowed to B2B SaaS Series B with broken demand gen', reasoning: 'The first client is in, but the second will not come the same way.', outcome: null, committed_at: '2026-06-17T10:00:00Z' },
];

export const PREVIEW_BRIEF: DecisionBrief = {
  headline: 'The real question is whether you productize the work or add a person to do it.',
  consequence: 'Committing the productized package breaks the three-client ceiling without adding hours, and turns your next decision into pricing.',
  watch_out: 'Peers underestimated the time it takes to productize, so protect the anchor client while you build it.',
  question: 'Which engagement have you run more than twice with the same shape?',
  grounded: false,
};

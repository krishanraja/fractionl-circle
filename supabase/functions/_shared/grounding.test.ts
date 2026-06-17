// Unit tests for the Match Engine grounding helpers. Pure, offline, no DB.
//   deno test supabase/functions/_shared/grounding.test.ts
import { candidateFacts, groundWarmPath, isUngroundedWarmPath, recencyDays } from './grounding.ts';

function eq(a: unknown, b: unknown, msg: string) {
  const A = JSON.stringify(a);
  const B = JSON.stringify(b);
  if (A !== B) throw new Error(`FAIL ${msg}: got ${A}, expected ${B}`);
}

Deno.test('recencyDays', () => {
  const now = Date.parse('2026-06-17T00:00:00Z');
  eq(recencyDays(null, now), null, 'null iso');
  eq(recencyDays(undefined, now), null, 'undefined iso');
  eq(recencyDays('not-a-date', now), null, 'bad iso');
  eq(recencyDays('2026-06-10T00:00:00Z', now), 7, '7 days');
});

Deno.test('candidateFacts keeps nulls and shapes the signal', () => {
  const f = candidateFacts(
    { warmth: 0.8, response_rate: null, last_interaction_at: null },
    null,
  );
  eq(f.warmth, 0.8, 'warmth');
  eq(f.response_rate, null, 'response_rate kept null');
  eq(f.recency_days, null, 'recency null');
  eq(f.signal, null, 'no signal');

  const g = candidateFacts({}, { kind: 'job_change', headline: 'New CFO at Acme', occurred_at: '2026-06-01' });
  eq(g.warmth, null, 'missing warmth -> null');
  eq(g.signal, { kind: 'job_change', headline: 'New CFO at Acme', occurred_at: '2026-06-01' }, 'signal shape');
});

Deno.test('isUngroundedWarmPath rejects role-equivalence tautologies', () => {
  eq(isUngroundedWarmPath(null), true, 'null');
  eq(isUngroundedWarmPath({ via: '', context: '' }), true, 'empty');
  eq(isUngroundedWarmPath({ via: 'shared title', context: 'Both are fractional executives' }), true, 'classic tautology');
  eq(isUngroundedWarmPath({ context: 'same role' }), true, 'same role');
  eq(isUngroundedWarmPath({ context: 'both fractional CMOs' }), true, 'both fractional CMOs');
});

Deno.test('isUngroundedWarmPath keeps real, specific facts', () => {
  eq(isUngroundedWarmPath({ via: 'ex-colleague at Acme', context: 'You both worked at Acme 2019 to 2021' }), false, 'shared company');
  eq(isUngroundedWarmPath({ context: 'Met at SaaStr 2024' }), false, 'real event');
  eq(isUngroundedWarmPath({ via: 'Dana Okafor', context: 'She introduced you at the CFO dinner' }), false, 'mutual intro');
});

Deno.test('groundWarmPath nulls tautologies, preserves grounded paths', () => {
  eq(groundWarmPath({ context: 'both fractional executives' }), null, 'null the tautology');
  const real = { via: 'Dana Okafor', context: 'Introduced you at the CFO dinner' };
  eq(groundWarmPath(real), real, 'preserve the real path');
});

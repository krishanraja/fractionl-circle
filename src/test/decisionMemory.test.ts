// The decision-memory prompt builders are pure and load-bearing: every read's
// settled-ground / fold-in / baseline blocks come from here, and the profile
// envelope now carries the user's own onboarding words. Cover the honesty rules
// (empty renders empty, outcomes are weighed, transcripts are clamped).
import { describe, expect, it } from 'vitest';
import {
  decisionLine, settledDecisionsBlock, newDecisionsBlock, priorReadBlock, corpusFactsBlock,
} from '../../supabase/functions/_shared/decisionContext';
import { clampTranscript, profileFactsLine, profilePromptBlock } from '../../supabase/functions/_shared/profileContext';

describe('decision blocks', () => {
  it('renders a decision line with dimension, question and outcome', () => {
    const line = decisionLine({ dimension: 'Your edge', question: 'What is your wedge?', answer: 'PE-backed ops', outcome: 'worked' });
    expect(line).toContain('[Your edge]');
    expect(line).toContain('What is your wedge? -> PE-backed ops');
    expect(line).toContain('this worked');
  });

  it('weighs a decision that did not work instead of hiding it', () => {
    const line = decisionLine({ dimension: null, question: null, answer: 'Cold outreach first', outcome: 'didnt_work' });
    expect(line).toContain('did not work');
  });

  it('settled block is explicit that decisions are fixed ground', () => {
    const block = settledDecisionsBlock([{ dimension: 'Demand', question: null, answer: 'Seed founders' }]);
    expect(block).toContain('do NOT re-open');
    expect(block).toContain('Seed founders');
  });

  it('both blocks render honestly when empty', () => {
    expect(settledDecisionsBlock([])).toContain('(none yet)');
    expect(newDecisionsBlock([])).toContain('(none yet)');
  });
});

describe('priorReadBlock', () => {
  it('compacts the previous scorecard into a movement baseline', () => {
    const block = priorReadBlock({
      read: 'Real demand, crowded field.',
      opportunity: [{ label: 'Demand', band: 'strong', confidence: 'high' }],
      ability: [{ label: 'Warm reach', band: 'mixed', confidence: 'low' }],
    });
    expect(block).toContain('Demand: strong (high)');
    expect(block).toContain('Warm reach: mixed (low)');
    expect(block).toContain('never fabricate improvement');
    expect(block).toContain('Real demand, crowded field.');
  });

  it('renders nothing for a missing or malformed prior run', () => {
    expect(priorReadBlock(null)).toBe('');
    expect(priorReadBlock({ read: 42 })).toBe('');
  });
});

describe('corpusFactsBlock', () => {
  it('formats benchmark bands with their provenance tier', () => {
    const block = corpusFactsBlock(
      [{ metric: 'retainer_band', value_low: 10000, value_mid: 14000, value_high: 18000, unit: 'usd_per_month', source_tier: 'survey' }],
      [{ name: 'The under-pricing trap', description: 'Quoting under $8K to win the first client.', survivor_pattern: 'Priced at the lane median from the start.' }],
    );
    expect(block).toContain('retainer_band: 10000-18000 (mid 14000) usd_per_month [survey]');
    expect(block).toContain('The under-pricing trap');
    expect(block).toContain('Survivors: Priced at the lane median');
    expect(block).toContain('never hard telemetry');
  });

  it('renders nothing when there are no facts', () => {
    expect(corpusFactsBlock([], [])).toBe('');
  });
});

describe('profile envelope', () => {
  it('carries the user\'s own onboarding words, clamped', () => {
    const long = 'I sell to seed-stage founders. '.repeat(40);
    const block = profilePromptBlock({
      full_name: null, role: 'cmo', business_type: null, positioning: null,
      client_stages: null, client_verticals: null, first_run_transcript: long,
    });
    expect(block).toContain('In their own words:');
    expect(block).toContain('fractional CMO');
    // Clamped: the rendered quote never carries the whole ramble.
    expect(block.length).toBeLessThan(900);
    expect(clampTranscript(long).endsWith('...')).toBe(true);
    expect(clampTranscript('short and sweet')).toBe('short and sweet');
  });

  it('renders empty for an unknown user so callers can concatenate unconditionally', () => {
    expect(profilePromptBlock(null)).toBe('');
    expect(profileFactsLine(null)).toBe('');
  });

  it('digests the profile to one research-prompt line', () => {
    const line = profileFactsLine({
      full_name: null, role: 'cfo', business_type: null, positioning: 'CFO for Series B', client_stages: null,
      client_verticals: ['fintech'], target_buyer: 'Series B founders',
    });
    expect(line).toContain('fractional CFO');
    expect(line).toContain('sells to Series B founders');
    expect(line).toContain('Fintech');
  });
});

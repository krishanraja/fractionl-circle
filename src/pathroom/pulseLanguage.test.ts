import { describe, expect, it } from 'vitest';
import { marketVerdict, roleVerdict, shortDate, trendBadge } from './pulseLanguage';

describe('marketVerdict', () => {
  it('reads a growing, rising market as good', () => {
    const v = marketVerdict({ score: 70, label: 'Growing', delta: 4.8 });
    expect(v?.sentiment).toBe('good');
    expect(v?.sentence).toContain('picking up');
    expect(v?.sentence).toContain('clearly on the rise');
    expect(v?.followLine).toMatch(/putting yourself out there/i);
  });

  it('reads a flat stable market as steady, without a redundant trend clause', () => {
    const v = marketVerdict({ score: 53, label: 'Stable', delta: 0 });
    expect(v?.sentiment).toBe('steady');
    expect(v?.sentence).toBe('The fractional market is steady this month.');
  });

  it('reads a cooling, falling market as soft', () => {
    const v = marketVerdict({ score: 38, label: 'Cooling', delta: -3 });
    expect(v?.sentiment).toBe('soft');
    expect(v?.sentence).toContain('cooling');
    expect(v?.followLine).toMatch(/warm introductions/i);
  });

  it('handles a missing delta without a trend clause', () => {
    const v = marketVerdict({ score: 53, label: 'Stable', delta: null });
    expect(v?.sentence).toBe('The fractional market is steady this month.');
  });

  it('returns null with no market', () => {
    expect(marketVerdict(null)).toBeNull();
  });
});

describe('roleVerdict', () => {
  it('names a top-ranked role as in-demand and reassuring', () => {
    const v = roleVerdict({ key: 'cmo', label: 'CMO', demand: 45, band: 'Stable', deltaPct: 2.1, rank: 2, total: 6, insight: null });
    expect(v?.sentence).toContain('Demand for fractional CMOs');
    expect(v?.sentence).toContain('one of the most in-demand roles');
    expect(v?.sentiment).toBe('good');
    expect(v?.meaning).toMatch(/good sign/i);
  });

  it('describes a bottom-ranked role as quieter', () => {
    const v = roleVerdict({ key: 'ceo', label: 'CEO', demand: 21, band: 'Contracting', deltaPct: -2, rank: 6, total: 6, insight: null });
    expect(v?.sentence).toContain('quieter than most');
    expect(v?.sentiment).toBe('soft');
  });

  it('omits rank wording when rank is unknown', () => {
    const v = roleVerdict({ key: 'cmo', label: 'CMO', demand: 45, band: 'Stable', deltaPct: null, rank: null, total: null, insight: null });
    expect(v?.sentence).toBe('Demand for fractional CMOs is steady.');
  });

  it('returns null with no role', () => {
    expect(roleVerdict(null)).toBeNull();
  });
});

describe('shortDate', () => {
  it('formats an ISO date to day + month', () => {
    expect(shortDate('2026-07-02')).toBe('2 Jul');
    expect(shortDate('2026-07-05T00:00:00.000Z')).toBe('5 Jul');
  });
  it('returns null on empty/bad input', () => {
    expect(shortDate(null)).toBeNull();
    expect(shortDate('nope')).toBeNull();
  });
});

describe('trendBadge', () => {
  it('labels breakout vs trending', () => {
    expect(trendBadge(true)).toBe('taking off');
    expect(trendBadge(false)).toBe('trending');
  });
});

import { describe, expect, it } from 'vitest';
import { formatCurrencyAmount, normalizeCurrency } from './formatCurrency';

describe('formatCurrency', () => {
  it('normalizes unknown codes to USD', () => {
    expect(normalizeCurrency('XYZ')).toBe('USD');
  });

  it('formats GBP', () => {
    const out = formatCurrencyAmount(1200, 'GBP');
    expect(out).toMatch(/1,200|1\.200/);
    expect(out).toMatch(/£|GBP/);
  });
});

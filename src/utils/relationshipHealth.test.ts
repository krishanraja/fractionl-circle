import { describe, it, expect } from 'vitest';
import { calculateRelationshipHealth, generateSparklineData } from './relationshipHealth';

describe('calculateRelationshipHealth', () => {
  it('returns healthy for a well-engaged client', () => {
    const result = calculateRelationshipHealth({
      last_activity_date: new Date().toISOString(),
      activity_count: 5,
      activity_types: ['meeting', 'call', 'email'],
      monthly_revenue: 5000,
    });
    expect(result.status).toBe('healthy');
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.color).toBe('#22c55e');
  });

  it('returns at_risk when no activity date exists', () => {
    const result = calculateRelationshipHealth({
      last_activity_date: null,
      activity_count: 0,
    });
    expect(result.status).toBe('at_risk');
    expect(result.score).toBeLessThan(40);
    expect(result.reason).toBe('No activity recorded');
  });

  it('returns attention for stale activity (14-21 days)', () => {
    const fifteenDaysAgo = new Date(Date.now() - 15 * 86400000).toISOString();
    const result = calculateRelationshipHealth({
      last_activity_date: fifteenDaysAgo,
      activity_count: 3,
      activity_types: ['meeting', 'call'],
    });
    expect(result.score).toBeLessThan(70);
    expect(result.status).toBe('attention');
  });

  it('returns at_risk for very stale activity (>21 days)', () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const result = calculateRelationshipHealth({
      last_activity_date: thirtyDaysAgo,
      activity_count: 1,
      activity_types: ['call'],
      monthly_revenue: 0,
    });
    expect(result.status).toBe('at_risk');
    expect(result.score).toBeLessThan(40);
  });

  it('penalizes zero activity count', () => {
    const result = calculateRelationshipHealth({
      last_activity_date: new Date().toISOString(),
      activity_count: 0,
      activity_types: [],
    });
    // Recent date but no activities: loses 25 (frequency) + 20 (diversity)
    expect(result.score).toBe(55);
    expect(result.status).toBe('attention');
  });

  it('penalizes low activity diversity', () => {
    const full = calculateRelationshipHealth({
      last_activity_date: new Date().toISOString(),
      activity_count: 10,
      activity_types: ['meeting', 'call', 'email'],
    });
    const low = calculateRelationshipHealth({
      last_activity_date: new Date().toISOString(),
      activity_count: 10,
      activity_types: ['meeting'],
    });
    expect(full.score).toBeGreaterThan(low.score);
  });

  it('penalizes zero revenue when monthly_revenue is provided', () => {
    const withRevenue = calculateRelationshipHealth({
      last_activity_date: new Date().toISOString(),
      activity_count: 5,
      activity_types: ['meeting', 'call', 'email'],
      monthly_revenue: 5000,
    });
    const noRevenue = calculateRelationshipHealth({
      last_activity_date: new Date().toISOString(),
      activity_count: 5,
      activity_types: ['meeting', 'call', 'email'],
      monthly_revenue: 0,
    });
    expect(withRevenue.score).toBeGreaterThan(noRevenue.score);
  });

  it('clamps score to 0-100 range', () => {
    const worst = calculateRelationshipHealth({
      last_activity_date: null,
      activity_count: 0,
      activity_types: [],
      monthly_revenue: 0,
    });
    expect(worst.score).toBeGreaterThanOrEqual(0);

    const best = calculateRelationshipHealth({
      last_activity_date: new Date().toISOString(),
      activity_count: 100,
      activity_types: ['meeting', 'call', 'email', 'deep work'],
      monthly_revenue: 50000,
    });
    expect(best.score).toBeLessThanOrEqual(100);
  });
});

describe('generateSparklineData', () => {
  it('returns an array of the specified length', () => {
    const data = generateSparklineData([], 7);
    expect(data).toHaveLength(7);
  });

  it('returns all zeros for empty activity dates', () => {
    const data = generateSparklineData([], 7);
    expect(data.every(v => v === 0)).toBe(true);
  });

  it('counts activities on matching dates', () => {
    const today = new Date().toISOString().split('T')[0];
    const data = generateSparklineData([
      `${today}T10:00:00.000Z`,
      `${today}T14:00:00.000Z`,
      `${today}T16:00:00.000Z`,
    ], 7);
    // Last element should be today's count
    expect(data[data.length - 1]).toBe(3);
  });

  it('defaults to 30 days', () => {
    const data = generateSparklineData([]);
    expect(data).toHaveLength(30);
  });
});

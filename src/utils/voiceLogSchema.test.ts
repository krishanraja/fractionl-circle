import { describe, it, expect } from 'vitest';
import { parsedLogSchema } from './voiceLogSchema';

describe('parsedLogSchema', () => {
  it('validates a well-formed parsed log', () => {
    const result = parsedLogSchema.safeParse({
      client_name: 'TechCorp',
      activity_type: 'meeting',
      duration_minutes: 60,
      revenue: 400,
      summary: 'Q1 roadmap review',
    });
    expect(result.success).toBe(true);
    expect(result.data?.duration_minutes).toBe(60);
  });

  it('coerces string numbers to numbers', () => {
    const result = parsedLogSchema.safeParse({
      duration_minutes: '90',
      revenue: '1200',
    });
    expect(result.success).toBe(true);
    expect(result.data?.duration_minutes).toBe(90);
    expect(result.data?.revenue).toBe(1200);
  });

  it('rejects negative revenue', () => {
    const result = parsedLogSchema.safeParse({ revenue: -500 });
    expect(result.success).toBe(false);
  });

  it('rejects duration over 1440 minutes (24 hours)', () => {
    const result = parsedLogSchema.safeParse({ duration_minutes: 2000 });
    expect(result.success).toBe(false);
  });

  it('defaults activity_type to work when missing', () => {
    const result = parsedLogSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data?.activity_type).toBe('work');
  });

  it('accepts an empty object (all fields optional)', () => {
    const result = parsedLogSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('rejects non-numeric duration strings', () => {
    const result = parsedLogSchema.safeParse({ duration_minutes: 'three hours' });
    expect(result.success).toBe(false);
  });
});

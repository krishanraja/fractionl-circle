import { describe, it, expect } from 'vitest';
import { normalizePhoneToE164, formatPhoneNumber, isValidEmail, isValidPhone, extractLinkedInUsername } from './contactActions';

describe('normalizePhoneToE164', () => {
  it('normalizes a US number to E.164', () => {
    expect(normalizePhoneToE164('(415) 555-1234')).toBe('+14155551234');
  });

  it('returns null for invalid numbers', () => {
    expect(normalizePhoneToE164('not-a-number')).toBeNull();
  });

  it('handles numbers already in E.164 format', () => {
    expect(normalizePhoneToE164('+14155551234')).toBe('+14155551234');
  });
});

describe('formatPhoneNumber', () => {
  it('formats US numbers in national format', () => {
    const formatted = formatPhoneNumber('+14155551234');
    expect(formatted).toMatch(/\(415\) 555-1234/);
  });

  it('returns empty string for null/undefined', () => {
    expect(formatPhoneNumber(null)).toBe('');
    expect(formatPhoneNumber(undefined)).toBe('');
  });

  it('returns raw phone if parsing fails', () => {
    expect(formatPhoneNumber('abc')).toBe('abc');
  });
});

describe('isValidEmail', () => {
  it('validates correct emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('test.user+tag@domain.co.uk')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('@domain.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('isValidPhone', () => {
  it('validates correct US phone numbers', () => {
    expect(isValidPhone('(415) 555-1234')).toBe(true);
    expect(isValidPhone('+14155551234')).toBe(true);
  });

  it('rejects invalid phone numbers', () => {
    expect(isValidPhone('123')).toBe(false);
    expect(isValidPhone('not-a-phone')).toBe(false);
  });
});

describe('extractLinkedInUsername', () => {
  it('extracts username from LinkedIn URL', () => {
    expect(extractLinkedInUsername('https://www.linkedin.com/in/johndoe')).toBe('johndoe');
    expect(extractLinkedInUsername('https://linkedin.com/in/jane-doe-123')).toBe('jane-doe-123');
  });

  it('returns null for invalid URLs', () => {
    expect(extractLinkedInUsername(null)).toBeNull();
    expect(extractLinkedInUsername('https://twitter.com/user')).toBeNull();
    expect(extractLinkedInUsername(undefined)).toBeNull();
  });
});

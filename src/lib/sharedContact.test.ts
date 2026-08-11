import { describe, expect, it } from 'vitest';
import { sharedDraftFromParsed, sharedInputFromDraft } from './sharedContact';

describe('shared contact mapping', () => {
  it('turns a screenshot parse into an editable Circle draft', () => {
    expect(sharedDraftFromParsed({
      name: ' Maya Chen ',
      headline: 'Commercial lead',
      company: 'Northstar Health',
      location: 'Toronto',
      platform: 'linkedin',
      profile_url: 'https://linkedin.com/in/maya-chen',
    }, 'Shared from Android')).toEqual({
      name: 'Maya Chen',
      email: null,
      phone: null,
      company: 'Northstar Health',
      title: null,
      city: 'Toronto',
      specialty_summary: 'Commercial lead',
      linkedin_url: 'https://linkedin.com/in/maya-chen',
      instagram_handle: null,
      website: null,
      detected_platform: 'linkedin',
      notes: 'Shared from Android',
    });
  });

  it('preserves an Instagram handle as the shared profile URL', () => {
    const input = sharedInputFromDraft({
      name: 'Ari Jones',
      instagram_handle: '@arijones',
      detected_platform: 'instagram',
    });

    expect(input.profile_url).toBe('https://www.instagram.com/arijones');
    expect(input.platform).toBe('instagram');
  });
});

import { describe, expect, it } from 'vitest';
import {
  detectContactShortcut,
  inferMeetingContext,
  meetingContextTag,
  pickedContactToQuickAdd,
  summarizeContact,
} from '@/lib/hinge';

describe('Hinge contact helpers', () => {
  it('turns a LinkedIn profile into a usable clue', () => {
    const contact = detectContactShortcut('https://www.linkedin.com/in/maya-chen');
    expect(contact).toMatchObject({ name: 'Maya Chen', detected_platform: 'linkedin' });
  });

  it('keeps a picked device contact simple', () => {
    const contact = pickedContactToQuickAdd({
      name: ['Maya Chen'],
      email: ['maya@example.com'],
      tel: ['+1 555 0100'],
    });
    expect(contact).toMatchObject({ name: 'Maya Chen', email: 'maya@example.com' });
    expect(summarizeContact(contact!)).toBe('Maya Chen, maya@example.com');
  });

  it('extracts and stores meeting context in plain language', () => {
    expect(inferMeetingContext('Maya Chen, met at SaaS Summit')).toBe('SaaS Summit');
    expect(meetingContextTag('  SaaS   Summit  ')).toBe('met:SaaS Summit');
    expect(meetingContextTag('')).toBeNull();
  });
});

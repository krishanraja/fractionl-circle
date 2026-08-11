import { linkedinSlug } from '@/lib/fingerprint';
import { canonicalInstagram, canonicalLinkedIn } from '@/lib/handles';
import type { QuickAddInput } from '@/lib/circleIngest';

export interface PickedContact {
  name?: string[];
  email?: string[];
  tel?: string[];
}

export function detectContactShortcut(raw: string): QuickAddInput | null {
  const text = raw.trim();
  if (!text) return null;

  const linkedin = canonicalLinkedIn(text);
  if (linkedin && /^https?:\/\/(www\.)?linkedin\.com\//i.test(text)) {
    const slug = linkedinSlug(linkedin) ?? '';
    const name = slug
      ? slug.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
      : 'New contact';
    return {
      name,
      linkedin_url: linkedin,
      detected_platform: 'linkedin',
      notes: text,
    };
  }

  if (/^@?[a-z0-9._]{2,30}$/i.test(text) && !text.includes('http')) {
    const handle = text.replace(/^@/, '');
    const instagram = canonicalInstagram(handle);
    if (instagram) {
      return {
        name: `@${handle}`,
        instagram_handle: handle,
        detected_platform: 'instagram',
        notes: text,
      };
    }
  }

  return null;
}

export function pickedContactToQuickAdd(contact: PickedContact): QuickAddInput | null {
  const name = contact.name?.find(Boolean)?.trim() ?? '';
  if (!name) return null;
  return {
    name,
    email: contact.email?.find(Boolean)?.trim() || null,
    phone: contact.tel?.find(Boolean)?.trim() || null,
    notes: 'Added from device contacts',
  };
}

export function summarizeContact(input: QuickAddInput): string {
  const detail = input.company || input.title || input.email || input.phone || input.linkedin_url;
  return detail ? `${input.name}, ${detail}` : input.name;
}

export function inferMeetingContext(raw: string): string {
  const match = raw.match(/\bmet\s+(?:at|during|through|via)\s+([^\n.;]+)/i);
  return match?.[1]?.trim().replace(/\s+/g, ' ').slice(0, 120) ?? '';
}

export function meetingContextTag(raw: string): string | null {
  const value = raw.trim().replace(/\s+/g, ' ').slice(0, 120);
  return value ? `met:${value}` : null;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

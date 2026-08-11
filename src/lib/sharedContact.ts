import type { QuickAddInput, SharedContactInput } from '@/lib/circleIngest';

type ParsedValue = Record<string, string | null | undefined>;

const clean = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

export function sharedDraftFromParsed(
  value: ParsedValue,
  note?: string | null,
): QuickAddInput {
  const platform = clean(value.platform);
  const handle = clean(value.handle);
  const profileUrl = clean(value.profile_url);
  const linkedinUrl = clean(value.linkedin_url)
    ?? (profileUrl?.includes('linkedin.com') ? profileUrl : null);
  const instagramHandle = clean(value.instagram_handle)
    ?? (platform === 'instagram' ? handle?.replace(/^@/, '') ?? null : null);

  return {
    name: clean(value.name) ?? '',
    email: clean(value.email),
    phone: clean(value.phone),
    company: clean(value.company),
    title: clean(value.title),
    city: clean(value.city) ?? clean(value.location),
    specialty_summary: clean(value.specialty_summary) ?? clean(value.headline),
    linkedin_url: linkedinUrl,
    instagram_handle: instagramHandle,
    website: clean(value.website)
      ?? (profileUrl && !profileUrl.includes('linkedin.com') ? profileUrl : null),
    detected_platform: platform,
    notes: clean(note),
  };
}

export function sharedInputFromDraft(value: QuickAddInput): SharedContactInput {
  const instagramUrl = value.instagram_handle
    ? `https://www.instagram.com/${value.instagram_handle.replace(/^@/, '')}`
    : null;

  return {
    name: value.name.trim(),
    email: clean(value.email),
    phone: clean(value.phone),
    linkedin_url: clean(value.linkedin_url),
    company: clean(value.company),
    title: clean(value.title),
    location: clean(value.city),
    headline: clean(value.specialty_summary),
    profile_url: clean(value.linkedin_url) ?? instagramUrl ?? clean(value.website),
    platform: clean(value.detected_platform),
    notes: clean(value.notes),
  };
}

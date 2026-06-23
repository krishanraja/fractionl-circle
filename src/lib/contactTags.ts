// Predictive contact tags: three intent buckets, stored on circle_person.tags
// as namespaced slugs ("met:conference", "brings:capital", "work:could_refer_me")
// so the existing text[] column + renderer keep working with no migration.
export type TagBucket = 'met' | 'brings' | 'work';

export interface TagPreset { slug: string; label: string; }
export interface BucketDef { key: TagBucket; label: string; presets: TagPreset[]; }

export const TAG_BUCKETS: BucketDef[] = [
  {
    key: 'met',
    label: 'Where you met',
    presets: [
      { slug: 'conference', label: 'Conference' },
      { slug: 'intro', label: 'Intro / referral' },
      { slug: 'worked_together', label: 'Worked together' },
      { slug: 'linkedin', label: 'LinkedIn' },
      { slug: 'cold_inbound', label: 'Cold inbound' },
      { slug: 'event', label: 'Event / meetup' },
      { slug: 'mutual_friend', label: 'Mutual friend' },
      { slug: 'community', label: 'Online community' },
    ],
  },
  {
    key: 'brings',
    label: 'What they bring',
    presets: [
      { slug: 'capital', label: 'Capital' },
      { slug: 'customers', label: 'Customers' },
      { slug: 'hiring', label: 'Hiring' },
      { slug: 'distribution', label: 'Distribution' },
      { slug: 'domain_expertise', label: 'Domain expertise' },
      { slug: 'operator', label: 'Operator' },
      { slug: 'advisor', label: 'Advisor' },
      { slug: 'audience', label: 'Press / audience' },
    ],
  },
  {
    key: 'work',
    label: 'How you’d work together',
    presets: [
      { slug: 'could_hire_me', label: 'Could hire me' },
      { slug: 'could_refer_me', label: 'Could refer me' },
      { slug: 'partner', label: 'Partner / collab' },
      { slug: 'mentor', label: 'Mentor' },
      { slug: 'peer', label: 'Peer / sounding board' },
      { slug: 'co_build', label: 'Co-build' },
    ],
  },
];

export const buildTag = (bucket: TagBucket, slug: string): string => `${bucket}:${slug}`;

const LABEL_BY_TAG = new Map<string, string>();
for (const b of TAG_BUCKETS) for (const p of b.presets) LABEL_BY_TAG.set(buildTag(b.key, p.slug), p.label);

const humanize = (s: string): string =>
  s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

// Display label for a stored tag. Known presets keep their nice casing; AI / free
// tags are humanized from the slug. Legacy unprefixed tags render as-is.
export const prettifyTag = (tag: string): string => {
  const known = LABEL_BY_TAG.get(tag);
  if (known) return known;
  const idx = tag.indexOf(':');
  return humanize(idx >= 0 ? tag.slice(idx + 1) : tag);
};

export const tagBucket = (tag: string): TagBucket | null => {
  const idx = tag.indexOf(':');
  const pfx = idx >= 0 ? tag.slice(0, idx) : '';
  return pfx === 'met' || pfx === 'brings' || pfx === 'work' ? pfx : null;
};

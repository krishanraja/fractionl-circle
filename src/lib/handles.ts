// Phase B: canonicalize user-facing social handles and URLs into the shape
// we persist on `circle_person.handles`. Accepts either a URL (messy or
// clean) or a bare @handle and emits `https://<platform>/<handle>`; returns
// null when nothing usable is found so the caller can skip the write.

export type HandleKey = 'linkedin' | 'instagram' | 'tiktok' | 'x' | 'whatsapp';

export type HandleBlob = Partial<Record<HandleKey, string>>;

function cleanHandle(raw: string): string {
  return raw.trim().replace(/^@+/, '').replace(/\/+$/, '');
}

function firstMatch(input: string, patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = input.match(p);
    if (m && m[1]) return cleanHandle(m[1]);
  }
  return null;
}

// --- Per-platform canonicalizers -------------------------------------------

export function canonicalLinkedIn(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const slug = firstMatch(trimmed, [
    /linkedin\.com\/in\/([^/?#\s]+)/i,
    /linkedin\.com\/pub\/([^/?#\s]+)/i,
  ]);
  if (slug) return `https://www.linkedin.com/in/${slug}`;
  // Raw slug like "jenna-park" or "@jenna-park" — LinkedIn accepts them at /in/.
  if (/^[a-z0-9_-]+$/i.test(trimmed.replace(/^@+/, ''))) {
    return `https://www.linkedin.com/in/${cleanHandle(trimmed)}`;
  }
  return null;
}

export function canonicalInstagram(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const handle = firstMatch(trimmed, [
    /instagram\.com\/([^/?#\s]+)/i,
  ]);
  if (handle) return `https://instagram.com/${handle}`;
  if (/^[a-z0-9._]+$/i.test(trimmed.replace(/^@+/, ''))) {
    return `https://instagram.com/${cleanHandle(trimmed)}`;
  }
  return null;
}

export function canonicalTikTok(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const handle = firstMatch(trimmed, [
    /tiktok\.com\/@([^/?#\s]+)/i,
  ]);
  if (handle) return `https://www.tiktok.com/@${handle}`;
  if (/^[a-z0-9._]+$/i.test(trimmed.replace(/^@+/, ''))) {
    return `https://www.tiktok.com/@${cleanHandle(trimmed)}`;
  }
  return null;
}

export function canonicalX(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const handle = firstMatch(trimmed, [
    /(?:twitter|x)\.com\/([^/?#\s]+)/i,
  ]);
  if (handle) return `https://x.com/${handle}`;
  if (/^[a-z0-9_]{1,15}$/i.test(trimmed.replace(/^@+/, ''))) {
    return `https://x.com/${cleanHandle(trimmed)}`;
  }
  return null;
}

// --- Platform dispatcher ---------------------------------------------------

// Given the platform the ingestion source reported, resolve whichever field
// (url / handle) the caller has and return a pair we can merge into
// circle_person.handles.
export function handleForPlatform(
  platform: string | null | undefined,
  url: string | null | undefined,
  handle: string | null | undefined,
): Partial<HandleBlob> {
  const p = platform?.toLowerCase() ?? '';
  const candidate = handle?.trim() || url?.trim() || null;
  if (!candidate) return {};
  if (p === 'linkedin') {
    const v = canonicalLinkedIn(candidate);
    return v ? { linkedin: v } : {};
  }
  if (p === 'instagram') {
    const v = canonicalInstagram(candidate);
    return v ? { instagram: v } : {};
  }
  if (p === 'tiktok') {
    const v = canonicalTikTok(candidate);
    return v ? { tiktok: v } : {};
  }
  if (p === 'x' || p === 'twitter') {
    const v = canonicalX(candidate);
    return v ? { x: v } : {};
  }
  // No platform supplied — infer from URL if we can.
  return inferHandlesFromUrl(candidate);
}

// Inspect a raw URL and attribute it to whichever platform it points at.
// Used when re-syncing contacts (Google / Microsoft) that carry stray
// social URLs in their `urls` arrays without an explicit platform tag.
export function inferHandlesFromUrl(input: string | null | undefined): Partial<HandleBlob> {
  if (!input) return {};
  if (/linkedin\.com/i.test(input)) {
    const v = canonicalLinkedIn(input);
    return v ? { linkedin: v } : {};
  }
  if (/instagram\.com/i.test(input)) {
    const v = canonicalInstagram(input);
    return v ? { instagram: v } : {};
  }
  if (/tiktok\.com/i.test(input)) {
    const v = canonicalTikTok(input);
    return v ? { tiktok: v } : {};
  }
  if (/(?:twitter|x)\.com/i.test(input)) {
    const v = canonicalX(input);
    return v ? { x: v } : {};
  }
  return {};
}

// Merge incoming handles into an existing blob, preserving values already
// present (explicit new value wins only when the old one is null/empty).
export function mergeHandles(base: HandleBlob | null | undefined, next: Partial<HandleBlob>): HandleBlob {
  const out: HandleBlob = { ...(base ?? {}) };
  for (const key of Object.keys(next) as HandleKey[]) {
    const value = next[key];
    if (!value) continue;
    if (!out[key] || out[key] === '') out[key] = value;
  }
  return out;
}

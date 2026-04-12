import { useMemo, useCallback } from 'react';
import type { TalentContactWithSkills } from './useTalentContacts';
import { normalizePhoneToE164 } from '@/utils/contactActions';

export type DuplicateMatchType = 'email' | 'phone' | 'linkedin' | 'instagram' | 'name';

export interface DuplicateMatch {
  contact: TalentContactWithSkills;
  matchType: DuplicateMatchType;
  /** 1.0 = strong identity match (email/phone/linkedin); 0.6 = weak (fuzzy name). */
  confidence: number;
}

export interface DuplicateInput {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  /** An Instagram handle or instagram.com URL. */
  instagram?: string | null;
  /** Optional portfolio_url — Instagram handles live in portfolio_url today. */
  portfolio_url?: string | null;
}

// ── Normalization helpers (exported for reuse in edge functions / intake paths) ──

export function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/** Extracts the `/in/<slug>` portion of a LinkedIn URL. Returns null if not a LinkedIn URL. */
export function extractLinkedInSlug(urlOrSlug: string | null | undefined): string | null {
  if (!urlOrSlug) return null;
  const trimmed = urlOrSlug.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/linkedin\.com\/in\/([^/?#\s]+)/i);
  if (match) return match[1].toLowerCase().replace(/\/$/, '');
  // Accept a bare slug if it looks like one (no protocol, no spaces, has a hyphen or letters)
  if (/^[a-z0-9-]{3,}$/i.test(trimmed)) return trimmed.toLowerCase();
  return null;
}

/** Extract an Instagram handle from a handle, @handle, or instagram.com URL. */
export function extractInstagramHandle(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const urlMatch = trimmed.match(/instagram\.com\/([a-zA-Z0-9._]+)/i);
  if (urlMatch) return urlMatch[1].toLowerCase();
  if (trimmed.startsWith('@')) return trimmed.slice(1).toLowerCase();
  if (/^[a-zA-Z0-9._]{2,30}$/.test(trimmed)) return trimmed.toLowerCase();
  return null;
}

/**
 * Hook to detect potential duplicate contacts before saving.
 * Checks email, phone (E.164), LinkedIn slug, Instagram handle (strong identity),
 * and name (weak / fuzzy).
 */
export function useDuplicateDetection(contacts: TalentContactWithSkills[]) {
  const emailIndex = useMemo(() => {
    const map = new Map<string, TalentContactWithSkills>();
    for (const c of contacts) {
      if (c.email) map.set(normalizeEmail(c.email), c);
    }
    return map;
  }, [contacts]);

  const phoneIndex = useMemo(() => {
    const map = new Map<string, TalentContactWithSkills>();
    for (const c of contacts) {
      if (c.phone) {
        const normalized = normalizePhoneToE164(c.phone) || c.phone;
        map.set(normalized, c);
      }
    }
    return map;
  }, [contacts]);

  const linkedinIndex = useMemo(() => {
    const map = new Map<string, TalentContactWithSkills>();
    for (const c of contacts) {
      const slug = extractLinkedInSlug(c.linkedin_url);
      if (slug) map.set(slug, c);
    }
    return map;
  }, [contacts]);

  const instagramIndex = useMemo(() => {
    const map = new Map<string, TalentContactWithSkills>();
    for (const c of contacts) {
      // Instagram handles are stored in portfolio_url today: https://instagram.com/<handle>
      const handle = extractInstagramHandle(c.portfolio_url);
      if (handle) map.set(handle, c);
    }
    return map;
  }, [contacts]);

  /**
   * Find potential duplicates for a new contact. Returns matches sorted by confidence (strongest first).
   */
  const findDuplicates = useCallback((
    input: DuplicateInput | string,
    emailArg?: string,
    phoneArg?: string
  ): DuplicateMatch[] => {
    // Back-compat: old signature was (name, email, phone)
    const arg: DuplicateInput = typeof input === 'string'
      ? { name: input, email: emailArg, phone: phoneArg }
      : input;

    const matches: DuplicateMatch[] = [];
    const seen = new Set<string>();

    // 1. LinkedIn slug (strongest professional identifier)
    const slug = extractLinkedInSlug(arg.linkedin_url);
    if (slug) {
      const match = linkedinIndex.get(slug);
      if (match && !seen.has(match.id)) {
        matches.push({ contact: match, matchType: 'linkedin', confidence: 1.0 });
        seen.add(match.id);
      }
    }

    // 2. Email
    if (arg.email) {
      const match = emailIndex.get(normalizeEmail(arg.email));
      if (match && !seen.has(match.id)) {
        matches.push({ contact: match, matchType: 'email', confidence: 1.0 });
        seen.add(match.id);
      }
    }

    // 3. Phone (E.164 normalized)
    if (arg.phone) {
      const normalized = normalizePhoneToE164(arg.phone) || arg.phone;
      const match = phoneIndex.get(normalized);
      if (match && !seen.has(match.id)) {
        matches.push({ contact: match, matchType: 'phone', confidence: 1.0 });
        seen.add(match.id);
      }
    }

    // 4. Instagram handle
    const igHandle = extractInstagramHandle(arg.instagram || arg.portfolio_url);
    if (igHandle) {
      const match = instagramIndex.get(igHandle);
      if (match && !seen.has(match.id)) {
        matches.push({ contact: match, matchType: 'instagram', confidence: 0.9 });
        seen.add(match.id);
      }
    }

    // 5. Fuzzy name (weak — only if no strong match yet)
    if (arg.name && arg.name.trim().length >= 2) {
      const normalizedInput = normalizeName(arg.name);
      for (const c of contacts) {
        if (seen.has(c.id)) continue;
        const normalizedExisting = normalizeName(c.name);
        if (
          normalizedInput === normalizedExisting ||
          (normalizedInput.length >= 4 && normalizedExisting.includes(normalizedInput)) ||
          (normalizedExisting.length >= 4 && normalizedInput.includes(normalizedExisting))
        ) {
          matches.push({ contact: c, matchType: 'name', confidence: 0.6 });
          seen.add(c.id);
        }
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }, [contacts, emailIndex, phoneIndex, linkedinIndex, instagramIndex]);

  return { findDuplicates };
}

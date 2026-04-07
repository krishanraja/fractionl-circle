import { useMemo, useCallback } from 'react';
import type { TalentContactWithSkills } from './useTalentContacts';
import { normalizePhoneToE164 } from '@/utils/contactActions';

export interface DuplicateMatch {
  contact: TalentContactWithSkills;
  matchType: 'email' | 'phone' | 'name';
}

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Hook to detect potential duplicate contacts before saving.
 * Checks email (exact, case-insensitive), phone (E.164 normalized), and name (fuzzy).
 */
export function useDuplicateDetection(contacts: TalentContactWithSkills[]) {
  // Build lookup indexes for fast matching
  const emailIndex = useMemo(() => {
    const map = new Map<string, TalentContactWithSkills>();
    for (const c of contacts) {
      if (c.email) map.set(c.email.toLowerCase().trim(), c);
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

  const findDuplicates = useCallback((
    name?: string,
    email?: string,
    phone?: string
  ): DuplicateMatch[] => {
    const matches: DuplicateMatch[] = [];
    const seen = new Set<string>();

    // 1. Exact email match (case-insensitive)
    if (email) {
      const match = emailIndex.get(email.toLowerCase().trim());
      if (match && !seen.has(match.id)) {
        matches.push({ contact: match, matchType: 'email' });
        seen.add(match.id);
      }
    }

    // 2. Exact phone match (E.164 normalized)
    if (phone) {
      const normalized = normalizePhoneToE164(phone) || phone;
      const match = phoneIndex.get(normalized);
      if (match && !seen.has(match.id)) {
        matches.push({ contact: match, matchType: 'phone' });
        seen.add(match.id);
      }
    }

    // 3. Fuzzy name match
    if (name && name.trim().length >= 2) {
      const normalizedInput = normalizeName(name);
      for (const c of contacts) {
        if (seen.has(c.id)) continue;
        const normalizedExisting = normalizeName(c.name);
        // Exact match or one contains the other
        if (
          normalizedInput === normalizedExisting ||
          (normalizedInput.length >= 4 && normalizedExisting.includes(normalizedInput)) ||
          (normalizedExisting.length >= 4 && normalizedInput.includes(normalizedExisting))
        ) {
          matches.push({ contact: c, matchType: 'name' });
          seen.add(c.id);
        }
      }
    }

    return matches;
  }, [contacts, emailIndex, phoneIndex]);

  return { findDuplicates };
}

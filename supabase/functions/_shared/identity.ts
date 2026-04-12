/**
 * Shared identity normalization for contact dedup.
 * Keep in sync with src/hooks/useDuplicateDetection.ts and the SQL backfill
 * in supabase/migrations/20260412000001_add_contact_dedup_enrichment.sql.
 */

import { parsePhoneNumberFromString } from 'https://esm.sh/libphonenumber-js@1.11.18';

export type IdentityKind = 'email' | 'phone' | 'linkedin_slug' | 'instagram_handle' | 'name_company';

export interface Identity {
  kind: IdentityKind;
  value_normalized: string;
  value_raw: string;
  confidence: number;
}

export function normalizeEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed;
}

export function normalizePhone(phone: string, defaultCountry: string = 'US'): string | null {
  try {
    const parsed = parsePhoneNumberFromString(phone, defaultCountry as any);
    if (parsed?.isValid()) return parsed.format('E.164');
  } catch { /* fall through */ }
  // Best-effort: strip everything except digits and a leading +
  const cleaned = phone.startsWith('+')
    ? '+' + phone.slice(1).replace(/[^0-9]/g, '')
    : phone.replace(/[^0-9]/g, '');
  return cleaned.length >= 7 ? cleaned : null;
}

export function extractLinkedInSlug(urlOrSlug: string | null | undefined): string | null {
  if (!urlOrSlug) return null;
  const trimmed = urlOrSlug.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/linkedin\.com\/in\/([^/?#\s]+)/i);
  if (match) return match[1].toLowerCase().replace(/\/$/, '');
  if (/^[a-z0-9-]{3,}$/i.test(trimmed)) return trimmed.toLowerCase();
  return null;
}

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

export function normalizeNameCompany(name: string, company?: string | null): string | null {
  const n = (name || '').toLowerCase().trim().replace(/\s+/g, ' ');
  const c = (company || '').toLowerCase().trim().replace(/\s+/g, ' ');
  if (!n) return null;
  return `${n}|${c}`;
}

/** Build the list of normalized identities for an incoming contact payload. */
export function collectIdentities(payload: {
  email?: string | null;
  emails?: string[];
  phone?: string | null;
  phones?: string[];
  linkedin_url?: string | null;
  instagram?: string | null;
  portfolio_url?: string | null;
  name?: string | null;
  company?: string | null;
  default_country?: string;
}): Identity[] {
  const out: Identity[] = [];
  const emails = [payload.email, ...(payload.emails ?? [])].filter(Boolean) as string[];
  for (const e of emails) {
    const n = normalizeEmail(e);
    if (n) out.push({ kind: 'email', value_normalized: n, value_raw: e, confidence: 1.0 });
  }
  const phones = [payload.phone, ...(payload.phones ?? [])].filter(Boolean) as string[];
  for (const p of phones) {
    const n = normalizePhone(p, payload.default_country ?? 'US');
    if (n) out.push({ kind: 'phone', value_normalized: n, value_raw: p, confidence: 1.0 });
  }
  const slug = extractLinkedInSlug(payload.linkedin_url);
  if (slug) out.push({
    kind: 'linkedin_slug', value_normalized: slug,
    value_raw: payload.linkedin_url!, confidence: 1.0,
  });
  const igFromPortfolio = extractInstagramHandle(payload.portfolio_url);
  const ig = extractInstagramHandle(payload.instagram) || igFromPortfolio;
  if (ig) out.push({
    kind: 'instagram_handle', value_normalized: ig,
    value_raw: (payload.instagram || payload.portfolio_url)!, confidence: 0.9,
  });
  if (payload.name) {
    const nc = normalizeNameCompany(payload.name, payload.company ?? null);
    if (nc) out.push({
      kind: 'name_company', value_normalized: nc,
      value_raw: `${payload.name}${payload.company ? ` @ ${payload.company}` : ''}`,
      confidence: 0.6,
    });
  }
  return out;
}

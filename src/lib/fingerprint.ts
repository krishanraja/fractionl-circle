// Fingerprint + normalization utilities for Circle dedupe.
// Phase 2b: simple deterministic fingerprint from name + a stable anchor
// (LinkedIn URL slug, email domain, or phone). Good-enough to dedupe within
// and across sources before the Phase 3 LLM-powered dedupe lands.

const STOPWORD_SUFFIXES = new Set([
  'jr', 'sr', 'ii', 'iii', 'iv', 'phd', 'md', 'mba', 'cfa', 'esq',
]);

export const normalizeName = (name: string | null | undefined): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((tok) => tok && !STOPWORD_SUFFIXES.has(tok))
    .join(' ')
    .trim();
};

export const normalizeCompany = (company: string | null | undefined): string => {
  if (!company) return '';
  return company
    .toLowerCase()
    .replace(/\b(inc|incorporated|llc|ltd|limited|gmbh|corp|corporation|co|company|plc)\.?\b/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const emailDomain = (email: string | null | undefined): string => {
  if (!email) return '';
  const at = email.indexOf('@');
  return at < 0 ? '' : email.slice(at + 1).toLowerCase().trim();
};

export const linkedinSlug = (url: string | null | undefined): string => {
  if (!url) return '';
  const m = url.match(/linkedin\.com\/in\/([^/?#]+)/i);
  return m ? m[1].toLowerCase() : '';
};

export const normalizePhone = (phone: string | null | undefined): string => {
  if (!phone) return '';
  const digits = phone.replace(/\D+/g, '');
  if (!digits) return '';
  // Naive E.164-ish normalization
  return digits.length === 10 ? `1${digits}` : digits;
};

interface FingerprintInput {
  name?: string | null;
  email?: string | null;
  linkedinUrl?: string | null;
  phone?: string | null;
  company?: string | null;
}

// Deterministic fingerprint. Picks the strongest identifier available.
// Two records with the same fingerprint are treated as the same person.
export const personFingerprint = (input: FingerprintInput): string => {
  const slug = linkedinSlug(input.linkedinUrl);
  if (slug) return `li:${slug}`;

  const phone = normalizePhone(input.phone);
  if (phone) return `ph:${phone}`;

  const domain = emailDomain(input.email);
  const email = input.email?.toLowerCase().trim() ?? '';
  if (email && domain && !isPublicDomain(domain)) {
    return `em:${email}`;
  }

  const name = normalizeName(input.name);
  const company = normalizeCompany(input.company);
  if (name && company) return `nc:${name}|${company}`;
  if (name && email) return `ne:${name}|${email.toLowerCase()}`;
  if (name && domain) return `nd:${name}|${domain}`;

  // Last-resort name-only fingerprint; high collision risk but better than nothing.
  return name ? `n:${name}` : '';
};

const PUBLIC_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com',
  'me.com', 'mac.com', 'aol.com', 'proton.me', 'protonmail.com',
  'live.com', 'msn.com', 'fastmail.com', 'hey.com',
]);
const isPublicDomain = (d: string) => PUBLIC_DOMAINS.has(d);

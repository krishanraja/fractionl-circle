// Post-launch leverage: auto-detecting CSV parser for HubSpot, Attio, Folk,
// and "anything that roughly looks like a contact sheet". Reuses the
// tolerant CSV tokenizer from linkedinCsv.ts so quoted fields, embedded
// newlines, and BOMs are handled consistently.

import { parseLinkedInCsv, type LinkedInConnection } from '@/lib/linkedinCsv';

export type CrmFormat =
  | 'linkedin'
  | 'hubspot'
  | 'attio'
  | 'folk'
  | 'generic';

export interface CrmContact {
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  linkedinUrl: string | null;
  location: string | null;
}

export interface ParsedCrmCsv {
  format: CrmFormat;
  contacts: CrmContact[];
  skipped: number;
  totalRows: number;
  warning?: string;
}

// ---------------------------------------------------------------------------
// Tokenizer (RFC-4180-ish) — duplicated inline rather than exported from
// linkedinCsv.ts to keep the module surface small. Behaviour identical.
// ---------------------------------------------------------------------------

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { cells.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

function splitCsvRows(text: string): string[] {
  const rows: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') { cur += '""'; i++; }
      else { inQuotes = !inQuotes; cur += ch; }
      continue;
    }
    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      if (cur) rows.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur) rows.push(cur);
  return rows;
}

// ---------------------------------------------------------------------------
// Column matching. Each canonical field has a priority-ordered list of
// aliases it'll accept, normalized to lowercase-alphanumerics. First hit
// wins.
// ---------------------------------------------------------------------------

const ALIASES: Record<keyof CrmContact, string[]> = {
  firstName:   ['firstname', 'givenname', 'first'],
  lastName:    ['lastname', 'surname', 'familyname', 'last'],
  fullName:    ['fullname', 'name', 'displayname', 'contactname', 'personname'],
  email:       ['email', 'emailaddress', 'emailaddresses', 'primaryemail', 'workemail', 'mail'],
  phone:       ['phone', 'phonenumber', 'phonenumbers', 'mobilephone', 'mobile', 'businessphone', 'workphone'],
  company:     ['company', 'companyname', 'organization', 'organisation', 'employer', 'account'],
  title:       ['title', 'jobtitle', 'position', 'role', 'currenttitle'],
  linkedinUrl: ['linkedin', 'linkedinurl', 'linkedinprofile', 'url', 'profileurl'],
  location:    ['location', 'city', 'address', 'region', 'geography'],
};

function canon(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function pickColumn(header: string[], aliases: string[]): number {
  const canonized = header.map(canon);
  for (const alias of aliases) {
    const idx = canonized.indexOf(alias);
    if (idx >= 0) return idx;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Format fingerprinting by distinctive headers. Not every LinkedIn export
// uses the exact same column set, so the detector is lenient: it just has
// to beat the "generic" fallback.
// ---------------------------------------------------------------------------

function detectFormat(header: string[]): CrmFormat {
  const set = new Set(header.map(canon));
  if (set.has('connectedon') && set.has('firstname') && set.has('lastname')) return 'linkedin';
  if (set.has('lifecyclestage') || (set.has('hs_object_id') ?? false)) return 'hubspot';
  if (set.has('emailaddresses') && set.has('phonenumbers')) return 'attio';
  if (set.has('fullname') && set.has('jobtitle') && set.has('linkedin')) return 'folk';
  return 'generic';
}

// ---------------------------------------------------------------------------
// Parse. Delegates to the LinkedIn-specific parser when the header
// fingerprints match (the LinkedIn export has a "Notes:" preamble the
// general parser can't handle), otherwise runs the generic path.
// ---------------------------------------------------------------------------

export function parseCrmCsv(raw: string): ParsedCrmCsv {
  if (!raw) return { format: 'generic', contacts: [], skipped: 0, totalRows: 0, warning: 'Empty file' };
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;

  // LinkedIn's connection export is structurally weirder (preamble). Try it
  // first if the file even hints at being LinkedIn.
  const looksLinkedIn = /^(?:.*?First Name\s*,)/m.test(text);
  if (looksLinkedIn) {
    const li = parseLinkedInCsv(raw);
    if (li.connections.length > 0) {
      return {
        format: 'linkedin',
        contacts: li.connections.map((c): CrmContact => ({
          firstName: c.firstName || null,
          lastName: c.lastName || null,
          fullName: c.fullName,
          email: c.email || null,
          phone: null,
          company: c.company || null,
          title: c.position || null,
          linkedinUrl: c.url || null,
          location: null,
        })),
        skipped: li.skipped,
        totalRows: li.totalRows,
        warning: li.warning,
      };
    }
  }

  const rows = splitCsvRows(text);
  if (!rows.length) return { format: 'generic', contacts: [], skipped: 0, totalRows: 0, warning: 'No rows' };

  // First non-empty row is header.
  let headerIdx = 0;
  while (headerIdx < rows.length && !rows[headerIdx].trim()) headerIdx++;
  if (headerIdx >= rows.length) return { format: 'generic', contacts: [], skipped: 0, totalRows: 0, warning: 'No header row' };
  const header = splitCsvLine(rows[headerIdx]).map((h) => h.trim());
  const format = detectFormat(header);

  const idx = {
    firstName:   pickColumn(header, ALIASES.firstName),
    lastName:    pickColumn(header, ALIASES.lastName),
    fullName:    pickColumn(header, ALIASES.fullName),
    email:       pickColumn(header, ALIASES.email),
    phone:       pickColumn(header, ALIASES.phone),
    company:     pickColumn(header, ALIASES.company),
    title:       pickColumn(header, ALIASES.title),
    linkedinUrl: pickColumn(header, ALIASES.linkedinUrl),
    location:    pickColumn(header, ALIASES.location),
  };

  if (idx.fullName < 0 && idx.firstName < 0 && idx.lastName < 0) {
    return {
      format,
      contacts: [],
      skipped: 0,
      totalRows: rows.length - headerIdx - 1,
      warning: "Couldn't find a name column. Expected one of: Name, Full Name, First Name.",
    };
  }

  const contacts: CrmContact[] = [];
  let skipped = 0;
  for (let r = headerIdx + 1; r < rows.length; r++) {
    if (!rows[r].trim()) continue;
    const cells = splitCsvLine(rows[r]).map((c) => c.trim());
    const first = idx.firstName >= 0 ? cells[idx.firstName] ?? '' : '';
    const last = idx.lastName >= 0 ? cells[idx.lastName] ?? '' : '';
    const full = idx.fullName >= 0 ? cells[idx.fullName] ?? '' : '';
    const fullName = (full || [first, last].filter(Boolean).join(' ')).trim();
    if (!fullName) { skipped++; continue; }
    contacts.push({
      firstName: first || null,
      lastName: last || null,
      fullName,
      email: idx.email >= 0 ? cells[idx.email]?.trim() || null : null,
      phone: idx.phone >= 0 ? cells[idx.phone]?.trim() || null : null,
      company: idx.company >= 0 ? cells[idx.company]?.trim() || null : null,
      title: idx.title >= 0 ? cells[idx.title]?.trim() || null : null,
      linkedinUrl: idx.linkedinUrl >= 0 ? cells[idx.linkedinUrl]?.trim() || null : null,
      location: idx.location >= 0 ? cells[idx.location]?.trim() || null : null,
    });
  }

  return {
    format,
    contacts,
    skipped,
    totalRows: rows.length - headerIdx - 1,
  };
}

export function formatLabel(format: CrmFormat): string {
  switch (format) {
    case 'linkedin': return 'LinkedIn export';
    case 'hubspot': return 'HubSpot export';
    case 'attio': return 'Attio export';
    case 'folk': return 'Folk export';
    default: return 'CSV import';
  }
}

// Alias re-export so the caller can fall back to the LinkedIn-specific
// shape if they already have it wired up.
export type { LinkedInConnection };

// Parser for LinkedIn's "Connections.csv" export.
// Format: UTF-8 with BOM, a "Notes:" preamble (~3-5 lines), then a header row:
//   First Name,Last Name,URL,Email Address,Company,Position,Connected On
// Tolerant to: BOM, Windows line endings, quoted fields with embedded commas,
// missing optional fields, header-only files, and the preamble.

export interface LinkedInConnection {
  firstName: string;
  lastName: string;
  fullName: string;
  url: string;
  email: string;
  company: string;
  position: string;
  connectedOn: string;
}

interface ParseResult {
  connections: LinkedInConnection[];
  skipped: number;
  totalRows: number;
  warning?: string;
}

// RFC-4180-ish line splitter that respects quoted fields.
const splitCsvLine = (line: string): string[] => {
  const cells: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        cells.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
  }
  cells.push(cur);
  return cells;
};

// Split CSV content into logical rows, respecting quoted newlines.
const splitCsvRows = (text: string): string[] => {
  const rows: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '""';
        i++;
      } else {
        inQuotes = !inQuotes;
        cur += ch;
      }
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
};

const HEADER_MARKERS = ['First Name', 'first name'];

export const parseLinkedInCsv = (raw: string): ParseResult => {
  if (!raw) return { connections: [], skipped: 0, totalRows: 0, warning: 'Empty file' };

  // Strip UTF-8 BOM
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;

  const rows = splitCsvRows(text);
  if (!rows.length) return { connections: [], skipped: 0, totalRows: 0, warning: 'No rows' };

  // Find the real header row (skip any "Notes:" preamble)
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const sample = rows[i].slice(0, 20);
    if (HEADER_MARKERS.some((m) => sample.startsWith(m))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) {
    return { connections: [], skipped: 0, totalRows: rows.length, warning: 'Could not find a First Name header. Is this a LinkedIn connections export?' };
  }

  const header = splitCsvLine(rows[headerIdx]).map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name.toLowerCase());
  const idxFirst = col('First Name');
  const idxLast = col('Last Name');
  const idxUrl = col('URL');
  const idxEmail = col('Email Address');
  const idxCompany = col('Company');
  const idxPosition = col('Position');
  const idxConnected = col('Connected On');

  const connections: LinkedInConnection[] = [];
  let skipped = 0;

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const line = rows[i];
    if (!line.trim()) continue;
    const cells = splitCsvLine(line).map((c) => c.trim());
    const firstName = idxFirst >= 0 ? cells[idxFirst] ?? '' : '';
    const lastName = idxLast >= 0 ? cells[idxLast] ?? '' : '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    if (!fullName) {
      skipped++;
      continue;
    }
    connections.push({
      firstName,
      lastName,
      fullName,
      url: idxUrl >= 0 ? cells[idxUrl] ?? '' : '',
      email: idxEmail >= 0 ? cells[idxEmail] ?? '' : '',
      company: idxCompany >= 0 ? cells[idxCompany] ?? '' : '',
      position: idxPosition >= 0 ? cells[idxPosition] ?? '' : '',
      connectedOn: idxConnected >= 0 ? cells[idxConnected] ?? '' : '',
    });
  }

  return { connections, skipped, totalRows: rows.length - headerIdx - 1 };
};

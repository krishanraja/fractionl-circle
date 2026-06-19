// Live data layer for the thesis app. validate-thesis runs the research + structuring
// and persists the run server-side (RLS, user-owned); we read the latest run back.
import { supabase } from '@/integrations/supabase/client';
import type { Scorecard } from './thesisViews';

export async function getLatestRun(userId: string): Promise<Scorecard | null> {
  const { data } = await supabase
    .from('thesis_runs')
    .select('result')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data as { result?: Scorecard } | null)?.result) ?? null;
}

export async function getRunCount(userId: string): Promise<number> {
  const { count } = await supabase.from('thesis_runs').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  return count ?? 0;
}

export interface CircleP { id: string; name: string; title: string | null; company: string | null; note?: string | null; source?: string | null }

export async function getCircle(userId: string): Promise<CircleP[]> {
  const { data } = await supabase
    .from('circle_person')
    .select('id, display_name, title, company, note, source')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(500);
  return ((data as Array<{ id: string; display_name: string; title: string | null; company: string | null; note: string | null; source: string | null }>) ?? [])
    .map((p) => ({ id: p.id, name: p.display_name, title: p.title, company: p.company, note: p.note, source: p.source }));
}

// Screenshot -> Gemini vision -> a person added to the circle. Throws the honest error message.
export async function addContactFromImage(dataUrl: string): Promise<CircleP> {
  const { data, error } = await supabase.functions.invoke('extract-contact', { body: { image: dataUrl } });
  if (error) {
    // supabase wraps non-2xx as error; try to surface the function's message.
    const ctx = (error as { context?: { body?: string } })?.context?.body;
    let msg = 'Could not read that image. Try a sharper screenshot.';
    try { if (ctx) msg = JSON.parse(ctx).error || msg; } catch { /* keep default */ }
    throw new Error(msg);
  }
  const d = data as { person?: { id: string; display_name: string; title: string | null; company: string | null; note: string | null }; error?: string };
  if (d.error || !d.person) throw new Error(d.error || 'Could not read that image.');
  return { id: d.person.id, name: d.person.display_name, title: d.person.title, company: d.person.company, note: d.person.note, source: 'screenshot' };
}

// Parse one CSV line, honoring simple double-quoted fields.
function parseCsvLine(line: string): string[] {
  const out: string[] = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur); return out;
}

// Import a LinkedIn Connections.csv export into the circle. Returns the count added.
export async function importConnectionsCsv(userId: string, text: string): Promise<number> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const headerIdx = lines.findIndex((l) => /first name/i.test(l) && /last name/i.test(l));
  if (headerIdx < 0) throw new Error('That does not look like a LinkedIn Connections export. Upload the Connections.csv file.');
  const header = parseCsvLine(lines[headerIdx]).map((h) => h.trim().toLowerCase());
  const ix = (n: string) => header.findIndex((h) => h === n);
  const fi = ix('first name'), li = ix('last name'), ci = ix('company'), pi = ix('position');
  const rows: Array<{ user_id: string; display_name: string; company: string | null; title: string | null; source: string }> = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const f = parseCsvLine(lines[i]);
    const name = `${(f[fi] || '').trim()} ${(f[li] || '').trim()}`.trim();
    if (!name) continue;
    rows.push({ user_id: userId, display_name: name, company: (ci >= 0 ? f[ci]?.trim() : '') || null, title: (pi >= 0 ? f[pi]?.trim() : '') || null, source: 'linkedin_csv' });
  }
  if (!rows.length) return 0;
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from('circle_person').insert(rows.slice(i, i + 500));
    if (error) throw error;
  }
  return rows.length;
}

export async function runValidation(thesis: string, linkedin: string, background: string): Promise<Scorecard> {
  const { data, error } = await supabase.functions.invoke('validate-thesis', {
    body: { thesis, linkedin_url: linkedin || undefined, background: background || undefined },
  });
  if (error) throw error;
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data as Scorecard;
}

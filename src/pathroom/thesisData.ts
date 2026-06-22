// Live data layer for the thesis app. validate-thesis runs the research + structuring
// and persists the run server-side (RLS, user-owned); we read the latest run back.
import { supabase } from '@/integrations/supabase/client';
import type { Scorecard } from './thesisViews';
import { judgeLocal, type Verdict, type JudgeKind } from './thesisJudge';

export interface RunFull { id: string; result: Scorecard; stepProgress: number[]; thesis: string; background: string }

// The latest saved run, with its id, the thesis/background that produced it, and step
// progress (the journey loop and re-runs read this back).
export async function getLatestRunFull(userId: string): Promise<RunFull | null> {
  const { data } = await supabase
    .from('thesis_runs')
    .select('id, result, step_progress, thesis, background')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const r = data as { id: string; result: Scorecard; step_progress: unknown; thesis: string | null; background: string | null } | null;
  if (!r?.result) return null;
  return { id: r.id, result: r.result, stepProgress: Array.isArray(r.step_progress) ? (r.step_progress as number[]) : [], thesis: r.thesis || '', background: r.background || '' };
}

// Mark which journey steps are done, on the latest run.
export async function saveStepProgress(runId: string, indices: number[]): Promise<void> {
  const { error } = await supabase.from('thesis_runs').update({ step_progress: indices }).eq('id', runId);
  if (error) throw error;
}

// The cheap sufficiency gate (judge-thesis edge fn), with a deterministic local fallback
// so the dialogue always gets a verdict even if the model call fails.
export async function judgeThesis(thesis: string, round = 0): Promise<Verdict> {
  try {
    const { data, error } = await supabase.functions.invoke('judge-thesis', { body: { thesis, round } });
    if (error) throw error;
    const d = data as Partial<Verdict> | null;
    if (!d?.kind) throw new Error('no verdict');
    return { kind: d.kind as JudgeKind, followup: d.followup || '', distilled: d.distilled || '', options: Array.isArray(d.options) ? d.options : [] };
  } catch {
    return judgeLocal(thesis, round);
  }
}

export interface AdmireResult { ok: boolean; name?: string; positioning?: string | null; kind?: 'business' | 'person' | 'competitor'; field?: string | null; reject?: string }

// Screenshot of a business the user admires -> Gemini reads its positioning to sharpen the
// thesis. Writes nothing to the circle. Honest reject when unreadable.
export async function extractAdmire(dataUrl: string, thesis: string): Promise<AdmireResult> {
  const { data, error } = await supabase.functions.invoke('extract-admire', { body: { image: dataUrl, thesis } });
  if (error) {
    const ctx = (error as { context?: { body?: string } })?.context?.body;
    let msg = 'I could not read a profile or business in that clearly. Try a sharper screenshot, or tell me in one line what they do.';
    try { if (ctx) msg = JSON.parse(ctx).error || msg; } catch { /* keep default */ }
    return { ok: false, reject: msg };
  }
  return data as AdmireResult;
}

// Save an admired business + why, which validate-thesis reads to sharpen "Your edge".
export async function saveInspiration(userId: string, insp: { name: string; positioning?: string | null; kind?: string; field?: string | null; why: string }): Promise<void> {
  const { error } = await supabase.from('thesis_inspiration').insert({
    user_id: userId, name: insp.name, positioning: insp.positioning ?? null, kind: insp.kind ?? 'business', field: insp.field ?? null, why: insp.why,
  });
  if (error) throw error;
}

export interface MarketPulse {
  market: { score: number; label: string; delta: number | null } | null;
  role: { key: string; label: string; demand: number | null; band: string | null; deltaPct: number | null } | null;
  rising: string | null;
  asOf: string | null;
}

// Live market movement (role-level) from the sister product fractionl-pulse, via the
// market-pulse edge fn. Returns null on any failure so the Home degrades gracefully.
export async function getMarketPulse(thesis: string): Promise<MarketPulse | null> {
  try {
    const { data, error } = await supabase.functions.invoke('market-pulse', { body: { thesis } });
    if (error) throw error;
    return data as MarketPulse;
  } catch { return null; }
}

export async function getInspirationCount(userId: string): Promise<number> {
  const { count } = await supabase.from('thesis_inspiration').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  return count ?? 0;
}

export async function getLatestRun(userId: string): Promise<Scorecard | null> {
  const full = await getLatestRunFull(userId);
  return full?.result ?? null;
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

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
  market: {
    score: number; label: string; delta: number | null;
    emoji?: string | null;
    scale?: string | null; // human scale legend, e.g. "45-59 Stable"
    components?: { demand: number | null; supply: number | null; culture: number | null } | null;
  } | null;
  role: {
    key: string; label: string; demand: number | null; band: string | null; deltaPct: number | null;
    rank?: number | null; total?: number | null; // rank by demand among the tracked roles
    insight?: string | null; // this-week human read, e.g. "124 jobs — below market average"
  } | null;
  rising: string | null; // kept: the single top theme label (back-compat)
  themes?: { label: string; summary?: string | null; breakout?: boolean; angle?: string | null }[] | null;
  asOf: string | null;
  nextUpdate?: string | null; // ISO date/time of the next Pulse refresh
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

export async function getCircleCount(userId: string): Promise<number> {
  const { count } = await supabase.from('circle_person').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  return count ?? 0;
}

// People you've actually spoken to, but not in 30+ days — the honest "going quiet"
// signal (people never contacted, e.g. raw CSV rows, are deliberately excluded so
// we never nag about strangers). Powers the return surface.
export async function getGoingQuietCount(userId: string): Promise<number> {
  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { count } = await supabase
    .from('circle_person')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('last_interaction_at', 'is', null)
    .lt('last_interaction_at', cutoff);
  return count ?? 0;
}

// The actual people behind getGoingQuietCount — spoken to before, but quiet for
// 30+ days — with the fields the warm-reach drawer needs to offer one-tap reach.
// Warmest first, so the most worth-saving relationships surface at the top. Never
// includes never-contacted rows (last_interaction_at is null), so we never nag
// strangers. RLS scopes to the owner.
export interface QuietPerson {
  id: string;
  display_name: string;
  title: string | null;
  company: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  linkedin_url: string | null;
  handles: unknown;
  last_interaction_at: string | null;
}

export async function getGoingQuietPeople(userId: string, limit = 20): Promise<QuietPerson[]> {
  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data } = await supabase
    .from('circle_person')
    .select('id, display_name, title, company, primary_email, primary_phone, linkedin_url, handles, last_interaction_at')
    .eq('user_id', userId)
    .not('last_interaction_at', 'is', null)
    .lt('last_interaction_at', cutoff)
    .order('warmth', { ascending: false, nullsFirst: false })
    .limit(limit);
  return (data as QuietPerson[]) ?? [];
}

// Persist the first-run "about you" into the existing identity columns. Best-effort:
// never block onboarding if the write fails (the run itself is what matters).
export async function saveAboutYou(userId: string, fields: { target_buyer?: string; positioning?: string; first_run_transcript?: string }): Promise<void> {
  try {
    await supabase.from('user_profiles').update(fields).eq('id', userId);
  } catch { /* non-fatal */ }
}

// Stamp the first-run as done so the app stops showing onboarding and the
// re-engagement surfaces can reason about "new vs returning".
export async function markFirstRunComplete(userId: string): Promise<void> {
  const now = new Date().toISOString();
  try {
    await supabase.from('user_profiles')
      .update({ onboarding_completed: true, onboarding_completed_at: now, first_run_completed_at: now })
      .eq('id', userId);
  } catch { /* non-fatal: a saved run already gates first-run */ }
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

// People to reach, with a grounded reason and a ready-to-send draft, from the
// warm-digest edge fn (the same brain the Monday email uses). Powers the warm-reach
// step's actual action. Without context it's the cooling cohort; WITH a plan+move
// context it's the people who FIT that idea (why_fit set), drafted around it.
export interface ReachPerson {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  email: string | null;
  linkedin_url: string | null;
  band: string;
  recency_days: number | null;
  why_now: string;
  why_fit?: string | null; // set on a path-focused reach: why this person fits THIS move
  subject: string;
  message: string;
}

export interface ReachContext { thesis: string; move?: string | null }

// Pass a { thesis, move } context to surface people who fit that specific plan/move
// (path-focused reach); omit it for the classic going-quiet digest.
export async function getWarmDigest(context?: ReachContext): Promise<ReachPerson[]> {
  const body = context?.thesis?.trim() ? { context: { thesis: context.thesis, move: context.move ?? null } } : {};
  const { data, error } = await supabase.functions.invoke('warm-digest', { body });
  if (error) throw error;
  const d = data as { people?: ReachPerson[] } | null;
  return Array.isArray(d?.people) ? d!.people! : [];
}

// The proactive sharpen question: the single highest-leverage thing to decide
// next, from the next-question edge fn (weakest read dimension, decision-shaped).
export interface NextQuestion {
  run_id: string | null;
  dimension: string;
  topic: string;
  question: string;
  why: string;
  options: string[];
  source?: string;
}

// `focus` (a journey move's title/why) biases the question toward THAT move instead
// of the whole thesis; omit it for the general weakest-dimension question.
export async function getNextQuestion(focus?: string): Promise<NextQuestion | null> {
  try {
    const body = focus?.trim() ? { focus: focus.trim() } : {};
    const { data, error } = await supabase.functions.invoke('next-question', { body });
    if (error) throw error;
    const d = data as NextQuestion | null;
    return d?.question ? d : null;
  } catch {
    return null;
  }
}

// Persist a decision the user made. validate-thesis folds unapplied answers into
// the next read, raising the strength score.
export async function saveThesisAnswer(a: { run_id: string | null; dimension: string; topic: string; question: string; answer: string }): Promise<void> {
  const { error } = await supabase.from('thesis_answers').insert({
    run_id: a.run_id, dimension: a.dimension, topic: a.topic, question: a.question, answer: a.answer,
  });
  if (error) throw error;
}

// How many answers are banked but not yet folded into a read — the provisional
// score lift the user has earned but not locked in.
export async function getUnrunAnswerCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('thesis_answers')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('applied_at', null);
  return count ?? 0;
}

// Record that the user reached out: stamp last_interaction_at = now so warmth
// recovers and the person stops surfacing as cold. RLS scopes to the owner.
export async function markReachedOut(personId: string): Promise<void> {
  const { error } = await supabase
    .from('circle_person')
    .update({ last_interaction_at: new Date().toISOString() })
    .eq('id', personId);
  if (error) throw error;
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

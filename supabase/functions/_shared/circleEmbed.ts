// Shared embedding logic for the semantic people-search, used by embed-circle
// (on-demand), cron-embed-circle (nightly backfill) and search-network (just-in-time
// top-up). Keeping compose + backfill here means all three embed the SAME blob the
// same way, so vectors stay comparable and staleness detection is exact.
import { embed } from './llm.ts';

// deno-lint-ignore no-explicit-any
type Db = any;

interface PersonRow {
  id: string;
  display_name: string;
  title: string | null;
  company: string | null;
  tags: string[] | null;
  note: string | null;
  dossier: Record<string, unknown> | null;
  embedding_text?: string | null;
}

const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);

// The deterministic text we embed for a person. Deterministic so the SAME person
// with the SAME data always produces the SAME string — that's what lets backfill
// detect drift (composed != stored embedding_text) and re-embed only what changed.
export function composeEmbedText(p: PersonRow): string {
  const d = p.dossier ?? {};
  const lines: string[] = [];
  lines.push(p.display_name);
  const role = [p.title, p.company].filter(Boolean).join(' at ');
  if (role) lines.push(role);
  if (p.tags?.length) lines.push('Tags: ' + p.tags.slice(0, 12).join(', '));
  if (p.note) lines.push(trunc(p.note, 400));

  const summary = typeof d.summary === 'string' ? d.summary : (typeof d.llm_summary === 'string' ? d.llm_summary : '');
  if (summary) lines.push(trunc(summary, 600));

  const exp = Array.isArray(d.experience) ? d.experience : [];
  const past = exp
    .map((e) => (e && typeof e === 'object' ? [(e as Record<string, unknown>).title, (e as Record<string, unknown>).company].filter(Boolean).join(' at ') : ''))
    .filter(Boolean)
    .slice(0, 8);
  if (past.length) lines.push('Past: ' + past.join('; '));

  const edu = Array.isArray(d.education) ? d.education : [];
  const schools = edu
    .map((e) => (e && typeof e === 'object' ? [(e as Record<string, unknown>).degree, (e as Record<string, unknown>).school].filter(Boolean).join(', ') : ''))
    .filter(Boolean)
    .slice(0, 4);
  if (schools.length) lines.push('Education: ' + schools.join('; '));

  const skills = Array.isArray(d.skills) ? d.skills.filter((s) => typeof s === 'string').slice(0, 15) : [];
  if (skills.length) lines.push('Skills: ' + skills.join(', '));

  return lines.join('\n').trim();
}

// pgvector accepts its literal text form: [0.1,0.2,...]. Sending the array as a
// string lets PostgREST cast it into the vector column without a custom RPC.
export const vecToStr = (v: number[]): string => '[' + v.join(',') + ']';

interface BackfillOpts {
  /** Scope to one user (search / embed-circle). Omit for a cross-user cron sweep. */
  userId?: string;
  /** Max rows to actually (re)embed in this call. */
  limit?: number;
  /** How many candidate rows to scan for staleness before slicing to `limit`. */
  window?: number;
}

// Embed the people whose composed blob has changed (or was never embedded),
// prioritising never-embedded then oldest. Best-effort and bounded: returns the
// count embedded, 0 when nothing is stale or embeddings are unavailable (no key).
export async function backfillEmbeddings(supabase: Db, opts: BackfillOpts = {}): Promise<number> {
  const { userId, limit = 40, window = 200 } = opts;
  let q = supabase
    .from('circle_person')
    .select('id, display_name, title, company, tags, note, dossier, embedding_text')
    .order('embedded_at', { ascending: true, nullsFirst: true })
    .limit(window);
  if (userId) q = q.eq('user_id', userId);

  const { data } = await q;
  const rows = (data ?? []) as PersonRow[];

  const stale: Array<{ id: string; text: string }> = [];
  for (const r of rows) {
    const text = composeEmbedText(r);
    if (text && text !== r.embedding_text) stale.push({ id: r.id, text });
    if (stale.length >= limit) break;
  }
  if (!stale.length) return 0;

  const vecs = await embed(stale.map((s) => s.text));
  if (!vecs) return 0; // no OpenAI key / call failed → caller falls back to keyword

  const now = new Date().toISOString();
  let n = 0;
  await Promise.all(stale.map(async (s, i) => {
    const { error } = await supabase
      .from('circle_person')
      .update({ embedding: vecToStr(vecs[i]), embedding_text: s.text, embedded_at: now })
      .eq('id', s.id);
    if (!error) n += 1;
  }));
  return n;
}

// The "keep your circle warm" digest brain. Pure-ish: given a user, pick the few
// people who were warm and have gone quiet, and draft a grounded, in-their-voice
// touch for each. Shared by warm-digest (on-demand preview, user JWT) and
// cron-warm-digest (weekly delivery, service role) so both speak with one brain.
//
// It does NOT send anything and writes nothing - selection + drafting only. The
// caller decides how to deliver (email, push, in-app).

// deno-lint-ignore-file no-explicit-any
import { chatJSON, embed } from './llm.ts';
import { recencyDays } from './grounding.ts';
import { loadProfileContext, profilePromptBlock } from './profileContext.ts';
import { loadUserAiPreferences, personalitySystemSuffix } from './aiPersonality.ts';
import { backfillEmbeddings, vecToStr } from './circleEmbed.ts';

// A person must have gone at least this quiet to be worth a nudge - below this
// they were contacted recently and a reminder would just be nagging.
const COOL_DAYS = 30;
// Only people who were genuinely warm are worth resurfacing.
const WARM_FLOOR = 0.4;
// How many to put in one digest. Small on purpose: a senior leader will act on
// three, not thirty.
const COHORT_SIZE = 5;
// How wide to look before ranking.
const SCAN_LIMIT = 80;
const MESSAGE_MAX = 900;
const SUBJECT_MAX = 120;
const WHY_MAX = 200;

export type WarmthBand = 'warm' | 'cooling' | 'cold';

export interface DigestPerson {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  email: string | null;
  linkedin_url: string | null;
  warmth: number | null;
  band: WarmthBand;
  recency_days: number | null;
  why_now: string;
  why_fit?: string | null; // set on a path-focused reach: why this person fits THIS move
  subject: string;
  message: string;
}

export interface WarmDigest {
  people: DigestPerson[];
  generated_at: string;
}

// When present, the reach is focused on a SPECIFIC plan + move (from the journey),
// so we select people by fit to the idea (semantic match) rather than by who has
// gone quiet, and we draft the touch around that idea. Absent → the classic
// warmth/going-quiet digest (the nightly cron + Circle-side reach keep that).
export interface DigestContext {
  thesis: string;
  move?: string | null;
}

interface CircleRow {
  id: string;
  display_name: string;
  company: string | null;
  title: string | null;
  primary_email: string | null;
  linkedin_url: string | null;
  warmth: number | null;
  last_interaction_at: string | null;
}

interface PersonSignalRow {
  circle_person_id: string | null;
  kind: string;
  headline: string;
  occurred_at: string | null;
  created_at: string;
}

export const bandFor = (warmth: number | null, recency: number | null): WarmthBand => {
  // Recency dominates the felt "is this cold": a high stored warmth that has not
  // been refreshed in months still reads as cold to the user.
  if (recency !== null && recency >= 90) return 'cold';
  if ((warmth ?? 0) >= 0.6 && (recency === null || recency < COOL_DAYS)) return 'warm';
  if (recency !== null && recency >= COOL_DAYS) return 'cooling';
  return (warmth ?? 0) >= 0.6 ? 'warm' : 'cooling';
};

// Rank: warm relationships that have gone quiet. Quiet but not warm → skip.
// Score rewards warmth and how overdue a touch is, so the warmest overdue
// people float to the top.
const score = (warmth: number | null, recency: number | null): number => {
  const w = warmth ?? 0;
  const r = recency ?? 365; // never contacted reads as long overdue
  if (w < WARM_FLOOR) return -1; // not warm enough to bother
  if (r < COOL_DAYS) return -1; // touched too recently to nudge
  const overdue = Math.min(1, (r - COOL_DAYS) / 120); // ramps over ~4 months
  return w * (0.5 + 0.5 * overdue);
};

const clamp = (s: string | null | undefined, max: number): string =>
  (s ?? '').toString().trim().slice(0, max);

const firstName = (name: string): string => name.trim().split(/\s+/)[0] || name.trim();

// Honest, non-invented fallback when the LLM is unavailable: a plain check-in
// grounded only in facts we actually have (name, company, how long it's been).
const fallbackDraft = (p: CircleRow, recency: number | null): { subject: string; message: string; why_now: string } => {
  const fn = firstName(p.display_name);
  const where = p.company ? ` at ${p.company}` : '';
  const howLong = recency === null ? 'a while' : `about ${recency} days`;
  return {
    why_now: `It has been ${howLong} since you last connected.`,
    subject: `Catching up`,
    message: `Hi ${fn},\n\nIt has been ${howLong} since we last spoke and you came to mind${where ? `,${where}` : ''}. I would love to hear how things are going on your side. Open to a quick catch-up in the next couple of weeks?\n\nBest`,
  };
};

const SYSTEM = `You are a fractional executive's chief of staff. They have a handful of people in their network who have gone quiet, and you are writing each one a short, warm reach-out so the relationship does not cool further.

For EACH person return:
- "why_now": one tight sentence, addressed to the user, on why now is the moment to reach out. Ground it in a real fact you are given (how long it has been, their title/company, or a recent signal). Never invent an event.
- "subject": a short, human email subject. No marketing tone.
- "message": a short draft (3 to 5 sentences) the user could send almost as-is. Warm, specific, in a senior peer's voice. Open with their first name. Reference the real relationship or a given fact. Make a light, concrete ask (a catch-up, a quick call). NEVER invent meetings, projects, mutual friends, or news that you were not given. If you have little to go on, a genuine "it has been too long, I'd love to reconnect" is correct - do not manufacture specifics.

Return ONLY JSON: { "people": [ { "id": string, "why_now": string, "subject": string, "message": string } ] }
Use each person's exact id. Plain language, no jargon, no em dashes.`;

// The path-focused variant: the user is on a specific move for a specific idea, and
// these people were chosen because they FIT that idea. The draft is about the idea,
// not "it has been a while".
const CONTEXT_SYSTEM = `You are a fractional executive's chief of staff. The user is pushing ONE specific move forward for their business idea, and you are given a shortlist of REAL people from their network who best fit that idea (matched on their profile). Write each one a short, warm reach-out about THIS idea.

You are given the user's idea and their current move. For EACH person return:
- "why_fit": one tight sentence, addressed to the user, on why THIS person is worth reaching for THIS idea/move - ground it in a real fact about them (their title, company, or background). This is about fit to the idea, NOT how long it has been.
- "subject": a short, human email subject tied to the idea. No marketing tone.
- "message": a short draft (3 to 5 sentences) reaching out about this specific idea/move. Warm, specific, in a senior peer's voice. Open with their first name. Reference a real fact about them and why they came to mind for this. Make a light, concrete ask (a quick call about the idea, their read on it, or an intro). NEVER invent meetings, projects, mutual friends, or news you were not given.

Return ONLY JSON: { "people": [ { "id": string, "why_fit": string, "subject": string, "message": string } ] }
Use each person's exact id. Plain language, no jargon, no em dashes.`;

// Relevance floor: below this cosine similarity a match is too weak to call a fit.
const FIT_FLOOR = 0.15;

// The voice correction loop: the drafts the user actually EDITED before sending
// (recorded by ReachOut into draft_edits) are the truest sample of how they
// write. A few of those, few-shotted into the drafting call, pull every future
// draft toward their real voice instead of a generic one. Day one (no edits yet)
// the profile envelope's "in their own words" transcript carries the voice.
const VOICE_SAMPLES = 6;
const VOICE_SAMPLE_MAX = 500;

async function loadVoiceSamples(supabase: any, userId: string): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('draft_edits')
      .select('final')
      .eq('user_id', userId)
      .eq('edited', true)
      .order('created_at', { ascending: false })
      .limit(VOICE_SAMPLES);
    return ((data ?? []) as Array<{ final: string }>)
      .map((r) => clamp(r.final, VOICE_SAMPLE_MAX))
      .filter(Boolean);
  } catch (_e) {
    return [];
  }
}

export function voicePromptBlock(samples: string[]): string {
  if (!samples.length) return '';
  return `\n\nHOW THIS USER ACTUALLY WRITES - real messages they edited and sent. Match this voice (length, warmth, phrasing, sign-off), never a generic one:\n${samples.map((s, i) => `${i + 1}) ${s}`).join('\n')}`;
}

interface Ranked { p: CircleRow; recency: number | null; s: number; similarity?: number }

// Pick the people who best FIT a specific idea/move via the semantic embedding
// search (match_circle_persons), lightly boosted by warmth so a warm good-fit
// outranks a cold one. Returns null when embeddings/matches are unavailable, so
// the caller can fall back to the warmth digest rather than showing nothing.
async function selectByRelevance(
  userId: string,
  supabase: any,
  now: number,
  context: DigestContext,
): Promise<Ranked[] | null> {
  const queryText = [context.thesis, context.move].filter(Boolean).join(' - ').trim();
  if (!queryText) return null;
  try { await backfillEmbeddings(supabase, { userId, limit: 40 }); } catch (_e) { /* best-effort */ }
  const vecs = await embed([
    `People in my network who could be a first client for, or introduce me to a buyer for: ${queryText}`,
  ]);
  if (!vecs || !vecs[0]) return null;

  let sem: Array<{ id: string; similarity: number }> = [];
  try {
    const { data } = await supabase.rpc('match_circle_persons', {
      query_embedding: vecToStr(vecs[0]),
      match_count: 40,
    });
    sem = (data ?? []) as Array<{ id: string; similarity: number }>;
  } catch (_e) {
    return null;
  }
  if (!sem.length) return null;

  const simById = new Map(sem.map((r) => [r.id, r.similarity]));
  const ids = sem.map((r) => r.id);
  const { data: circleData } = await supabase
    .from('circle_person')
    .select('id, display_name, company, title, primary_email, linkedin_url, warmth, last_interaction_at')
    .eq('user_id', userId)
    .in('id', ids);
  const circle = (circleData ?? []) as CircleRow[];

  const ranked = circle
    .map((p) => {
      const recency = recencyDays(p.last_interaction_at, now);
      const similarity = simById.get(p.id) ?? 0;
      // relevance dominates; warmth is a light tiebreak so a warm fit edges a cold one.
      const s = similarity + 0.15 * (p.warmth ?? 0);
      return { p, recency, similarity, s };
    })
    .filter((r) => (r.similarity ?? 0) >= FIT_FLOOR)
    .sort((a, b) => b.s - a.s)
    .slice(0, COHORT_SIZE);

  return ranked.length ? ranked : null;
}

export async function buildWarmDigestForUser(
  userId: string,
  supabase: any,
  now: number = Date.now(),
  context?: DigestContext,
): Promise<WarmDigest> {
  const generated_at = new Date(now).toISOString();

  // Path-focused reach: select people who FIT the idea/move. Falls back to the
  // warmth digest if embeddings/matches aren't available, so we never dead-end.
  let ranked: Ranked[] | null = null;
  let focused = false;
  if (context?.thesis && context.thesis.trim()) {
    ranked = await selectByRelevance(userId, supabase, now, context);
    focused = !!ranked;
  }

  if (!ranked) {
    const { data: circleData, error } = await supabase
      .from('circle_person')
      .select('id, display_name, company, title, primary_email, linkedin_url, warmth, last_interaction_at')
      .eq('user_id', userId)
      .order('warmth', { ascending: false, nullsFirst: false })
      .limit(SCAN_LIMIT);
    if (error) throw error;

    const circle = (circleData ?? []) as CircleRow[];
    ranked = circle
      .map((p) => {
        const recency = recencyDays(p.last_interaction_at, now);
        return { p, recency, s: score(p.warmth, recency) };
      })
      .filter((r) => r.s >= 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, COHORT_SIZE);
  }

  if (!ranked.length) return { people: [], generated_at };

  // Latest person-signal per chosen person, for a grounded "why now".
  const ids = ranked.map((r) => r.p.id);
  const signalByPerson = new Map<string, PersonSignalRow>();
  try {
    const { data: sigs } = await supabase
      .from('signals')
      .select('circle_person_id, kind, headline, occurred_at, created_at')
      .eq('user_id', userId)
      .eq('subject', 'person')
      .in('circle_person_id', ids)
      .order('created_at', { ascending: false })
      .limit(200);
    for (const s of (sigs ?? []) as PersonSignalRow[]) {
      if (!s.circle_person_id) continue;
      if (!signalByPerson.has(s.circle_person_id)) signalByPerson.set(s.circle_person_id, s);
    }
  } catch (_e) {
    // No signal grounding is fine; recency still grounds the touch.
  }

  // Try to draft with the LLM, anchored to the specific user. Any failure falls
  // back to honest, fact-only drafts so the digest still ships. On a focused reach
  // the draft is grounded in the idea/move; otherwise in the cooling relationship.
  let drafted = new Map<string, { why: string; subject: string; message: string }>();
  try {
    const profileBlock = profilePromptBlock(await loadProfileContext(supabase, userId));
    const prefs = await loadUserAiPreferences(supabase, userId);
    const voiceBlock = voicePromptBlock(await loadVoiceSamples(supabase, userId));
    const baseSystem = focused ? CONTEXT_SYSTEM : SYSTEM;
    const system = baseSystem + profileBlock + voiceBlock + personalitySystemSuffix(prefs?.ai_personality);
    const user = JSON.stringify({
      idea: focused ? context?.thesis ?? '' : undefined,
      move: focused ? context?.move ?? null : undefined,
      people: ranked.map((r) => {
        const sig = signalByPerson.get(r.p.id);
        return {
          id: r.p.id,
          name: r.p.display_name,
          title: r.p.title,
          company: r.p.company,
          recency_days: r.recency,
          recent_signal: sig ? { kind: sig.kind, headline: sig.headline } : null,
        };
      }),
    });
    const { content } = await chatJSON({ system, user, temperature: 0.4, maxTokens: 1400 });
    const parsed = JSON.parse(content);
    const out = Array.isArray(parsed?.people) ? parsed.people : [];
    for (const row of out as Array<{ id?: string; why_now?: string; why_fit?: string; subject?: string; message?: string }>) {
      if (!row?.id || typeof row.message !== 'string' || !row.message.trim()) continue;
      drafted.set(row.id, {
        why: clamp(focused ? (row.why_fit ?? row.why_now) : row.why_now, WHY_MAX),
        subject: clamp(row.subject, SUBJECT_MAX) || 'Catching up',
        message: clamp(row.message, MESSAGE_MAX),
      });
    }
  } catch (_e) {
    drafted = new Map();
  }

  const people: DigestPerson[] = ranked.map((r) => {
    const fb = fallbackDraft(r.p, r.recency);
    const d = drafted.get(r.p.id) ?? { why: fb.why_now, subject: fb.subject, message: fb.message };
    return {
      id: r.p.id,
      name: r.p.display_name,
      title: r.p.title,
      company: r.p.company,
      email: r.p.primary_email,
      linkedin_url: r.p.linkedin_url,
      warmth: r.p.warmth,
      band: bandFor(r.p.warmth, r.recency),
      recency_days: r.recency,
      why_now: d.why,
      why_fit: focused ? d.why : null,
      subject: d.subject,
      message: d.message,
    };
  });

  return { people, generated_at };
}

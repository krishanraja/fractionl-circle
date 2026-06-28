// The "keep your circle warm" digest brain. Pure-ish: given a user, pick the few
// people who were warm and have gone quiet, and draft a grounded, in-their-voice
// touch for each. Shared by warm-digest (on-demand preview, user JWT) and
// cron-warm-digest (weekly delivery, service role) so both speak with one brain.
//
// It does NOT send anything and writes nothing — selection + drafting only. The
// caller decides how to deliver (email, push, in-app).

// deno-lint-ignore-file no-explicit-any
import { chatJSON } from './llm.ts';
import { recencyDays } from './grounding.ts';
import { loadProfileContext, profilePromptBlock } from './profileContext.ts';
import { loadUserAiPreferences, personalitySystemSuffix } from './aiPersonality.ts';

// A person must have gone at least this quiet to be worth a nudge — below this
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
  subject: string;
  message: string;
}

export interface WarmDigest {
  people: DigestPerson[];
  generated_at: string;
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
- "message": a short draft (3 to 5 sentences) the user could send almost as-is. Warm, specific, in a senior peer's voice. Open with their first name. Reference the real relationship or a given fact. Make a light, concrete ask (a catch-up, a quick call). NEVER invent meetings, projects, mutual friends, or news that you were not given. If you have little to go on, a genuine "it has been too long, I'd love to reconnect" is correct — do not manufacture specifics.

Return ONLY JSON: { "people": [ { "id": string, "why_now": string, "subject": string, "message": string } ] }
Use each person's exact id. Plain language, no jargon, no em dashes.`;

export async function buildWarmDigestForUser(
  userId: string,
  supabase: any,
  now: number = Date.now(),
): Promise<WarmDigest> {
  const generated_at = new Date(now).toISOString();

  const { data: circleData, error } = await supabase
    .from('circle_person')
    .select('id, display_name, company, title, primary_email, linkedin_url, warmth, last_interaction_at')
    .eq('user_id', userId)
    .order('warmth', { ascending: false, nullsFirst: false })
    .limit(SCAN_LIMIT);
  if (error) throw error;

  const circle = (circleData ?? []) as CircleRow[];

  const ranked = circle
    .map((p) => {
      const recency = recencyDays(p.last_interaction_at, now);
      return { p, recency, s: score(p.warmth, recency) };
    })
    .filter((r) => r.s >= 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, COHORT_SIZE);

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
  // back to honest, fact-only drafts so the digest still ships.
  let drafted = new Map<string, { why_now: string; subject: string; message: string }>();
  try {
    const profileBlock = profilePromptBlock(await loadProfileContext(supabase, userId));
    const prefs = await loadUserAiPreferences(supabase, userId);
    const system = SYSTEM + profileBlock + personalitySystemSuffix(prefs?.ai_personality);
    const user = JSON.stringify({
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
    for (const row of out as Array<{ id?: string; why_now?: string; subject?: string; message?: string }>) {
      if (!row?.id || typeof row.message !== 'string' || !row.message.trim()) continue;
      drafted.set(row.id, {
        why_now: clamp(row.why_now, WHY_MAX),
        subject: clamp(row.subject, SUBJECT_MAX) || 'Catching up',
        message: clamp(row.message, MESSAGE_MAX),
      });
    }
  } catch (_e) {
    drafted = new Map();
  }

  const people: DigestPerson[] = ranked.map((r) => {
    const d = drafted.get(r.p.id) ?? fallbackDraft(r.p, r.recency);
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
      why_now: d.why_now,
      subject: d.subject,
      message: d.message,
    };
  });

  return { people, generated_at };
}

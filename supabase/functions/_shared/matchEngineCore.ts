// Core Match Engine logic, shared by user-triggered (run-match-engine) and
// overnight-scheduled (cron-match-engine) entrypoints. Both pass in their own
// Supabase client; only the caller knows whether that client is auth-scoped
// (user JWT + RLS) or service-role.

// deno-lint-ignore-file no-explicit-any

import { getUserTier, QUOTAS, countMatchesSince, startOfWeekIso } from './tiers.ts';
import { loadUserAiPreferences, personalitySystemSuffix } from './aiPersonality.ts';
import { loadProfileContext, profilePromptBlock } from './profileContext.ts';

interface Idea {
  id: string;
  title: string;
  one_liner: string | null;
  offer: string | null;
  price_band: string | null;
  icp: string | null;
  pain: string | null;
}

// How a person relates to an offer. The whole point of the dual-role engine:
// the most valuable person in a fractional's network is often NOT the buyer.
//   buyer     — has the pain, fits the ICP, can pay.
//   amplifier — reaches the ICP; can intro / refer / co-market / distribute.
//   sharpener — a peer/operator who helps refine the idea itself.
type MatchRole = 'buyer' | 'amplifier' | 'sharpener';
const VALID_ROLES: ReadonlySet<string> = new Set(['buyer', 'amplifier', 'sharpener']);
const coerceRole = (r: unknown): MatchRole =>
  typeof r === 'string' && VALID_ROLES.has(r) ? (r as MatchRole) : 'buyer';

interface Person {
  id: string;
  display_name: string;
  company: string | null;
  title: string | null;
  primary_email: string | null;
  linkedin_url: string | null;
  last_interaction_at: string | null;
}

interface LlmMatch {
  candidate_id: string;
  role?: string;
  rationale: string;
  warm_path?: { via?: string | null; context?: string | null } | null;
  score: number;
  draft?: { channel?: string; subject?: string | null; body: string } | null;
}

export interface MatchEngineResult {
  matchesCreated: number;
  ideasConsidered: number;
  duplicatesSkipped: number;
  errors: string[];
  note?: string;
  quota_blocked?: boolean;
  quota_limit?: number;
  tier?: 'free' | 'pro' | 'executive';
}

const MAX_IDEAS_PER_RUN = 3;
const PREFILTER_TOP_N = 15;
const MATCHES_PER_IDEA = 3;
const ACTIVE_STATES = ['new', 'approved', 'edited'] as const;

const tokens = (s: string | null | undefined): string[] =>
  (s ?? '').toLowerCase().match(/[a-z0-9]+/g) ?? [];

// A small, conservative nudge given to a candidate who has a recent INTERNAL
// signal (warmth-decay / mention). It only changes *which* candidates make the
// prefilter shortlist — never the LLM's scoring or any persisted score. When no
// signals exist the set is empty and behavior is identical to before.
const SIGNAL_PREFILTER_BONUS = 1;

const prefilter = (idea: Idea, people: Person[], signalPersonIds: Set<string>): Person[] => {
  const icpTokens = new Set([
    ...tokens(idea.icp),
    ...tokens(idea.offer),
    ...tokens(idea.one_liner),
    ...tokens(idea.pain),
  ]);
  if (!icpTokens.size) {
    return [...people]
      .sort((a, b) => {
        const bonus = (signalPersonIds.has(b.id) ? 1 : 0) - (signalPersonIds.has(a.id) ? 1 : 0);
        if (bonus !== 0) return bonus;
        return (b.last_interaction_at ?? '').localeCompare(a.last_interaction_at ?? '');
      })
      .slice(0, PREFILTER_TOP_N);
  }
  const scored = people.map((p) => {
    const titleToks = tokens(p.title);
    const companyToks = tokens(p.company);
    let score = 0;
    for (const t of titleToks) if (icpTokens.has(t)) score += 2;
    for (const t of companyToks) if (icpTokens.has(t)) score += 1;
    if (p.primary_email) score += 0.3;
    if (p.linkedin_url) score += 0.3;
    if (signalPersonIds.has(p.id)) score += SIGNAL_PREFILTER_BONUS;
    return { p, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const winners = scored.filter((s) => s.score > 0).slice(0, PREFILTER_TOP_N).map((s) => s.p);
  if (winners.length >= MATCHES_PER_IDEA) return winners;
  const seen = new Set(winners.map((w) => w.id));
  const backfill = [...people]
    .filter((p) => !seen.has(p.id))
    .sort((a, b) => (b.last_interaction_at ?? '').localeCompare(a.last_interaction_at ?? ''))
    .slice(0, PREFILTER_TOP_N - winners.length);
  return [...winners, ...backfill];
};

const buildPrompt = (
  idea: Idea,
  candidates: Person[],
  personalitySuffix = '',
  profileBlock = '',
): { system: string; user: string } => {
  const system = `You match a fractional executive's Idea (an offer they want to sell) to the right people in their personal network. The key insight: the most valuable person is often NOT a buyer. Classify each pick by ROLE:

- "buyer": has the pain this offer removes, fits the ICP, could pay for it directly.
- "amplifier": is NOT the buyer, but REACHES the ICP — runs a community/newsletter/podcast/portfolio/team, or is well-connected to the exact buyers. The offer flows THROUGH them to many buyers via an intro, referral, or co-marketing.
- "sharpener": a peer or operator who has done this kind of work and can help refine the Idea itself — sharpen the offer, narrow the ICP, pressure-test pricing.

Pick the top ${MATCHES_PER_IDEA} HIGHEST-LEVERAGE people across all three roles (not just buyers). One strong amplifier who can open a door to fifty buyers can outrank a single buyer.

Return JSON: { "matches": [ { "candidate_id": string, "role": "buyer" | "amplifier" | "sharpener", "rationale": string, "warm_path": { "via": string | null, "context": string | null }, "score": number between 0 and 1, "draft": { "channel": "linkedin_dm" | "email", "subject": string | null, "body": string } } ] }

Rules:
- Pick from candidates only — use their exact candidate_id string.
- "role" must reflect this person's actual relationship to THIS offer based on their title/company. When unsure between buyer and amplifier, prefer the one the data supports; default to "buyer" only if they plausibly have the pain.
- "rationale" is one tight sentence: why this person, in this role, why now. For amplifiers, say WHO they reach. For sharpeners, say what they'd sharpen.
- "warm_path" is how the user plausibly knows them (prior company, shared title, etc.). If the raw data doesn't support a warm path, return both fields as null.
- "draft" is a short (under 450 chars) message the user could plausibly send, MATCHED TO THE ROLE: a buyer gets a value-led ask tied to their pain; an amplifier gets an intro/collaboration ask (never pitch them as if they're the customer); a sharpener gets a "can I run this by you" ask. Use their first name, reference the warm path, ask ONE clear thing. No "I hope this finds you well" schlock.
- "channel" defaults to linkedin_dm if a linkedin_url exists, else email if primary_email exists, else linkedin_dm.
- Be conservative. If no one is a credible fit in any role, return an empty array.${profileBlock}${personalitySuffix}`;

  const user = JSON.stringify({
    idea: {
      title: idea.title,
      one_liner: idea.one_liner,
      offer: idea.offer,
      pain: idea.pain,
      price_band: idea.price_band,
      icp: idea.icp,
    },
    candidates: candidates.map((p) => ({
      candidate_id: p.id,
      name: p.display_name,
      company: p.company,
      title: p.title,
      has_email: !!p.primary_email,
      has_linkedin: !!p.linkedin_url,
    })),
  });
  return { system, user };
};

export async function runMatchEngineForUser(
  userId: string,
  supabase: any,
  openaiApiKey: string,
  options?: { ideaIds?: string[] }
): Promise<MatchEngineResult> {
  // Tier quota gate. Free users get 1 Match / week; Operator 21 / week
  // (3 / day * 7); Chief of Staff unlimited. Counted against any match
  // surfaced in the trailing week regardless of state.
  const tier = await getUserTier(supabase, userId);
  const quota = QUOTAS[tier];
  const weekStart = startOfWeekIso();
  const surfacedThisWeek = Number.isFinite(quota.matches_per_week)
    ? await countMatchesSince(supabase, userId, weekStart)
    : 0;
  if (Number.isFinite(quota.matches_per_week) && surfacedThisWeek >= quota.matches_per_week) {
    return {
      matchesCreated: 0,
      ideasConsidered: 0,
      duplicatesSkipped: 0,
      errors: [],
      note: `You've hit the ${tier === 'free' ? 'Freemium' : 'Operator'} Match cap for this week (${quota.matches_per_week}). Upgrade for more.`,
      quota_blocked: true,
      quota_limit: quota.matches_per_week,
      tier,
    };
  }

  let ideaQuery = supabase
    .from('ideas')
    .select('id, title, one_liner, offer, price_band, icp, pain')
    .eq('user_id', userId)
    .in('status', ['voiced', 'proposed', 'active'])
    .order('created_at', { ascending: false })
    .limit(MAX_IDEAS_PER_RUN);
  if (options?.ideaIds?.length) ideaQuery = ideaQuery.in('id', options.ideaIds);

  const { data: ideas, error: ideasErr } = await ideaQuery;
  if (ideasErr) throw ideasErr;
  if (!ideas?.length) {
    return {
      matchesCreated: 0,
      ideasConsidered: 0,
      duplicatesSkipped: 0,
      errors: [],
      note: 'No active Ideas to match.',
    };
  }

  const { data: circle, error: circleErr } = await supabase
    .from('circle_person')
    .select('id, display_name, company, title, primary_email, linkedin_url, last_interaction_at')
    .eq('user_id', userId)
    .order('last_interaction_at', { ascending: false })
    .limit(500);
  if (circleErr) throw circleErr;
  if (!circle?.length) {
    return {
      matchesCreated: 0,
      ideasConsidered: ideas.length,
      duplicatesSkipped: 0,
      errors: [],
      note: 'Circle is empty — add a source first.',
    };
  }

  // Idempotency: pull the user's existing active matches upfront and
  // reject any (idea, person) pair we've already surfaced recently.
  const { data: existing } = await supabase
    .from('matches')
    .select('idea_id, circle_person_id')
    .eq('user_id', userId)
    .in('state', ACTIVE_STATES);
  const existingKey = new Set<string>(
    (existing ?? []).map((r: { idea_id: string | null; circle_person_id: string }) =>
      `${r.idea_id ?? ''}::${r.circle_person_id}`
    )
  );

  // Recent INTERNAL signals (warmth-decay / mention, written by generate-signals)
  // give their person a small prefilter nudge. Best-effort: a signals read error
  // must never break matching — we just fall back to an empty set (no nudge).
  const signalPersonIds = new Set<string>();
  try {
    const signalsSince = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentSignals } = await supabase
      .from('signals')
      .select('circle_person_id')
      .eq('user_id', userId)
      .not('circle_person_id', 'is', null)
      .gte('created_at', signalsSince)
      .limit(500);
    for (const s of (recentSignals ?? []) as Array<{ circle_person_id: string | null }>) {
      if (s.circle_person_id) signalPersonIds.add(s.circle_person_id);
    }
  } catch (_e) {
    // No signals table read access / transient error: proceed with no nudge.
  }

  const aiPrefs = await loadUserAiPreferences(supabase, userId);
  const personalitySuffix = personalitySystemSuffix(aiPrefs?.ai_personality);
  const profileBlock = profilePromptBlock(await loadProfileContext(supabase, userId));

  let totalCreated = 0;
  let duplicatesSkipped = 0;
  const errors: string[] = [];

  for (const idea of ideas as Idea[]) {
    const candidates = prefilter(idea, circle as Person[], signalPersonIds);
    if (!candidates.length) continue;
    const { system, user } = buildPrompt(idea, candidates, personalitySuffix, profileBlock);

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        store: false,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!resp.ok) {
      errors.push(`idea ${idea.id}: OpenAI ${resp.status}`);
      continue;
    }
    const result = await resp.json();
    let parsed: { matches?: LlmMatch[] };
    try {
      parsed = JSON.parse(result.choices[0].message.content);
    } catch {
      errors.push(`idea ${idea.id}: malformed JSON`);
      continue;
    }

    const candidateById = new Map(candidates.map((c) => [c.id, c]));
    const valid = (parsed.matches ?? [])
      .filter((m) => candidateById.has(m.candidate_id))
      .slice(0, MATCHES_PER_IDEA);

    // Filter out pairs already surfaced (idempotency).
    const fresh = valid.filter((m) => {
      const key = `${idea.id}::${m.candidate_id}`;
      if (existingKey.has(key)) {
        duplicatesSkipped++;
        return false;
      }
      existingKey.add(key);
      return true;
    });

    if (!fresh.length) continue;

    const matchRows = fresh.map((m) => ({
      user_id: userId,
      idea_id: idea.id,
      circle_person_id: m.candidate_id,
      role: coerceRole(m.role),
      warm_path: m.warm_path ?? null,
      rationale: m.rationale,
      score: Math.max(0, Math.min(1, Number(m.score) || 0)),
      state: 'new' as const,
    }));
    const { data: inserted, error: insertErr } = await supabase
      .from('matches')
      .insert(matchRows)
      .select('id, circle_person_id');
    if (insertErr) {
      errors.push(`idea ${idea.id}: insert matches ${insertErr.message}`);
      continue;
    }
    totalCreated += inserted?.length ?? 0;

    const moveRows = (inserted ?? []).map((row: { id: string; circle_person_id: string }) => {
      const m = fresh.find((v) => v.candidate_id === row.circle_person_id)!;
      const candidate = candidateById.get(row.circle_person_id)!;
      const channel = m.draft?.channel === 'email'
        ? (candidate.primary_email ? 'email' : 'linkedin_dm')
        : (candidate.linkedin_url ? 'linkedin_dm' : (candidate.primary_email ? 'email' : 'linkedin_dm'));
      return {
        user_id: userId,
        match_id: row.id,
        channel,
        state: 'draft' as const,
        draft_subject: m.draft?.subject ?? null,
        draft_body: m.draft?.body ?? '',
      };
    });
    if (moveRows.length) {
      const { error: moveErr } = await supabase.from('moves').insert(moveRows);
      if (moveErr) errors.push(`idea ${idea.id}: insert moves ${moveErr.message}`);
    }
  }

  return {
    matchesCreated: totalCreated,
    ideasConsidered: ideas.length,
    duplicatesSkipped,
    errors,
    tier,
  };
}

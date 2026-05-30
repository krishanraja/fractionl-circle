import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit } from '../_shared/compliance.ts';

// Internal Trigger Layer. Derives time-sensitive "reasons to reach out now" from
// data Circle already owns (no external APIs) and writes them into `signals` so
// the Match Engine can weight them. Auth'd via the user's JWT; RLS enforces
// per-user scoping on every read/write. Safe to call repeatedly: idempotent on
// (person, kind, recent window).
//
// Sources:
//   1. Warmth-decay  — circle_person whose last_interaction_at is older than
//      WARMTH_DECAY_DAYS but who are linked to an active match (going cold).
//   2. Mention        — explicit "reconnect / follow up / should talk to <name>"
//      intentions parsed from the user's recent Sunday Letters. (ai_conversations
//      is a legacy single-tenant table locked to 'default_user' RLS, so it is NOT
//      a valid per-user source and is intentionally skipped.)

const WARMTH_DECAY_DAYS = 60;
// Active match states that mark a person as "in play" (mirrors the Match Engine's
// ACTIVE_STATES plus 'sent', since a sent-but-unanswered match is exactly the kind
// of relationship that can go cold).
const ACTIVE_MATCH_STATES = ['new', 'approved', 'edited', 'sent'] as const;
// Idempotency window: do not re-emit a signal of the same kind for the same person
// if one already exists within this many days.
const DEDUPE_WINDOW_DAYS = 30;
// Recency window for scanning Sunday Letters for mentions.
const MENTION_LOOKBACK_DAYS = 21;
const MAX_SIGNALS_PER_RUN = 50;

interface SignalInsert {
  user_id: string;
  subject: 'person' | 'market';
  kind: string;
  circle_person_id: string | null;
  headline: string;
  detail: string | null;
  source_url: string | null;
  occurred_at: string | null;
  confidence: number;
  raw: Record<string, unknown> | null;
}

const daysAgoIso = (days: number): string =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

// Escape a name for safe use inside a RegExp.
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Phrases that signal an explicit intention to reach back out to someone.
const MENTION_TRIGGERS = [
  'reconnect with',
  'follow up with',
  'follow-up with',
  'should talk to',
  'need to talk to',
  'reach out to',
  'circle back with',
  'catch up with',
];

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { userId, supabase } = await requireAuth(req);
    checkRateLimit(`generate-signals:${userId}`, 6, 60_000);

    const proposed: SignalInsert[] = [];
    const errors: string[] = [];

    // ── Source 1: Warmth-decay ────────────────────────────────────────────
    // People linked to an active match whose last_interaction_at is stale.
    try {
      const { data: activeMatches, error: matchErr } = await supabase
        .from('matches')
        .select('circle_person_id')
        .eq('user_id', userId)
        .in('state', ACTIVE_MATCH_STATES as unknown as string[]);
      if (matchErr) throw matchErr;

      const activePersonIds = Array.from(
        new Set(
          (activeMatches ?? [])
            .map((m: { circle_person_id: string | null }) => m.circle_person_id)
            .filter((id): id is string => !!id),
        ),
      );

      if (activePersonIds.length) {
        const staleBefore = daysAgoIso(WARMTH_DECAY_DAYS);
        const { data: people, error: peopleErr } = await supabase
          .from('circle_person')
          .select('id, display_name, last_interaction_at')
          .eq('user_id', userId)
          .in('id', activePersonIds)
          .not('last_interaction_at', 'is', null)
          .lt('last_interaction_at', staleBefore)
          .limit(MAX_SIGNALS_PER_RUN);
        if (peopleErr) throw peopleErr;

        for (const p of (people ?? []) as Array<{ id: string; display_name: string; last_interaction_at: string }>) {
          const days = Math.floor(
            (Date.now() - new Date(p.last_interaction_at).getTime()) / (24 * 60 * 60 * 1000),
          );
          proposed.push({
            user_id: userId,
            subject: 'person',
            kind: 'other',
            circle_person_id: p.id,
            headline: `${p.display_name} is going cold`,
            detail: `No interaction in about ${days} days, and they're tied to an active match. Worth a touch before the thread dies.`,
            source_url: null,
            occurred_at: p.last_interaction_at,
            confidence: 0.6,
            raw: { source: 'warmth_decay', days_since_interaction: days, threshold_days: WARMTH_DECAY_DAYS },
          });
        }
      }
    } catch (e) {
      errors.push(`warmth_decay: ${e instanceof Error ? e.message : String(e)}`);
    }

    // ── Source 2: Mention ─────────────────────────────────────────────────
    // Parse recent Sunday Letters for explicit "reconnect with <name>" intentions.
    try {
      const { data: letters, error: letterErr } = await supabase
        .from('sunday_letters')
        .select('id, text_body, week_of, created_at')
        .eq('user_id', userId)
        .gte('created_at', daysAgoIso(MENTION_LOOKBACK_DAYS))
        .order('created_at', { ascending: false })
        .limit(8);
      if (letterErr) throw letterErr;

      if (letters?.length) {
        const { data: circle, error: circleErr } = await supabase
          .from('circle_person')
          .select('id, display_name')
          .eq('user_id', userId)
          .limit(2000);
        if (circleErr) throw circleErr;

        const named = ((circle ?? []) as Array<{ id: string; display_name: string }>)
          .filter((c) => (c.display_name ?? '').trim().length >= 2);

        for (const letter of letters as Array<{ id: string; text_body: string; created_at: string }>) {
          const text = (letter.text_body ?? '').toLowerCase();
          if (!text) continue;
          for (const person of named) {
            const nameLc = person.display_name.toLowerCase();
            const hit = MENTION_TRIGGERS.some((trigger) =>
              new RegExp(`${escapeRe(trigger)}\\s+(?:[a-z]+\\s+){0,2}${escapeRe(nameLc)}`).test(text),
            );
            if (!hit) continue;
            proposed.push({
              user_id: userId,
              subject: 'person',
              kind: 'mention',
              circle_person_id: person.id,
              headline: `You said you'd reach out to ${person.display_name}`,
              detail: 'Picked up from a recent Sunday Letter. You flagged this as someone to reconnect with.',
              source_url: null,
              occurred_at: letter.created_at,
              confidence: 0.55,
              raw: { source: 'sunday_letter_mention', sunday_letter_id: letter.id },
            });
          }
        }
      }
    } catch (e) {
      errors.push(`mention: ${e instanceof Error ? e.message : String(e)}`);
    }

    if (!proposed.length) {
      return new Response(JSON.stringify({ signals_created: 0, candidates: 0, deduped: 0, errors }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Idempotency ───────────────────────────────────────────────────────
    // There is no unique constraint or window column on `signals`, so dedupe in
    // code: skip any proposed (person, kind) that already has a signal within the
    // recent window.
    const personIds = Array.from(
      new Set(proposed.map((s) => s.circle_person_id).filter((id): id is string => !!id)),
    );
    const existingKeys = new Set<string>();
    if (personIds.length) {
      const { data: existing, error: existingErr } = await supabase
        .from('signals')
        .select('circle_person_id, kind')
        .eq('user_id', userId)
        .in('circle_person_id', personIds)
        .gte('created_at', daysAgoIso(DEDUPE_WINDOW_DAYS));
      if (existingErr) {
        errors.push(`dedupe_lookup: ${existingErr.message}`);
      } else {
        for (const row of (existing ?? []) as Array<{ circle_person_id: string | null; kind: string }>) {
          existingKeys.add(`${row.circle_person_id ?? ''}::${row.kind}`);
        }
      }
    }

    const seen = new Set<string>();
    const fresh = proposed.filter((s) => {
      const key = `${s.circle_person_id ?? ''}::${s.kind}`;
      if (existingKeys.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, MAX_SIGNALS_PER_RUN);

    const deduped = proposed.length - fresh.length;

    let created = 0;
    if (fresh.length) {
      const { data: inserted, error: insertErr } = await supabase
        .from('signals')
        .insert(fresh)
        .select('id');
      if (insertErr) {
        errors.push(`insert: ${insertErr.message}`);
      } else {
        created = inserted?.length ?? 0;
      }
    }

    return new Response(JSON.stringify({
      signals_created: created,
      candidates: proposed.length,
      deduped,
      errors,
      at: new Date().toISOString(),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

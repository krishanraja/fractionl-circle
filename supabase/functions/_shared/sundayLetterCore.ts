// Core Sunday Letter generation logic, shared by user-triggered
// (generate-sunday-letter) and weekly-scheduled (cron-sunday-letter)
// entrypoints.

// deno-lint-ignore-file no-explicit-any

import { getUserTier, QUOTAS } from './tiers.ts';
import { loadUserAiPreferences, withPersonality } from './aiPersonality.ts';

export interface SundayLetterStats {
  matches_surfaced: number;
  matches_approved: number;
  matches_declined: number;
  moves_sent: number;
  moves_drafted: number;
  new_circle_people: number;
  active_ideas: number;
}

export interface SundayLetterResult {
  letter: any;
  reused: boolean;
  note?: string;
}

export const startOfWeekUtc = (d: Date): Date => {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = date.getUTCDay();
  const delta = dow === 0 ? -6 : 1 - dow;
  date.setUTCDate(date.getUTCDate() + delta);
  return date;
};

export const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

// Max characters we will persist from a generated letter. The prompt caps
// output at 280 words (~2k chars); anything far beyond that is suspicious
// (runaway generation or prompt-injection output).
const MAX_LETTER_CHARS = 4000;

// Patterns that indicate the model returned system-prompt leakage or an
// injection payload rather than a narrative. Cheap, non-exhaustive; pairs
// with the length cap.
const INJECTION_SIGNATURES = [
  /<\|im_(start|end)\|>/i,
  /^\s*(system|assistant)\s*:/i,
  /\bignore (all |the )?(previous|above) (instructions|prompt)/i,
];

export function validateLetter(raw: string): string {
  if (!raw) throw new Error('Empty letter');

  // Strip leading/trailing markdown fences the model sometimes adds despite
  // being told "no markdown" in the system prompt.
  let text = raw.replace(/^```(?:\w+)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();

  if (!text) throw new Error('Empty letter');
  if (text.length > MAX_LETTER_CHARS) {
    throw new Error(`Letter exceeds ${MAX_LETTER_CHARS} chars (got ${text.length})`);
  }

  for (const sig of INJECTION_SIGNATURES) {
    if (sig.test(text)) {
      throw new Error('Letter rejected: injection signature detected');
    }
  }

  return text;
}

// A safe, generic teaser used when the de-identified preview call fails. Must
// never contain names, companies, or client numbers.
const FALLBACK_PREVIEW = 'A quiet read on the week in fractional revenue: where momentum showed up, and where it stalled.';

// Generate a fully de-identified, shareable one-liner about the week's pattern.
// Used by the public Sunday Letter feed (5e). Never leaks names, companies, or
// client-tied figures. Best-effort: on any failure we return FALLBACK_PREVIEW
// so letter generation never breaks.
async function generatePreviewText(
  narrative: string,
  openaiApiKey: string
): Promise<string> {
  try {
    const systemPrompt = `You write a single, fully anonymous teaser line about a fractional executive's week. You are given a private weekly letter; your job is to distill the GENERIC pattern into something shareable publicly.

Rules (strict):
- Output 1-2 sentences, under 240 characters total.
- NO person names (first or last). NO company or organisation names. NO dollar figures, deal sizes, or any client-tied numbers.
- No quotes, no markdown, no greeting, no signoff. Just the line.
- Speak to the universal pattern (e.g. "warm intros outperformed cold outreach again this week"), never the specific people or deals.
- Calm, specific, opinionated. Like a smart friend, not a marketer.`;

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: narrative },
        ],
        temperature: 0.4,
        store: false,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!resp.ok) {
      console.error('sunday_letter_preview_failed', resp.status);
      return FALLBACK_PREVIEW;
    }
    const result = await resp.json();
    const raw = String(result.choices?.[0]?.message?.content ?? '').trim();
    if (!raw) return FALLBACK_PREVIEW;
    // Strip any stray quotes/fences and cap length defensively.
    const cleaned = raw.replace(/^```(?:\w+)?\s*\n?/, '').replace(/\n?```\s*$/, '').replace(/^["']|["']$/g, '').trim();
    if (!cleaned) return FALLBACK_PREVIEW;
    return cleaned.length > 280 ? cleaned.slice(0, 277).trimEnd() + '...' : cleaned;
  } catch (e) {
    console.error('sunday_letter_preview_error', e instanceof Error ? e.message : e);
    return FALLBACK_PREVIEW;
  }
}

export async function generateSundayLetterForUser(
  userId: string,
  supabase: any,
  openaiApiKey: string,
  options?: { force?: boolean; weekOf?: Date }
): Promise<SundayLetterResult> {
  const now = options?.weekOf ?? new Date();
  const weekStart = startOfWeekUtc(now);
  const weekOf = isoDate(weekStart);
  const weekStartIso = weekStart.toISOString();

  if (!options?.force) {
    const { data: existing } = await supabase
      .from('sunday_letters')
      .select('*')
      .eq('user_id', userId)
      .eq('week_of', weekOf)
      .maybeSingle();
    if (existing) {
      return { letter: existing, reused: true };
    }
  }

  const [matchesRes, movesRes, circleCountRes, newCircleRes, ideasRes, profileRes] = await Promise.all([
    supabase
      .from('matches')
      .select('id, idea_id, circle_person_id, state, rationale, warm_path, score, surfaced_at, approved_at, closed_at, closed_reason')
      .eq('user_id', userId)
      .gte('surfaced_at', weekStartIso)
      .order('surfaced_at', { ascending: false })
      .limit(50),
    supabase
      .from('moves')
      .select('id, match_id, channel, state, draft_body, final_body, sent_at, created_at')
      .eq('user_id', userId)
      .gte('created_at', weekStartIso)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('circle_person')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('circle_person')
      .select('id, display_name, company, title, created_at')
      .eq('user_id', userId)
      .gte('created_at', weekStartIso)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('ideas')
      .select('id, title, one_liner, status')
      .eq('user_id', userId)
      .in('status', ['voiced', 'proposed', 'active']),
    supabase
      .from('user_profiles')
      .select('full_name, business_type')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  const matches = matchesRes.data ?? [];
  const moves = movesRes.data ?? [];
  const newPeople = newCircleRes.data ?? [];
  const ideas = ideasRes.data ?? [];
  const totalCircle = circleCountRes.count ?? 0;
  const profile = profileRes.data ?? null;

  const personIds = Array.from(new Set(matches.map((m: any) => m.circle_person_id).filter(Boolean)));
  const ideaIds = Array.from(new Set(matches.map((m: any) => m.idea_id).filter(Boolean))) as string[];
  const [{ data: people }, { data: ideaRows }] = await Promise.all([
    personIds.length
      ? supabase.from('circle_person').select('id, display_name, company, title').in('id', personIds)
      : Promise.resolve({ data: [] as any[] }),
    ideaIds.length
      ? supabase.from('ideas').select('id, title').in('id', ideaIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const personById = new Map<string, any>((people ?? []).map((p: any) => [p.id, p]));
  const ideaById = new Map<string, any>((ideaRows ?? []).map((i: any) => [i.id, i]));

  const matchSummaries = matches.map((m: any) => {
    const person = personById.get(m.circle_person_id);
    const idea = m.idea_id ? ideaById.get(m.idea_id) : null;
    return {
      state: m.state,
      score: m.score,
      rationale: m.rationale,
      warm_path: m.warm_path,
      person_name: person?.display_name,
      person_company: person?.company,
      person_title: person?.title,
      idea_title: idea?.title,
    };
  });

  const stats: SundayLetterStats = {
    matches_surfaced: matches.length,
    matches_approved: matches.filter((m: any) => m.state === 'approved' || m.state === 'sent' || m.state === 'won').length,
    matches_declined: matches.filter((m: any) => m.state === 'declined' || m.state === 'cold').length,
    moves_sent: moves.filter((m: any) => m.state === 'sent').length,
    moves_drafted: moves.length,
    new_circle_people: newPeople.length,
    active_ideas: ideas.length,
  };

  const hasActivity = stats.matches_surfaced > 0 || stats.new_circle_people > 0 || stats.moves_drafted > 0;
  let narrative: string;
  let generationSource: 'llm' | 'fallback';
  const model = 'gpt-4o-mini';

  if (!hasActivity) {
    narrative = `Quiet week. You've got ${stats.active_ideas} Idea${stats.active_ideas === 1 ? '' : 's'} in flight and ${totalCircle.toLocaleString()} people in your Circle, but nothing moved this week. If you want to break the silence, Surface Matches on Today and pick one to send.`;
    generationSource = 'fallback';
  } else {
    const aiPrefs = await loadUserAiPreferences(supabase, userId);
    const baseSystemPrompt = `You are a chief of staff writing a weekly "Sunday Letter" to a fractional executive. Speak in a calm, specific, opinionated voice — like a smart friend who paid attention all week. Never sycophantic, never corporate.

Write 4-8 short paragraphs. Cover, in roughly this order (skip sections with no content):
1. What actually happened (numbers, a specific name or two from the top matches).
2. A pattern you noticed (if any) — e.g., "three of your best matches came through ex-Acme colleagues."
3. A judgment — what's working, what's not. One concrete recommendation for next week.
4. A stalled thread to kill or a person to thank (your call; be specific).

Rules:
- Under 280 words total.
- Name real people from the data (by first name or full name). Do not invent anyone not in the data.
- No greeting, no signoff, no "Dear X", no "Best, Claude". Just the body.
- If the data is thin, say so plainly.
- Use plain paragraphs separated by blank lines. No markdown, no lists.`;
    const systemPrompt = withPersonality(baseSystemPrompt, aiPrefs);

    const userPayload = JSON.stringify({
      user: profile ? { name: profile.full_name ?? null, type: profile.business_type ?? null } : null,
      week_of: weekOf,
      stats,
      matches: matchSummaries.slice(0, 20),
      new_people: newPeople.slice(0, 10).map((p: any) => ({
        name: p.display_name,
        company: p.company,
        title: p.title,
      })),
      ideas: ideas.slice(0, 5),
      circle_size: totalCircle,
    });

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPayload },
        ],
        temperature: 0.5,
        store: false,
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!resp.ok) throw new Error(`OpenAI ${resp.status}`);
    const result = await resp.json();
    const raw = String(result.choices[0].message.content ?? '').trim();
    narrative = validateLetter(raw);
    generationSource = 'llm';
  }

  // Sanitized public teaser + url-safe slug for the opt-in public feed (5e).
  // is_publishable stays false here; the owner opts in from the card later.
  const previewText = await generatePreviewText(narrative, openaiApiKey);
  const publicSlug = crypto.randomUUID().replace(/-/g, '').slice(0, 12);

  const { data: inserted, error: insertErr } = await supabase
    .from('sunday_letters')
    .upsert(
      {
        user_id: userId,
        week_of: weekOf,
        text_body: narrative,
        stats,
        model,
        generation_source: generationSource,
        text_length: narrative.length,
        preview_text: previewText,
        public_slug: publicSlug,
      },
      { onConflict: 'user_id,week_of' }
    )
    .select('*')
    .single();
  if (insertErr) throw insertErr;

  // Phase 8c: TTS audio. Only for Chief of Staff tier. Best-effort — if TTS
  // fails we keep the text letter.
  let letter = inserted;
  try {
    const tier = await getUserTier(supabase, userId);
    if (QUOTAS[tier].has_sunday_letter_audio && hasActivity) {
      const audioUrl = await synthesizeAudio({
        supabase,
        openaiApiKey,
        userId,
        weekOf,
        text: narrative,
      });
      if (audioUrl) {
        const { data: withAudio, error: audioErr } = await supabase
          .from('sunday_letters')
          .update({ audio_url: audioUrl })
          .eq('id', inserted.id)
          .select('*')
          .single();
        if (!audioErr && withAudio) letter = withAudio;
      }
    }
  } catch (e) {
    console.error('sunday_letter_audio_failed', e instanceof Error ? e.message : e);
  }

  return { letter, reused: false };
}

async function synthesizeAudio(args: {
  supabase: any;
  openaiApiKey: string;
  userId: string;
  weekOf: string;
  text: string;
}): Promise<string | null> {
  const resp = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${args.openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: 'alloy',
      input: args.text,
      response_format: 'mp3',
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!resp.ok) {
    console.error('tts_failed', resp.status, await resp.text());
    return null;
  }
  const buffer = new Uint8Array(await resp.arrayBuffer());
  const path = `${args.userId}/${args.weekOf}.mp3`;
  const { error: uploadErr } = await args.supabase.storage
    .from('sunday-letters')
    .upload(path, buffer, {
      contentType: 'audio/mpeg',
      upsert: true,
    });
  if (uploadErr) {
    console.error('tts_upload_failed', uploadErr.message);
    return null;
  }
  // Bucket is private; generate a signed URL valid for a week.
  const { data: signed, error: signErr } = await args.supabase.storage
    .from('sunday-letters')
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  if (signErr || !signed?.signedUrl) {
    console.error('tts_sign_failed', signErr?.message);
    return null;
  }
  return signed.signedUrl;
}

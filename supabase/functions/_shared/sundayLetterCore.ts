// Core Sunday Letter generation logic, shared by user-triggered
// (generate-sunday-letter) and weekly-scheduled (cron-sunday-letter)
// entrypoints.

// deno-lint-ignore-file no-explicit-any

import { getUserTier, QUOTAS } from './tiers.ts';

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
  const model = 'gpt-4o-mini';

  if (!hasActivity) {
    narrative = `Quiet week. You've got ${stats.active_ideas} Idea${stats.active_ideas === 1 ? '' : 's'} in flight and ${totalCircle.toLocaleString()} people in your Circle, but nothing moved this week. If you want to break the silence, Surface Matches on Today and pick one to send.`;
  } else {
    const systemPrompt = `You are a chief of staff writing a weekly "Sunday Letter" to a fractional executive. Speak in a calm, specific, opinionated voice — like a smart friend who paid attention all week. Never sycophantic, never corporate.

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
    });
    if (!resp.ok) throw new Error(`OpenAI ${resp.status}`);
    const result = await resp.json();
    narrative = String(result.choices[0].message.content ?? '').trim();
    if (!narrative) throw new Error('Empty letter');
  }

  const { data: inserted, error: insertErr } = await supabase
    .from('sunday_letters')
    .upsert(
      { user_id: userId, week_of: weekOf, text_body: narrative, stats, model },
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

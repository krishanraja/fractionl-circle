import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit } from '../_shared/compliance.ts';

// Generates the weekly Sunday Letter: a short, opinionated narrative across
// the user's matches, moves, circle, and ideas for the past 7 days. Writes
// to sunday_letters (upsert on (user_id, week_of)).

interface Stats {
  matches_surfaced: number;
  matches_approved: number;
  matches_declined: number;
  moves_sent: number;
  moves_drafted: number;
  new_circle_people: number;
  active_ideas: number;
}

const startOfWeek = (d: Date): Date => {
  // Week_of = Monday of the week containing `d`, UTC.
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = date.getUTCDay(); // 0 = Sun, 1 = Mon, ...
  const delta = dow === 0 ? -6 : 1 - dow;
  date.setUTCDate(date.getUTCDate() + delta);
  return date;
};

const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { userId, supabase } = await requireAuth(req);
    checkRateLimit(`generate-sunday-letter:${userId}`, 6, 60_000);

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(JSON.stringify({ error: 'Service unavailable' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const force = body?.force === true;

    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekOf = isoDate(weekStart);
    const weekStartIso = weekStart.toISOString();

    // Short-circuit if a letter already exists for this week and caller isn't forcing.
    if (!force) {
      const { data: existing } = await supabase
        .from('sunday_letters')
        .select('*')
        .eq('user_id', userId)
        .eq('week_of', weekOf)
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ letter: existing, reused: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Pull the week's activity + the user's shape.
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

    // Hydrate person + idea names for the LLM.
    const personIds = Array.from(new Set(matches.map((m) => m.circle_person_id).filter(Boolean)));
    const ideaIds = Array.from(new Set(matches.map((m) => m.idea_id).filter(Boolean))) as string[];
    const [{ data: people }, { data: ideaRows }] = await Promise.all([
      personIds.length
        ? supabase.from('circle_person').select('id, display_name, company, title').in('id', personIds)
        : Promise.resolve({ data: [] as Array<{ id: string; display_name: string; company: string | null; title: string | null }> }),
      ideaIds.length
        ? supabase.from('ideas').select('id, title').in('id', ideaIds)
        : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
    ]);
    const personById = new Map((people ?? []).map((p) => [p.id, p]));
    const ideaById = new Map((ideaRows ?? []).map((i) => [i.id, i]));

    const matchSummaries = matches.map((m) => {
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

    const stats: Stats = {
      matches_surfaced: matches.length,
      matches_approved: matches.filter((m) => m.state === 'approved' || m.state === 'sent' || m.state === 'won').length,
      matches_declined: matches.filter((m) => m.state === 'declined' || m.state === 'cold').length,
      moves_sent: moves.filter((m) => m.state === 'sent').length,
      moves_drafted: moves.length,
      new_circle_people: newPeople.length,
      active_ideas: ideas.length,
    };

    // If there's truly nothing to narrate, write a short empty-state letter
    // rather than hallucinating activity.
    const hasActivity = stats.matches_surfaced > 0 || stats.new_circle_people > 0 || stats.moves_drafted > 0;

    let narrative: string;
    let model = 'gpt-4o-mini';

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

      const user = JSON.stringify({
        user: profile ? { name: profile.full_name ?? null, type: profile.business_type ?? null } : null,
        week_of: weekOf,
        stats,
        matches: matchSummaries.slice(0, 20),
        new_people: newPeople.slice(0, 10).map((p) => ({
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
            { role: 'user', content: user },
          ],
          temperature: 0.5,
          store: false,
        }),
      });
      if (!resp.ok) {
        console.error('OpenAI API error:', resp.status);
        return new Response(JSON.stringify({ error: 'AI processing failed' }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const result = await resp.json();
      narrative = String(result.choices[0].message.content ?? '').trim();
      if (!narrative) {
        return new Response(JSON.stringify({ error: 'Empty letter' }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Upsert on (user_id, week_of).
    const { data: inserted, error: insertErr } = await supabase
      .from('sunday_letters')
      .upsert(
        {
          user_id: userId,
          week_of: weekOf,
          text_body: narrative,
          stats,
          model,
        },
        { onConflict: 'user_id,week_of' }
      )
      .select('*')
      .single();
    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({ letter: inserted, reused: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

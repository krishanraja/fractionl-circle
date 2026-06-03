import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit } from '../_shared/compliance.ts';

// Closes the loop's far end: when a Match turns into real work, give the
// originating Idea a body. This is the ONLY place a Stream is born.
//
// Given a won match, we: (1) resolve or create the Stream for that Idea,
// (2) mark the match 'won' and link it to the Stream, (3) keep the Idea
// 'active' so the engine keeps working it, and (4) optionally write the first
// ledger entry so EARNED moves off $0 and the graduation feels real.
//
// RLS does the security: requireAuth hands back a user-scoped client, so every
// table touched is constrained to auth.uid() = user_id.

const json = (body: unknown, status: number, cors: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { userId, supabase } = await requireAuth(req);
    checkRateLimit(`log-win:${userId}`, 30, 60_000);

    const body = await req.json().catch(() => ({}));
    const matchId = typeof body?.match_id === 'string' ? body.match_id : null;
    if (!matchId) return json({ error: 'match_id required' }, 400, corsHeaders);

    const amountCents =
      Number.isFinite(body?.amount_cents) && body.amount_cents > 0
        ? Math.round(body.amount_cents)
        : 0;
    const monthlyTargetCents =
      Number.isFinite(body?.monthly_target_cents) && body.monthly_target_cents > 0
        ? Math.round(body.monthly_target_cents)
        : null;

    // Load the match (RLS scopes to this user; a foreign id returns null).
    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .select('id, idea_id, stream_id, circle_person_id')
      .eq('id', matchId)
      .maybeSingle();
    if (matchErr) throw matchErr;
    if (!match) return json({ error: 'Match not found' }, 404, corsHeaders);

    const now = new Date().toISOString();

    // 1. Resolve or create the Stream.
    let streamId: string | null = match.stream_id ?? null;
    let streamCreated = false;

    if (!streamId && match.idea_id) {
      const { data: existing } = await supabase
        .from('streams')
        .select('id')
        .eq('user_id', userId)
        .eq('idea_id', match.idea_id)
        .limit(1)
        .maybeSingle();
      streamId = existing?.id ?? null;
    }

    if (!streamId) {
      let name = 'New stream';
      if (match.idea_id) {
        const { data: idea } = await supabase
          .from('ideas')
          .select('title')
          .eq('id', match.idea_id)
          .maybeSingle();
        if (idea?.title) name = idea.title;
      }
      const { data: created, error: streamErr } = await supabase
        .from('streams')
        .insert({
          user_id: userId,
          idea_id: match.idea_id ?? null,
          name,
          state: 'live',
          monthly_target_cents: monthlyTargetCents,
          activated_at: now,
        })
        .select('id')
        .single();
      if (streamErr) throw streamErr;
      streamId = created.id;
      streamCreated = true;
    } else {
      // Existing Stream: bring it live, refresh the target if one was given.
      const patch: Record<string, unknown> = { state: 'live' };
      if (monthlyTargetCents != null) patch.monthly_target_cents = monthlyTargetCents;
      if (monthlyTargetCents != null) patch.activated_at = now;
      await supabase.from('streams').update(patch).eq('id', streamId);
    }

    // 2. Mark the match won + link the Stream.
    await supabase
      .from('matches')
      .update({ state: 'won', stream_id: streamId, closed_at: now, closed_reason: 'won' })
      .eq('id', matchId);

    // 3. Keep the originating Idea matchable/active.
    if (match.idea_id) {
      await supabase.from('ideas').update({ status: 'active' }).eq('id', match.idea_id);
    }

    // 4. First ledger entry, if an amount was supplied.
    if (amountCents > 0 && streamId) {
      const { error: ledgerErr } = await supabase.from('ledger_entries').insert({
        user_id: userId,
        stream_id: streamId,
        circle_person_id: match.circle_person_id ?? null,
        occurred_at: now,
        amount_cents: amountCents,
        kind: 'revenue',
        source: 'match_win',
      });
      if (ledgerErr) throw ledgerErr;
    }

    return json(
      { ok: true, stream_id: streamId, stream_created: streamCreated, logged_cents: amountCents },
      200,
      corsHeaders,
    );
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

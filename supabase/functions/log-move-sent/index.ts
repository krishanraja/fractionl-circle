import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit, enforceMaxLength } from '../_shared/compliance.ts';

// Post-launch leverage: log the gradient between the AI's draft and what
// the user actually sent. This is the taste / voice model's training data.
// A real model trains on this offline; this edge fn just captures the row.

// deno-lint-ignore-file no-explicit-any

// Classic Wagner-Fischer. Bounded by enforceMaxLength above so it never
// goes over ~50KB of input.
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  // Use two rolling rows, O(min(n,m)) space.
  if (a.length > b.length) [a, b] = [b, a];
  const prev = new Uint32Array(a.length + 1);
  const curr = new Uint32Array(a.length + 1);
  for (let i = 0; i <= a.length; i++) prev[i] = i;
  for (let j = 1; j <= b.length; j++) {
    curr[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[i] = Math.min(
        curr[i - 1] + 1,
        prev[i] + 1,
        prev[i - 1] + cost,
      );
    }
    prev.set(curr);
  }
  return prev[a.length];
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { userId, supabase } = await requireAuth(req);
    checkRateLimit(`log-move-sent:${userId}`, 60, 60_000);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const moveId = typeof body?.move_id === 'string' ? body.move_id : null;
    const finalBody = typeof body?.final_body === 'string' ? body.final_body : '';
    if (!moveId || !finalBody.trim()) {
      return new Response(JSON.stringify({ error: 'move_id + final_body required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    enforceMaxLength(finalBody, 50_000, 'final_body');

    const { data: move, error: moveErr } = await supabase
      .from('moves')
      .select('id, user_id, match_id, channel, draft_body, state')
      .eq('id', moveId)
      .maybeSingle();
    if (moveErr) throw moveErr;
    if (!move) {
      return new Response(JSON.stringify({ error: 'move_not_found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // RLS would normally catch this but belt-and-braces.
    if (move.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const distance = levenshtein(move.draft_body as string, finalBody);
    const longer = Math.max((move.draft_body as string).length, finalBody.length);
    const normalized = longer === 0 ? 0 : Math.min(1, distance / longer);

    const now = new Date().toISOString();

    const { error: editErr } = await supabase.from('move_edits').insert({
      user_id: userId,
      move_id: move.id,
      match_id: move.match_id ?? null,
      channel: move.channel,
      draft_body: move.draft_body,
      final_body: finalBody,
      draft_len: (move.draft_body as string).length,
      final_len: finalBody.length,
      edit_distance: distance,
      normalized_distance: normalized,
    });
    if (editErr) throw editErr;

    await supabase.from('moves').update({
      state: 'sent',
      final_body: finalBody,
      edit_distance: distance,
      sent_at: now,
    }).eq('id', move.id);

    if (move.match_id) {
      await supabase.from('matches').update({
        state: 'sent',
      }).eq('id', move.match_id).eq('state', 'approved');
    }

    return new Response(JSON.stringify({
      ok: true,
      edit_distance: distance,
      normalized_distance: Number(normalized.toFixed(4)),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, requireAuth, safeErrorResponse } from '../_shared/compliance.ts';
import { collectIdentities, type Identity, type IdentityKind } from '../_shared/identity.ts';

/**
 * resolve-contact edge function.
 *
 * Given a set of identifiers (email, phone, linkedin_url, instagram, name+company),
 * returns the matching talent_contact for the caller - or null if none match.
 *
 * Dedup keys (strongest → weakest):
 *   1. linkedin_slug  (1.0)
 *   2. email          (1.0)
 *   3. phone (E.164)  (1.0)
 *   4. instagram      (0.9)
 *   5. name + company (0.6, name_company)
 *
 * Response:
 *   {
 *     matched: { contact_id: string, match_kind, confidence } | null,
 *     all_matches: [{ contact_id, match_kind, confidence }]
 *   }
 */
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { userId, supabase } = await requireAuth(req);
    const body = await req.json();

    const identities = collectIdentities({
      email: body.email,
      emails: body.emails,
      phone: body.phone,
      phones: body.phones,
      linkedin_url: body.linkedin_url,
      instagram: body.instagram,
      portfolio_url: body.portfolio_url,
      name: body.name,
      company: body.company,
    });

    if (identities.length === 0) {
      return json({ matched: null, all_matches: [] }, corsHeaders);
    }

    // Query identity table for any matching (user_id, kind, value_normalized).
    // We exclude name_company from the strong-match query (use only as weak fallback).
    const strong = identities.filter(i => i.kind !== 'name_company');
    const weak = identities.filter(i => i.kind === 'name_company');

    const matches: { contact_id: string; match_kind: IdentityKind; confidence: number }[] = [];

    if (strong.length > 0) {
      const or = strong.map(i =>
        `and(kind.eq.${i.kind},value_normalized.eq.${encodeURIComponent(i.value_normalized)})`
      ).join(',');
      const { data, error } = await supabase
        .from('talent_contact_identities')
        .select('contact_id, kind')
        .eq('user_id', userId)
        .or(or);
      if (error) throw error;
      for (const row of (data ?? []) as { contact_id: string; kind: IdentityKind }[]) {
        const src = strong.find(i => i.kind === row.kind);
        matches.push({
          contact_id: row.contact_id,
          match_kind: row.kind,
          confidence: src?.confidence ?? 1.0,
        });
      }
    }

    if (matches.length === 0 && weak.length > 0) {
      for (const w of weak) {
        const { data, error } = await supabase
          .from('talent_contact_identities')
          .select('contact_id')
          .eq('user_id', userId)
          .eq('kind', w.kind)
          .eq('value_normalized', w.value_normalized)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          matches.push({
            contact_id: data.contact_id as string,
            match_kind: w.kind,
            confidence: w.confidence,
          });
        }
      }
    }

    // Dedupe by contact_id, keep strongest confidence.
    const byContact = new Map<string, typeof matches[number]>();
    for (const m of matches) {
      const existing = byContact.get(m.contact_id);
      if (!existing || m.confidence > existing.confidence) {
        byContact.set(m.contact_id, m);
      }
    }
    const sorted = [...byContact.values()].sort((a, b) => b.confidence - a.confidence);

    return json({
      matched: sorted[0] ?? null,
      all_matches: sorted,
      identities_checked: identities.length,
    }, corsHeaders);
  } catch (err) {
    return safeErrorResponse(err, corsHeaders);
  }
});

function json(body: unknown, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

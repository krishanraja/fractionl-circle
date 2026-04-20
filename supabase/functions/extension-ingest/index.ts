import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit, enforceMaxLength } from '../_shared/compliance.ts';
import { fingerprint, writeCandidates, type Candidate } from '../_shared/circleSync.ts';

// Phase 9: ingestion endpoint for the Chrome extension. Each captured
// LinkedIn profile comes through here. We reuse the Phase 2b fingerprint +
// dedupe pipeline, write a `linkedin_extension` source (per user), and
// update/refresh the circle_person row.

interface IncomingProfile {
  source?: string;
  linkedin_url?: string;
  display_name?: string;
  title?: string | null;
  company?: string | null;
  headline?: string | null;
  location?: string | null;
  avatar_url?: string | null;
  captured_at?: string;
  raw?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { userId } = await requireAuth(req);
    checkRateLimit(`extension-ingest:${userId}`, 120, 60_000);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const profile = body?.profile as IncomingProfile | undefined;
    if (!profile) {
      return new Response(JSON.stringify({ error: 'No profile' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const name = (profile.display_name ?? '').trim();
    if (!name) {
      return new Response(JSON.stringify({ error: 'Missing display_name' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    enforceMaxLength(name, 200, 'display_name');
    if (profile.linkedin_url) enforceMaxLength(profile.linkedin_url, 500, 'linkedin_url');

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Find or create the user's linkedin_extension source.
    let sourceId: string;
    {
      const { data: existing, error } = await admin
        .from('sources')
        .select('id')
        .eq('user_id', userId)
        .eq('kind', 'linkedin_extension')
        .maybeSingle();
      if (error) throw error;
      if (existing) {
        sourceId = existing.id as string;
        await admin
          .from('sources')
          .update({ status: 'active', last_ingested_at: new Date().toISOString(), last_error: null })
          .eq('id', sourceId);
      } else {
        const { data: created, error: insErr } = await admin
          .from('sources')
          .insert({
            user_id: userId,
            kind: 'linkedin_extension',
            status: 'active',
            label: 'LinkedIn extension',
            last_ingested_at: new Date().toISOString(),
          })
          .select('id')
          .single();
        if (insErr || !created) throw insErr ?? new Error('Could not create source');
        sourceId = created.id as string;
      }
    }

    const fp = fingerprint({
      name,
      linkedin: profile.linkedin_url ?? null,
      company: profile.company ?? null,
    });
    if (!fp) {
      return new Response(JSON.stringify({ error: 'Not enough signal' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const candidate: Candidate = {
      fingerprint: fp,
      display_name: name,
      primary_email: null,
      primary_phone: null,
      linkedin_url: profile.linkedin_url ?? null,
      company: profile.company ?? null,
      title: profile.title ?? null,
      external_id: profile.linkedin_url ?? null,
      payload: {
        source: 'linkedin_extension',
        headline: profile.headline ?? null,
        location: profile.location ?? null,
        avatar_url: profile.avatar_url ?? null,
        captured_at: profile.captured_at ?? new Date().toISOString(),
        raw: profile.raw ?? {},
      },
    };

    const result = await writeCandidates(admin, userId, sourceId, [candidate]);

    // Best-effort: refresh last_interaction_at so the Match Engine's recency
    // ranker treats this person as freshly touched.
    const personId = result.idByFingerprint.get(fp);
    if (personId) {
      await admin
        .from('circle_person')
        .update({
          last_interaction_at: new Date().toISOString(),
          avatar_url: profile.avatar_url ?? undefined,
          location: profile.location ?? undefined,
        })
        .eq('id', personId);
    }

    return new Response(JSON.stringify({
      ok: true,
      circle_person_id: personId ?? null,
      circle_new: result.inserted,
      circle_merged: result.merged,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

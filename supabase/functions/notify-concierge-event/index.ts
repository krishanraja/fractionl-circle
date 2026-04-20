import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { getCorsHeaders, requireAuth, safeErrorResponse, checkRateLimit } from '../_shared/compliance.ts';

// Phase 11 follow-up: ping Slack / Email when a concierge request changes
// state. Auth-scoped to the owning user for requested/cancelled events;
// service-role-auth'd for ops state transitions (schedule/start/deliver)
// via the `x-cron-secret` header, re-used from the Phase 6 cron pattern.

type Event =
  | 'requested'
  | 'scheduled'
  | 'in_progress'
  | 'delivered'
  | 'cancelled';

const SLACK_WEBHOOK_URL = Deno.env.get('CONCIERGE_SLACK_WEBHOOK_URL') ?? '';
const OPS_EMAIL_TO = Deno.env.get('CONCIERGE_OPS_EMAIL') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('CONCIERGE_FROM_EMAIL') ?? 'circle@fractionl.ai';
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';

interface RequestRow {
  id: string;
  user_id: string;
  status: string;
  preferred_times: string | null;
  notes: string | null;
  scheduled_at: string | null;
  assigned_to: string | null;
  ops_notes: string | null;
  result_stats: Record<string, unknown> | null;
  created_at: string;
}

async function postSlack(text: string, blocks?: unknown[]) {
  if (!SLACK_WEBHOOK_URL) return;
  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, blocks }),
    });
  } catch (e) {
    console.warn('slack notify failed', e instanceof Error ? e.message : e);
  }
}

async function sendEmail(subject: string, html: string) {
  if (!RESEND_API_KEY || !OPS_EMAIL_TO) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: OPS_EMAIL_TO.split(',').map((s) => s.trim()).filter(Boolean),
        subject,
        html,
      }),
    });
  } catch (e) {
    console.warn('email notify failed', e instanceof Error ? e.message : e);
  }
}

function composeMessage(event: Event, req: RequestRow, email: string | null) {
  const who = email ?? req.user_id.slice(0, 8);
  switch (event) {
    case 'requested':
      return {
        text: `:bellhop_bell: New Chief-of-Staff concierge request from ${who}`,
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `*New concierge request* — \`${req.id.slice(0, 8)}\`` },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*User*\n${who}` },
              { type: 'mrkdwn', text: `*Preferred times*\n${req.preferred_times ?? '_none_'}` },
            ],
          },
          req.notes ? {
            type: 'section',
            text: { type: 'mrkdwn', text: `*Notes*\n${req.notes}` },
          } : null,
        ].filter(Boolean),
        subject: `[Circle] New concierge request — ${who}`,
        html: `<p><strong>New concierge request</strong> (${req.id.slice(0, 8)})</p>
<p><strong>User:</strong> ${who}</p>
<p><strong>Preferred times:</strong> ${req.preferred_times ?? '<em>none</em>'}</p>
${req.notes ? `<p><strong>Notes:</strong><br>${req.notes.replace(/\n/g, '<br>')}</p>` : ''}
<p>Run <code>node scripts/concierge-inbox.mjs show ${req.id}</code> for attachments.</p>`,
      };
    case 'scheduled':
      return {
        text: `:calendar: Concierge scheduled — ${who} on ${req.scheduled_at ?? 'TBD'}`,
        blocks: undefined,
        subject: `[Circle] Concierge scheduled — ${who}`,
        html: `<p>Concierge scheduled for <strong>${req.scheduled_at ?? 'TBD'}</strong></p>
<p><strong>User:</strong> ${who}</p>
<p><strong>Assigned:</strong> ${req.assigned_to ?? '<em>unassigned</em>'}</p>`,
      };
    case 'in_progress':
      return {
        text: `:construction: Concierge in progress — ${who}`,
        blocks: undefined,
        subject: `[Circle] Concierge in progress — ${who}`,
        html: `<p>Concierge in progress for ${who}. Circle normalization underway.</p>`,
      };
    case 'delivered':
      return {
        text: `:white_check_mark: Concierge delivered — ${who}`,
        blocks: undefined,
        subject: `[Circle] Concierge delivered — ${who}`,
        html: `<p>Concierge delivered for ${who}.</p>
${req.ops_notes ? `<p><strong>Ops notes:</strong><br>${req.ops_notes.replace(/\n/g, '<br>')}</p>` : ''}
${req.result_stats ? `<pre>${JSON.stringify(req.result_stats, null, 2)}</pre>` : ''}`,
      };
    case 'cancelled':
      return {
        text: `:x: Concierge cancelled — ${who}`,
        blocks: undefined,
        subject: `[Circle] Concierge cancelled — ${who}`,
        html: `<p>Concierge cancelled by ${who}.</p>
${req.ops_notes ? `<p><strong>Ops notes:</strong><br>${req.ops_notes.replace(/\n/g, '<br>')}</p>` : ''}`,
      };
  }
}

// Two entrypoints sharing this function: user JWT (for self-initiated
// events) and service-role with CRON_SECRET (for ops transitions).
async function authContext(req: Request): Promise<{ mode: 'user' | 'service'; userId?: string }> {
  const cronSecret = req.headers.get('x-cron-secret');
  if (CRON_SECRET && cronSecret && cronSecret === CRON_SECRET) {
    return { mode: 'service' };
  }
  const { userId } = await requireAuth(req);
  return { mode: 'user', userId };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const ctx = await authContext(req);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const event = body?.event as Event | undefined;
    const requestId = typeof body?.request_id === 'string' ? body.request_id : null;
    if (!event || !requestId) {
      return new Response(JSON.stringify({ error: 'event + request_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (ctx.mode === 'user') {
      checkRateLimit(`notify-concierge-event:${ctx.userId}`, 10, 60_000);
      if (!['requested', 'cancelled'].includes(event)) {
        return new Response(JSON.stringify({ error: 'event not allowed for user mode' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: r, error } = await admin
      .from('concierge_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();
    if (error) throw error;
    if (!r) {
      return new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Guard: if user-mode, caller must own the row.
    if (ctx.mode === 'user' && r.user_id !== ctx.userId) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: userLookup } = await admin.auth.admin.getUserById(r.user_id);
    const email = userLookup?.user?.email ?? null;

    const msg = composeMessage(event, r as RequestRow, email);
    await Promise.all([
      postSlack(msg.text, msg.blocks),
      sendEmail(msg.subject, msg.html),
    ]);

    return new Response(JSON.stringify({
      ok: true,
      dispatched: {
        slack: !!SLACK_WEBHOOK_URL,
        email: !!(RESEND_API_KEY && OPS_EMAIL_TO),
      },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return safeErrorResponse(error, getCorsHeaders(req));
  }
});

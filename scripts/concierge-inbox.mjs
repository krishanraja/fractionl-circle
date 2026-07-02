#!/usr/bin/env node
// Ops CLI for the Chief of Staff concierge queue.
//
// Run locally or from the ops shell with:
//   SUPABASE_URL=https://<PROJECT_REF>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=<service role key> \
//   node scripts/concierge-inbox.mjs <command> [args]
//
// Commands:
//   list [--status requested|scheduled|in_progress|delivered|cancelled|active]
//     List concierge requests. `active` = requested | scheduled | in_progress.
//
//   show <request_id>
//     Full details for one request, including the user's email, attachments
//     in the concierge-uploads bucket, and signed download URLs (1h).
//
//   schedule <request_id> --at <iso-datetime> [--assigned <name-or-email>]
//     Move the request to scheduled and optionally record who's running the call.
//
//   book-url <request_id> --url <calendly-or-cal.com-link>
//     Attach a booking link the user can click from Today. Works on any
//     request in `requested` or `scheduled`. User picks a slot themselves.
//
//   start <request_id>
//     Mark in_progress - typically right after the call ends.
//
//   deliver <request_id> [--note "..."]
//     Mark delivered. Stamps completed_at. --note populates ops_notes, which
//     shows up in the user's Today card.
//
//   cancel <request_id> [--note "..."]
//     Cancel without delivering. Frees the user's active-request slot.
//
// The Supabase JS SDK is the only dep; if it's not available, run with
//   npx @supabase/supabase-js@2.53.0 ...
// or add it to your dev env.

const MODULE = '@supabase/supabase-js';

let createClient;
try {
  ({ createClient } = await import(MODULE));
} catch {
  console.error(`Missing ${MODULE}. Run from the repo root where it's installed:`);
  console.error(`  npm install --no-save ${MODULE}@2.53.0`);
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// CLI argument parsing.
// ---------------------------------------------------------------------------

function parseFlags(argv) {
  const args = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      args.push(a);
    }
  }
  return { args, flags };
}

// ---------------------------------------------------------------------------
// Formatting helpers.
// ---------------------------------------------------------------------------

const BADGE = {
  requested: '\x1b[33m[REQ]\x1b[0m',
  scheduled: '\x1b[36m[SCH]\x1b[0m',
  in_progress: '\x1b[35m[WIP]\x1b[0m',
  delivered: '\x1b[32m[DLV]\x1b[0m',
  cancelled: '\x1b[90m[CAN]\x1b[0m',
};

function shortId(id) {
  return id ? id.slice(0, 8) : '????????';
}

async function userEmail(userId) {
  try {
    const { data } = await admin.auth.admin.getUserById(userId);
    return data?.user?.email ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Commands.
// ---------------------------------------------------------------------------

async function cmdList(flags) {
  const status = flags.status ?? 'active';
  let query = admin
    .from('concierge_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (status === 'active') {
    query = query.in('status', ['requested', 'scheduled', 'in_progress']);
  } else if (typeof status === 'string') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) {
    console.error('query failed:', error.message);
    process.exit(2);
  }
  if (!data?.length) {
    console.log('no requests.');
    return;
  }

  // Hydrate emails in parallel.
  const emails = await Promise.all(data.map((r) => userEmail(r.user_id)));

  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    const age = Math.floor((Date.now() - new Date(r.created_at).getTime()) / 3_600_000);
    console.log(
      `${BADGE[r.status] ?? '[???]'} ${shortId(r.id)}  ${emails[i] ?? r.user_id.slice(0, 8)}  ${age}h ago`
    );
    if (r.preferred_times) {
      console.log(`      when: ${r.preferred_times}`);
    }
    if (r.scheduled_at) {
      console.log(`      scheduled_at: ${r.scheduled_at}`);
    }
  }
  console.log(`\n${data.length} shown.`);
}

async function cmdShow(args) {
  const id = args[0];
  if (!id) { console.error('usage: show <request_id>'); process.exit(2); }

  const { data: r, error } = await admin
    .from('concierge_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) { console.error(error.message); process.exit(2); }
  if (!r) { console.error('not found'); process.exit(2); }

  const email = await userEmail(r.user_id);
  console.log(`${BADGE[r.status] ?? ''} ${r.id}`);
  console.log(`user:          ${email ?? r.user_id}`);
  console.log(`status:        ${r.status}`);
  console.log(`created_at:    ${r.created_at}`);
  console.log(`preferred:     ${r.preferred_times ?? '-'}`);
  console.log(`scheduled_at:  ${r.scheduled_at ?? '-'}`);
  console.log(`assigned_to:   ${r.assigned_to ?? '-'}`);
  console.log(`notes:         ${r.notes ? '\n  ' + r.notes.replace(/\n/g, '\n  ') : '-'}`);
  console.log(`ops_notes:     ${r.ops_notes ? '\n  ' + r.ops_notes.replace(/\n/g, '\n  ') : '-'}`);

  // Attachments in the concierge-uploads bucket, keyed by {user_id}/{request_id}/.
  const prefix = `${r.user_id}/${r.id}`;
  const { data: files, error: listErr } = await admin.storage
    .from('concierge-uploads')
    .list(prefix, { limit: 100 });
  if (listErr) {
    console.log(`attachments:   (list failed: ${listErr.message})`);
    return;
  }
  if (!files?.length) {
    console.log('attachments:   none');
    return;
  }
  console.log('attachments:');
  for (const f of files) {
    const fullPath = `${prefix}/${f.name}`;
    const { data: signed } = await admin.storage
      .from('concierge-uploads')
      .createSignedUrl(fullPath, 3600);
    console.log(`  - ${f.name}  (${f.metadata?.size ?? '?'} bytes)`);
    if (signed?.signedUrl) console.log(`    ${signed.signedUrl}`);
  }
}

async function cmdSchedule(args, flags) {
  const id = args[0];
  if (!id || !flags.at) {
    console.error('usage: schedule <request_id> --at <iso> [--assigned name]');
    process.exit(2);
  }
  const patch = {
    status: 'scheduled',
    scheduled_at: new Date(flags.at).toISOString(),
    assigned_to: flags.assigned ?? null,
  };
  const { error } = await admin.from('concierge_requests').update(patch).eq('id', id);
  if (error) { console.error(error.message); process.exit(2); }
  console.log(`scheduled ${shortId(id)} at ${patch.scheduled_at}`);
}

async function cmdBookUrl(args, flags) {
  const id = args[0];
  if (!id || !flags.url) {
    console.error('usage: book-url <request_id> --url <link>');
    process.exit(2);
  }
  const { error } = await admin
    .from('concierge_requests')
    .update({ booking_url: flags.url })
    .eq('id', id);
  if (error) { console.error(error.message); process.exit(2); }
  console.log(`booking_url set on ${shortId(id)}`);
}

async function cmdStart(args) {
  const id = args[0];
  if (!id) { console.error('usage: start <request_id>'); process.exit(2); }
  const { error } = await admin
    .from('concierge_requests')
    .update({ status: 'in_progress' })
    .eq('id', id);
  if (error) { console.error(error.message); process.exit(2); }
  console.log(`in_progress ${shortId(id)}`);
}

async function cmdDeliver(args, flags) {
  const id = args[0];
  if (!id) { console.error('usage: deliver <request_id> [--note "..."]'); process.exit(2); }
  const patch = {
    status: 'delivered',
    completed_at: new Date().toISOString(),
    ops_notes: flags.note ?? null,
  };
  const { error } = await admin.from('concierge_requests').update(patch).eq('id', id);
  if (error) { console.error(error.message); process.exit(2); }
  console.log(`delivered ${shortId(id)}`);
}

async function cmdCancel(args, flags) {
  const id = args[0];
  if (!id) { console.error('usage: cancel <request_id> [--note "..."]'); process.exit(2); }
  const patch = {
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
    ops_notes: flags.note ?? null,
  };
  const { error } = await admin.from('concierge_requests').update(patch).eq('id', id);
  if (error) { console.error(error.message); process.exit(2); }
  console.log(`cancelled ${shortId(id)}`);
}

// ---------------------------------------------------------------------------
// Dispatch.
// ---------------------------------------------------------------------------

const { args: positional, flags } = parseFlags(process.argv.slice(2));
const [cmd, ...rest] = positional;

switch (cmd) {
  case 'list':     await cmdList(flags); break;
  case 'show':     await cmdShow(rest); break;
  case 'schedule': await cmdSchedule(rest, flags); break;
  case 'book-url': await cmdBookUrl(rest, flags); break;
  case 'start':    await cmdStart(rest); break;
  case 'deliver':  await cmdDeliver(rest, flags); break;
  case 'cancel':   await cmdCancel(rest, flags); break;
  default:
    console.error('usage: concierge-inbox.mjs <list|show|schedule|book-url|start|deliver|cancel> [args]');
    process.exit(2);
}

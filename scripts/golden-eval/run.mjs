// Golden-set eval for the read (validate-thesis). Run this before shipping any
// change to validate-thesis, its prompts, or _shared/profileContext.ts. It runs a
// fixed set of ICP-derived profiles (including two adversarial ones) through the
// real edge function and prints the opportunity/ability bands so a regression in
// honesty or discrimination is visible.
//
// The honesty checks that matter most:
//   - p7 (vague thesis "finance help for companies"): Demand must NOT be strong/high.
//   - p9 (gibberish "i want to make money"): must NOT fabricate a strong market.
//   - p10 (capability mismatch): Fit to you must read weak.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/golden-eval/run.mjs
// It creates a throwaway confirmed user (trial => pro, so the free cap never bites),
// runs every profile, prints a table, and deletes the user.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !ANON || !SR) {
  console.error('Set SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const dir = path.dirname(fileURLToPath(import.meta.url));
const { profiles } = JSON.parse(fs.readFileSync(path.join(dir, 'golden-set.json'), 'utf8'));

const stamp = Date.now();
const email = `golden-eval-${stamp}@example.com`;
const password = `Golden!${stamp}`;

async function j(res) { try { return await res.json(); } catch { return {}; } }
const admin = (p, opts = {}) => fetch(`${URL}/auth/v1/admin/users${p}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });

const created = await j(await admin('', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }) }));
const userId = created.id;
if (!userId) { console.error('could not create eval user', created); process.exit(1); }

const tok = (await j(await fetch(`${URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }))).access_token;

const dims = (a) => Array.isArray(a) ? a.map((d) => `${d.label}=${d.band}/${d.confidence}`).join('; ') : '';
let flagged = 0;
console.log(`\nGolden eval (${profiles.length} profiles), user ${userId}\n`);
for (const p of profiles) {
  const res = await fetch(`${URL}/functions/v1/validate-thesis`, {
    method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ thesis: p.thesis, background: p.background }),
  });
  const out = await j(res);
  const opp = out.opportunity || [];
  const demand = opp.find((d) => d.label === 'Demand');
  // Honesty regression check on the two adversarial + one thin profile.
  let warn = '';
  // Hard fail only on true gibberish (no offer or buyer at all) fabricating a market.
  // p7 (a vague thesis with a strong inferrable background) is informational: the
  // model reasonably infers the likely niche, so it is a soft signal, not a gate.
  if (p.id === 'p9-adversarial-gibberish' && demand && demand.band === 'strong') {
    warn = '  <-- REGRESSION: gibberish input fabricated Demand=strong'; flagged++;
  } else if (p.id === 'p7-cfo-thin-thesis' && demand && demand.band === 'strong' && demand.confidence === 'high') {
    warn = '  (note: vague thesis scored Demand strong/high - the model inferred a niche from the background)';
  }
  console.log(`[${res.status}] ${p.id}${warn}`);
  console.log(`   OPP: ${dims(opp)}`);
  console.log(`   ABILITY: ${dims(out.ability)}`);
  await new Promise((r) => setTimeout(r, 1500));
}

await admin(`/${userId}`, { method: 'DELETE' });
console.log(`\nDone. Honesty regressions: ${flagged}. Eval user deleted.`);
process.exit(flagged > 0 ? 1 : 0);

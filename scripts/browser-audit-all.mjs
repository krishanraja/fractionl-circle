/**
 * Runs all browser audit scripts in sequence. Exit 1 if any sub-script fails.
 */
import { spawn } from 'node:child_process';

const scripts = [
  'scripts/browser-audit-full.mjs',
  'scripts/browser-audit-links.mjs',
];

const optionalScripts = ['scripts/browser-audit-settings.mjs'];

const env = { ...process.env };

function run(script, { required = true } = {}) {
  return new Promise((resolve) => {
    const child = spawn('node', [script], { stdio: 'inherit', env });
    child.on('close', (code) => {
      if (code === 0) resolve({ script, ok: true });
      else if (required) resolve({ script, ok: false, code });
      else resolve({ script, ok: false, code, optional: true });
    });
  });
}

const outcomes = [];
for (const s of [...scripts, ...optionalScripts]) {
  console.log(`\n--- ${s} ---\n`);
  const required = !optionalScripts.includes(s);
  outcomes.push(await run(s, { required }));
}
const failed = outcomes.filter((o) => !o.ok && !o.optional);
const soft = outcomes.filter((o) => !o.ok && o.optional);
if (soft.length) console.warn('Optional audits had failures:', soft.map((s) => s.script).join(', '));
if (failed.length) {
  console.error('Required audits failed:', failed.map((s) => s.script).join(', '));
  process.exit(1);
}
console.log('\nAll required browser audits passed.\n');

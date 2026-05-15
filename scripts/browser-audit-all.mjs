/**
 * Runs all browser audit scripts in sequence. Exit 1 if any sub-script fails.
 */
import { spawn } from 'node:child_process';

const scripts = [
  'scripts/browser-audit-full.mjs',
  'scripts/browser-audit-links.mjs',
];

const env = { ...process.env };

function run(script) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [script], { stdio: 'inherit', env });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${script} exited ${code}`))));
  });
}

for (const s of scripts) {
  console.log(`\n--- ${s} ---\n`);
  await run(s);
}
console.log('\nAll browser audits passed.\n');

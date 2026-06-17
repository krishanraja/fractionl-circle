// Unit tests for the provider-fallback logic. Pure, offline (mock providers/env).
//   deno test supabase/functions/_shared/llm.test.ts
import { availableProviders, chatJSON, type Provider } from './llm.ts';

function eq(a: unknown, b: unknown, msg: string) {
  const A = JSON.stringify(a);
  const B = JSON.stringify(b);
  if (A !== B) throw new Error(`FAIL ${msg}: got ${A}, expected ${B}`);
}
async function throws(fn: () => Promise<unknown>, msg: string) {
  try {
    await fn();
  } catch {
    return;
  }
  throw new Error(`FAIL ${msg}: expected throw`);
}

const env = (m: Record<string, string>): (k: string) => string | undefined => (k) => m[k];

Deno.test('availableProviders: order is openai, lovable, anthropic by key presence', () => {
  eq(availableProviders(env({ OPENAI_API_KEY: 'x', LOVABLE_API_KEY: 'y', ANTHROPIC_API_KEY: 'z' })).map((p) => p.name),
    ['openai', 'lovable', 'anthropic'], 'all three');
  eq(availableProviders(env({ LOVABLE_API_KEY: 'y' })).map((p) => p.name), ['lovable'], 'only lovable');
  eq(availableProviders(env({})).map((p) => p.name), [], 'none');
});

const ok = (name: string, out: string): Provider => ({ name, run: () => Promise.resolve(out) });
const bad = (name: string): Provider => ({ name, run: () => Promise.reject(new Error(`${name} down`)) });

Deno.test('chatJSON: falls through a failing provider to the next', async () => {
  const r = await chatJSON({ system: 's', user: 'u' }, { providers: [bad('openai'), ok('lovable', '{"ok":true}')] });
  eq(r.provider, 'lovable', 'used fallback');
  eq(r.content, '{"ok":true}', 'content');
});

Deno.test('chatJSON: returns the first success', async () => {
  const r = await chatJSON({ system: 's', user: 'u' }, { providers: [ok('openai', 'A'), ok('lovable', 'B')] });
  eq(r.provider, 'openai', 'first wins');
});

Deno.test('chatJSON: throws when every provider fails', async () => {
  await throws(() => chatJSON({ system: 's', user: 'u' }, { providers: [bad('openai'), bad('lovable')] }), 'all fail');
});

Deno.test('chatJSON: throws when none configured', async () => {
  await throws(() => chatJSON({ system: 's', user: 'u' }, { providers: [] }), 'none configured');
});

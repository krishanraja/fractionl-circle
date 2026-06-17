// Shared chat-completion helper with provider fallback. Tries OpenAI first (if its
// key works), then the Lovable gateway (Gemini, OpenAI-compatible, key already set
// on the project), then Anthropic. Returns the raw assistant message string plus the
// provider that answered. Keeps every LLM-backed function alive when one provider is
// down or out of quota. (OpenAI billing was exhausted, so the Gemini gateway is the
// live path today; this helper makes that automatic instead of a hard dead-end.)

export interface ChatOpts {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface Provider {
  name: string;
  run: (o: ChatOpts) => Promise<string>;
}

type Env = (k: string) => string | undefined;

const openAiCompatible = (name: string, url: string, key: string, model: string): Provider => ({
  name,
  run: async ({ system, user, temperature = 0.3, maxTokens, timeoutMs = 20_000 }) => {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
        temperature,
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
        store: false,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!resp.ok) throw new Error(`${name} ${resp.status}`);
    const json = await resp.json();
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content) throw new Error(`${name}: empty content`);
    return content;
  },
});

const anthropicProvider = (key: string, model: string): Provider => ({
  name: 'anthropic',
  run: async ({ system, user, temperature = 0.3, maxTokens = 1500, timeoutMs = 20_000 }) => {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        // Nudge JSON-only output since the messages API has no response_format.
        system: `${system}\n\nReturn ONLY valid JSON, no prose, no markdown fences.`,
        messages: [{ role: 'user', content: user }],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!resp.ok) throw new Error(`anthropic ${resp.status}`);
    const json = await resp.json();
    const content = json?.content?.[0]?.text;
    if (typeof content !== 'string' || !content) throw new Error('anthropic: empty content');
    return content;
  },
});

// Build the ordered provider list from whatever keys are present. Order is the
// fallback order. Pure + env-injected so it is unit-testable.
export const availableProviders = (env: Env): Provider[] => {
  const list: Provider[] = [];
  const openai = env('OPENAI_API_KEY');
  if (openai) list.push(openAiCompatible('openai', 'https://api.openai.com/v1/chat/completions', openai, 'gpt-4o-mini'));
  const lovable = env('LOVABLE_API_KEY');
  if (lovable) list.push(openAiCompatible('lovable', 'https://ai.gateway.lovable.dev/v1/chat/completions', lovable, 'google/gemini-3-flash-preview'));
  const anthropic = env('ANTHROPIC_API_KEY');
  if (anthropic) list.push(anthropicProvider(anthropic, 'claude-haiku-4-5-20251001'));
  return list;
};

// Try each provider in turn; return the first success. Throws only if every
// configured provider fails (aggregating their errors). `providers` is injectable
// for testing the fallback logic without the network.
export async function chatJSON(
  opts: ChatOpts,
  deps: { env?: Env; providers?: Provider[] } = {},
): Promise<{ content: string; provider: string }> {
  const env: Env = deps.env ?? ((k) => Deno.env.get(k));
  const providers = deps.providers ?? availableProviders(env);
  if (!providers.length) throw new Error('no LLM provider configured');
  const errors: string[] = [];
  for (const p of providers) {
    try {
      return { content: await p.run(opts), provider: p.name };
    } catch (e) {
      errors.push(`${p.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  throw new Error(`all LLM providers failed (${errors.join('; ')})`);
}

// supabase-js sets `error.message` to a generic "Edge Function returned a
// non-2xx status code" for any non-2xx response and stashes the actual
// Response on `error.context`. Components that only read `.message` therefore
// hide the real reason (an upgrade gate, a misconfiguration, a validation
// message). This helper reads the JSON body off `error.context` so the UI can
// branch on the structured `{ error, message, feature }` an edge function
// returns. See supabase/functions/_shared/compliance.ts (safeErrorResponse).

export interface EdgeErrorBody {
  error?: string;
  message?: string;
  feature?: string;
  status?: number;
}

export async function readEdgeError(err: unknown): Promise<EdgeErrorBody> {
  const ctx = (err as { context?: unknown } | null)?.context;
  // FunctionsHttpError carries the raw Response on `.context`.
  if (ctx && typeof (ctx as Response).json === 'function') {
    const res = ctx as Response;
    try {
      const body = await res.clone().json();
      if (body && typeof body === 'object') {
        return { ...(body as EdgeErrorBody), status: res.status };
      }
    } catch {
      // Body was not JSON (or already consumed) — fall through to text/message.
    }
    try {
      const text = await res.clone().text();
      if (text) return { message: text, status: res.status };
    } catch {
      /* ignore */
    }
    return { status: res.status };
  }
  return { message: err instanceof Error ? err.message : String(err) };
}

// Turn a parsed edge error into one human sentence in the product's voice.
// `fallback` is shown when we genuinely have nothing better.
export function humanizeEdgeError(body: EdgeErrorBody, fallback: string): string {
  const code = (body.error ?? '').toLowerCase();
  if (code === 'upgrade_required') {
    return body.message || 'That feature is available on a paid plan.';
  }
  if (code.includes('not configured') || /not configured/i.test(body.message ?? '')) {
    return "That's on us — your account is fine. We're still finishing this connection. Try a CSV or Quick add for now.";
  }
  if (body.status === 429 || code.includes('rate')) {
    return 'A few too many tries in a row — give it a moment and retry.';
  }
  return body.message || fallback;
}

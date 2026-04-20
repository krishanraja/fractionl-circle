import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Loader2, AlertCircle, Chrome } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type State = 'idle' | 'loading' | 'ready' | 'error';

// Phase 9: produces a one-time pairing token the user pastes into the
// Circle browser extension. Bundles the active Supabase session +
// project URL + anon key into a single base64 string.

export const ExtensionPair = () => {
  const [state, setState] = useState<State>('idle');
  const [token, setToken] = useState('');
  const [email, setEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    void generate();
    // regenerate on focus — Supabase may have refreshed the JWT.
    const onFocus = () => { void generate(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = async () => {
    setState('loading');
    setErrorMsg('');
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      const session = data.session;
      if (!session) throw new Error('Not signed in.');

      const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
      if (!url || !anonKey) throw new Error('Missing Supabase env.');

      const pairing = {
        url,
        anon_key: anonKey,
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at
          ? new Date(session.expires_at * 1000).toISOString()
          : new Date(Date.now() + 3_600_000).toISOString(),
        email: session.user.email ?? null,
      };
      setEmail(pairing.email);
      setToken(btoa(JSON.stringify(pairing)));
      setState('ready');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Could not generate pairing token');
      setState('error');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      toast.success('Pairing token copied.');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy — select the text manually.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card/50 backdrop-blur p-4 text-xs text-foreground-secondary leading-relaxed">
        <p className="mb-2 font-medium text-foreground">How to pair</p>
        <ol className="list-decimal pl-4 space-y-1">
          <li>Install the Circle extension in Chrome / Arc (see the extension folder in the repo).</li>
          <li>Open any LinkedIn profile.</li>
          <li>Click the Circle extension icon in the toolbar.</li>
          <li>Paste this token into the popup and hit <span className="font-medium">Connect</span>.</li>
        </ol>
        <p className="mt-2">
          Tokens expire after about an hour — if it stops working, come back here and grab a fresh one.
        </p>
      </div>

      {state === 'loading' && (
        <div className="flex flex-col items-center gap-2 py-6">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <p className="text-xs text-foreground-secondary">Minting a pairing token…</p>
        </div>
      )}

      {state === 'error' && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-foreground">{errorMsg}</p>
            <button onClick={generate} className="mt-1 text-xs underline text-foreground-secondary">
              Retry
            </button>
          </div>
        </div>
      )}

      {state === 'ready' && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          {email && (
            <p className="text-xs text-foreground-secondary">
              Signed in as <span className="font-medium text-foreground">{email}</span>
            </p>
          )}
          <textarea
            value={token}
            readOnly
            onFocus={(e) => e.currentTarget.select()}
            className="w-full h-24 rounded-xl border border-border/60 bg-background p-2 font-mono text-[11px] text-foreground-secondary leading-tight resize-none"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className={cn(
                'flex-1 h-10 rounded-full bg-primary text-primary-foreground text-sm font-medium',
                'inline-flex items-center justify-center gap-1.5 shadow-sm shadow-primary/20'
              )}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy pairing token'}
            </button>
            <button
              onClick={generate}
              className="h-10 px-4 rounded-full border border-border/60 bg-card/60 text-sm font-medium text-foreground-secondary"
            >
              <Chrome className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

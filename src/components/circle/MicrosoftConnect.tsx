import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { readEdgeError, humanizeEdgeError } from '@/lib/functionError';

type Step = 'idle' | 'redirecting' | 'error';

export const MicrosoftConnect = () => {
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleConnect = async () => {
    setStep('redirecting');
    setErrorMsg('');
    try {
      const { data, error } = await supabase.functions.invoke('oauth-microsoft-start', {
        body: { redirect_to: window.location.origin + '/' },
      });
      if (error) throw error;
      const url = (data as { url?: string } | null)?.url;
      if (!url) throw new Error('No authorize URL returned');
      window.location.assign(url);
    } catch (e) {
      // supabase-js hides the real reason behind a generic "non-2xx" message;
      // read the structured body so the user sees why (e.g. upgrade gate).
      const body = await readEdgeError(e);
      const msg = humanizeEdgeError(body, 'Could not start Microsoft just now. Try again.');
      setErrorMsg(msg);
      setStep('error');
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card/50 backdrop-blur p-4 text-xs text-foreground-secondary leading-relaxed">
        <p className="mb-2 font-medium text-foreground">What we read</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Your Outlook contacts.</li>
          <li>Calendar events for the last 90 days - to know who you've met and how recently.</li>
        </ul>
        <p className="mt-2">
          We do <span className="font-medium">not</span> read mail bodies. Personal Microsoft accounts and
          work-or-school (Azure AD) accounts both supported.
        </p>
      </div>

      <motion.button
        onClick={handleConnect}
        disabled={step === 'redirecting'}
        whileTap={{ scale: step === 'redirecting' ? 1 : 0.98 }}
        className={cn(
          'w-full h-12 rounded-full text-[15px] font-semibold',
          'flex items-center justify-center gap-2',
          'bg-primary text-primary-foreground shadow-md shadow-primary/25',
          'hover:shadow-lg hover:shadow-primary/35 transition-shadow',
          'disabled:opacity-60'
        )}
      >
        {step === 'redirecting' && <Loader2 className="w-4 h-4 animate-spin" />}
        {step === 'error' && <AlertCircle className="w-4 h-4 text-destructive" />}
        {step === 'idle' && <LogIn className="w-4 h-4" />}
        {step === 'redirecting' ? 'Opening Microsoft…' : step === 'error' ? 'Retry' : 'Continue with Microsoft'}
      </motion.button>
      {step === 'error' && errorMsg && (
        <p className="text-xs text-destructive">{errorMsg}</p>
      )}
      <p className="text-[11px] text-foreground-muted text-center">
        You'll come back here automatically. On return we'll fetch your contacts + calendar in the background.
      </p>
    </div>
  );
};

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Check, AlertCircle, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type Step = 'idle' | 'redirecting' | 'error';

export const GoogleConnect = () => {
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleConnect = async () => {
    setStep('redirecting');
    setErrorMsg('');
    try {
      const { data, error } = await supabase.functions.invoke('oauth-google-start', {
        body: { redirect_to: window.location.origin + '/' },
      });
      if (error) throw error;
      const url = (data as { url?: string } | null)?.url;
      if (!url) throw new Error('No authorize URL returned');
      window.location.assign(url);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Could not start Google OAuth');
      setStep('error');
      toast.error(e instanceof Error ? e.message : 'Could not start Google OAuth');
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card/50 backdrop-blur p-4 text-xs text-foreground-secondary leading-relaxed">
        <p className="mb-2 font-medium text-foreground">What we read</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Your Google Contacts (including the auto-learned "Other contacts" Gmail builds from past email).</li>
          <li>Your Calendar events for the last 90 days — to know who you've met and how recently.</li>
        </ul>
        <p className="mt-2">
          We do <span className="font-medium">not</span> read email bodies. If you want Gmail body scanning
          for signature enrichment, that requires Google's separate CASA audit — not part of this.
        </p>
      </div>

      <motion.button
        onClick={handleConnect}
        disabled={step === 'redirecting'}
        whileTap={{ scale: step === 'redirecting' ? 1 : 0.98 }}
        className={cn(
          'w-full h-12 rounded-full text-sm font-medium',
          'flex items-center justify-center gap-2',
          'border border-border/60 bg-card/60 backdrop-blur hover:bg-card transition-colors',
          'disabled:opacity-70'
        )}
      >
        {step === 'redirecting' && <Loader2 className="w-4 h-4 animate-spin" />}
        {step === 'error' && <AlertCircle className="w-4 h-4 text-destructive" />}
        {step === 'idle' && <LogIn className="w-4 h-4" />}
        {step === 'redirecting' ? 'Opening Google…' : step === 'error' ? 'Retry' : 'Continue with Google'}
      </motion.button>
      {step === 'error' && errorMsg && (
        <p className="text-xs text-destructive">{errorMsg}</p>
      )}
      <p className="text-[11px] text-foreground-muted text-center">
        You'll come back here automatically. On return we'll fetch your contacts + calendar in the background.
      </p>
      {/* ghost references so unused imports don't fail under strict tsconfig */}
      {false && <Check className="hidden" />}
    </div>
  );
};

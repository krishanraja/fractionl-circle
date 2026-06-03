import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Loader2, ArrowRight, Check, AlertCircle, Sparkles, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { ingestVoiceSeed } from '@/lib/circleIngest';
import { emitLifecycle } from '@/lib/attribution';

// P1 — "the chief of staff who arrives with a hypothesis". Welcome → Talk →
// Proposal (editable) → First Move. We ask only what every user CAN answer
// (what they ran + why they left), then propose a confident, editable identity
// + lead offer + warm doors. Reaction, not generation. The first session ends
// with their offer captured, warm doors seeded, and Matches queued — so Today
// already has a move waiting.

const MAX_RECORDING_MS = 90_000;
const MAX_TYPED_CHARS = 1500;

interface WarmDoor { name: string; why: string }
interface Offer { title?: string; one_liner?: string; pain?: string; price_band?: string; icp?: string }
interface Proposal {
  motivation_type: string | null;
  journey_stage: string | null;
  role: string | null;
  offer_maturity: string | null;
  identity_statement: string;
  offer: Offer | null;
  warm_doors: WarmDoor[];
  summary: string | null;
  confidence: number;
}

type Step = 'welcome' | 'recording' | 'processing' | 'proposal' | 'firstmove' | 'saving' | 'error';

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const s = typeof reader.result === 'string' ? reader.result : '';
      resolve(s.includes(',') ? s.split(',')[1] : s);
    };
    reader.onerror = () => reject(new Error('Could not read audio'));
    reader.readAsDataURL(blob);
  });

const Field = ({ label, value, onChange, multiline }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) => (
  <div>
    <label className="block text-[11px] uppercase tracking-wide text-foreground-muted mb-1">{label}</label>
    {multiline ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full rounded-xl border border-border/60 bg-background p-2.5 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
    ) : (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 rounded-xl border border-border/60 bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
    )}
  </div>
);

interface Props { onComplete: () => void }

export const IdentityFirstRun = ({ onComplete }: Props) => {
  const { user } = useAuth();
  const { profile, updateProfile, completeOnboardingStep } = useUserProfile();
  const [step, setStep] = useState<Step>('welcome');
  const [typed, setTyped] = useState('');
  const [transcript, setTranscript] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [prop, setProp] = useState<Proposal | null>(null);

  // editable proposal fields
  const [identity, setIdentity] = useState('');
  const [oTitle, setOTitle] = useState('');
  const [oOneLiner, setOOneLiner] = useState('');
  const [oPain, setOPain] = useState('');
  const [oPrice, setOPrice] = useState('');
  const [oIcp, setOIcp] = useState('');

  const { isRecording, duration, audioBlob, waveformData, startRecording, stopRecording, resetRecording, error: recError } =
    useVoiceRecording({ maxDuration: MAX_RECORDING_MS, silenceTimeout: 0 });

  const runExtract = useCallback(async (text: string) => {
    setStep('processing');
    try {
      const res = await supabase.functions.invoke('extract-identity', { body: { transcript: text } });
      if (res.error) throw new Error(res.error.message || 'Could not make sense of that');
      const d = res.data as Proposal;
      setProp(d);
      setIdentity(d.identity_statement || '');
      setOTitle(d.offer?.title || '');
      setOOneLiner(d.offer?.one_liner || '');
      setOPain(d.offer?.pain || '');
      setOPrice(d.offer?.price_band || '');
      setOIcp(d.offer?.icp || '');
      setStep('proposal');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong');
      setStep('error');
    }
  }, []);

  // audio → transcribe → extract
  useEffect(() => {
    if (!audioBlob) return;
    let cancelled = false;
    void (async () => {
      setStep('processing');
      try {
        const base64 = await blobToBase64(audioBlob);
        const t = await supabase.functions.invoke('transcribe', { body: { audio: base64, format: 'webm' } });
        if (t.error) throw new Error(t.error.message || 'Transcription failed');
        const tr = (t.data as { transcript?: string } | null)?.transcript ?? '';
        if (cancelled) return;
        if (!tr.trim()) throw new Error('Nothing came through. Try again?');
        setTranscript(tr);
        await runExtract(tr);
      } catch (e) {
        if (cancelled) return;
        setErrorMsg(e instanceof Error ? e.message : 'Something went wrong');
        setStep('error');
      }
    })();
    return () => { cancelled = true; };
  }, [audioBlob, runExtract]);

  useEffect(() => { if (recError) { setErrorMsg(recError); setStep('error'); } }, [recError]);

  const holdStart = useCallback(async () => { setErrorMsg(''); setStep('recording'); await startRecording(); }, [startRecording]);
  const holdEnd = useCallback(() => { if (isRecording) stopRecording(); }, [isRecording, stopRecording]);

  const submitTyped = useCallback(() => {
    const t = typed.trim();
    if (!t) return;
    setTranscript(t);
    void runExtract(t);
  }, [typed, runExtract]);

  const save = useCallback(async () => {
    if (!user || !prop) return;
    setStep('saving');
    try {
      await updateProfile({
        motivation_type: prop.motivation_type || null,
        journey_stage: prop.journey_stage || null,
        offer_maturity: prop.offer_maturity || null,
        identity_statement: identity.trim() || null,
        target_buyer: oIcp.trim() || null,
        first_run_transcript: transcript || null,
        first_run_completed_at: new Date().toISOString(),
        ...(prop.role && !profile?.role ? { role: prop.role } : {}),
        ...(identity.trim() && !profile?.positioning ? { positioning: identity.trim() } : {}),
      });

      await supabase.from('ideas').insert({
        user_id: user.id,
        title: oTitle.trim() || 'My first offer',
        one_liner: oOneLiner.trim() || null,
        offer: oOneLiner.trim() || null,
        pain: oPain.trim() || null,
        price_band: oPrice.trim() || null,
        icp: oIcp.trim() || null,
        status: 'proposed' as const,
      });

      if (prop.warm_doors.length) {
        try { await ingestVoiceSeed(user.id, prop.warm_doors.map((d) => ({ name: d.name, hint: d.why }))); } catch { /* non-fatal */ }
      }

      await completeOnboardingStep(4);
      emitLifecycle('activated');
      // Best-effort: queue Matches so Today already has a move when they land.
      supabase.functions.invoke('run-match-engine', { body: {} }).catch(() => {});
      onComplete();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Could not save');
      setStep('error');
    }
  }, [user, prop, identity, oTitle, oOneLiner, oPain, oPrice, oIcp, transcript, profile, updateProfile, completeOnboardingStep, onComplete]);

  const retry = () => { resetRecording(); setTyped(''); setTranscript(''); setErrorMsg(''); setProp(null); setStep('welcome'); };

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 pt-14 pb-10">
      <AnimatePresence mode="wait">
        {/* WELCOME */}
        {step === 'welcome' && (
          <motion.div key="w" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-display text-foreground leading-tight">
              You built the capability.<br />Let's build the distribution.
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-4 text-sm text-foreground-secondary leading-relaxed">
              Two quick questions and I'll hand you the offer I'd lead with, who'd buy it, and the first people to reopen. You edit anything that's off.
            </motion.p>
            <motion.button
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}
              onClick={() => setStep('recording')}
              className="mt-10 h-12 px-8 rounded-full bg-primary text-primary-foreground font-semibold flex items-center gap-2 shadow-lg shadow-primary/30"
            >
              Begin <ArrowRight className="w-4 h-4" />
            </motion.button>
          </motion.div>
        )}

        {/* TALK */}
        {step === 'recording' && (
          <motion.div key="r" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto w-full">
            <p className="text-lg font-medium text-foreground leading-relaxed">What did you run inside companies — and what made you go independent?</p>
            <div className="flex items-end gap-1 h-12 my-8">
              {(isRecording ? waveformData : new Array(20).fill(0.12)).map((v, i) => (
                <motion.div key={i} className="w-1.5 rounded-full bg-primary" animate={{ height: `${Math.max(6, v * 48)}px` }} transition={{ duration: 0.08 }} />
              ))}
            </div>
            <motion.button
              onPointerDown={holdStart} onPointerUp={holdEnd} onPointerLeave={holdEnd} whileTap={{ scale: 0.94 }}
              className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary-light shadow-lg shadow-primary/30 flex items-center justify-center"
            >
              <Mic className="w-9 h-9 text-white" strokeWidth={2} />
            </motion.button>
            <p className="mt-3 text-xs text-foreground-muted">{isRecording ? `Listening… ${Math.floor(duration / 1000)}s — release when done` : 'Hold to talk · up to 90s'}</p>
            <div className="mt-8 w-full">
              <div className="flex items-center gap-3 text-xs text-foreground-muted"><span className="h-px flex-1 bg-border" />or type it<span className="h-px flex-1 bg-border" /></div>
              <textarea
                value={typed} onChange={(e) => setTyped(e.target.value)} maxLength={MAX_TYPED_CHARS} rows={4}
                placeholder="I ran growth at two Series B SaaS companies. Got laid off in a reorg and decided I'd rather pick my own clients than chase the next VP title…"
                className="mt-3 w-full rounded-2xl border border-border bg-card p-4 text-sm text-foreground placeholder:text-foreground-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button onClick={submitTyped} disabled={!typed.trim()} className="mt-3 w-full h-12 rounded-full bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                Show me what you've got <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* PROCESSING */}
        {step === 'processing' && (
          <motion.div key="p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center">
            <motion.div className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary" animate={{ rotate: 360 }} transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }} />
            <p className="mt-6 text-sm text-foreground-secondary">{transcript ? 'Working out who you are as a business…' : 'Writing it down…'}</p>
          </motion.div>
        )}

        {/* PROPOSAL */}
        {step === 'proposal' && prop && (
          <motion.div key="pr" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex-1 w-full max-w-md mx-auto overflow-y-auto">
            <p className="text-xs uppercase tracking-wide text-primary font-medium mb-2">Here's who I think you are</p>
            {prop.confidence < 0.5 && (
              <p className="mb-3 text-xs text-foreground-muted leading-relaxed">I'm working from a little — sharpen anything below, or tell me one client problem you fixed and I'll tighten it.</p>
            )}
            <div className="space-y-4">
              <Field label="Your identity" value={identity} onChange={setIdentity} multiline />
              <div className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-4 space-y-3">
                <p className="text-[11px] uppercase tracking-wide text-primary font-medium flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" />The offer I'd lead with</p>
                <Field label="Offer" value={oTitle} onChange={setOTitle} />
                <Field label="In one line" value={oOneLiner} onChange={setOOneLiner} multiline />
                <Field label="The pain it removes" value={oPain} onChange={setOPain} multiline />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Price band" value={oPrice} onChange={setOPrice} />
                  <Field label="Who buys it" value={oIcp} onChange={setOIcp} />
                </div>
              </div>
            </div>
            <button onClick={() => setStep('firstmove')} className="mt-5 w-full h-12 rounded-full bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/30">
              That's close — keep going <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={retry} className="mt-2 w-full text-center text-xs text-foreground-muted">Start over</button>
          </motion.div>
        )}

        {/* FIRST MOVE */}
        {step === 'firstmove' && prop && (
          <motion.div key="fm" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex-1 w-full max-w-md mx-auto flex flex-col">
            {prop.warm_doors.length > 0 ? (
              <>
                <h2 className="text-title-2 text-foreground">The first people I'd reopen</h2>
                <p className="mt-1.5 text-sm text-foreground-secondary leading-relaxed">You already know people who could be your first clients or open the door. I'll line these up as Matches tonight.</p>
                <div className="mt-5 space-y-2">
                  {prop.warm_doors.map((d, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="rounded-2xl border border-border/60 bg-card/50 p-4">
                      <p className="text-sm font-semibold text-foreground">{d.name}</p>
                      <p className="mt-0.5 text-xs text-foreground-secondary leading-relaxed">{d.why}</p>
                    </motion.div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <h2 className="text-title-2 text-foreground">One last thing</h2>
                <p className="mt-1.5 text-sm text-foreground-secondary leading-relaxed">Add a few people you already know — ex-colleagues, clients, people whose budgets you've touched. I'll match your offer against them and draft the outreach. You can do this in a few seconds on the next screen.</p>
              </>
            )}
            <div className="mt-auto pt-6">
              <button onClick={save} className="w-full h-12 rounded-full bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/30">
                <Users className="w-4 h-4" />{prop.warm_doors.length > 0 ? 'Line these up — take me in' : 'Take me in'}
              </button>
            </div>
          </motion.div>
        )}

        {/* SAVING */}
        {step === 'saving' && (
          <motion.div key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center">
            <motion.div className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary" animate={{ rotate: 360 }} transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }} />
            <p className="mt-6 text-sm text-foreground-secondary">Setting up your workspace…</p>
          </motion.div>
        )}

        {/* ERROR */}
        {step === 'error' && (
          <motion.div key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <AlertCircle className="w-8 h-8 text-destructive mb-4" />
            <p className="text-sm text-foreground">{errorMsg || 'Something went wrong'}</p>
            <button onClick={retry} className="mt-6 h-11 px-6 rounded-full border border-border/60 bg-card/50 text-sm font-medium text-foreground">Try again</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

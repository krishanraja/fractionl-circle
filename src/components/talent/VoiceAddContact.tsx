import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Check, Loader2, Edit3 } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { useContactIntake } from '@/hooks/useContactIntake';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { haptics } from '@/utils/haptics';
import { normalizePhoneToE164 } from '@/utils/contactActions';
import { fadeInUp } from '@/constants/animation';

interface ParsedContact {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  city?: string;
  specialty_summary?: string;
  linkedin_url?: string;
  instagram_handle?: string;
}

type VoiceAddState = 'idle' | 'recording' | 'processing' | 'confirming' | 'success';

interface VoiceAddContactProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const VoiceAddContact = ({ open, onOpenChange }: VoiceAddContactProps) => {
  const { intake } = useContactIntake();
  const [state, setState] = useState<VoiceAddState>('idle');
  const [transcript, setTranscript] = useState('');
  const [parsed, setParsed] = useState<ParsedContact>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const processingBlobRef = useRef<Blob | null>(null);

  const {
    isRecording,
    duration,
    audioBlob,
    waveformData,
    error,
    startRecording,
    stopRecording,
    resetRecording,
  } = useVoiceRecording({ maxDuration: 30000 });

  // Process audio when blob becomes available
  useEffect(() => {
    if (audioBlob && state === 'processing' && processingBlobRef.current !== audioBlob) {
      processingBlobRef.current = audioBlob;
      processAudio(audioBlob);
    }
  }, [audioBlob, state]);

  const handleStartRecording = async () => {
    haptics.medium();
    setState('recording');
    await startRecording();
  };

  const handleStopRecording = () => {
    haptics.light();
    stopRecording();
    setState('processing');
  };

  const processAudio = async (blob: Blob) => {
    try {
      // Transcribe
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const { data: transcribeData, error: transcribeError } = await supabase.functions.invoke('transcribe', {
        body: { audio: base64, format: 'webm' },
      });
      if (transcribeError) throw transcribeError;

      const transcriptText = transcribeData.transcript;
      if (!transcriptText?.trim()) {
        toast.error("Couldn't hear anything. Try again?");
        handleReset();
        return;
      }
      setTranscript(transcriptText);

      // Parse into contact fields
      const { data: parseData, error: parseError } = await supabase.functions.invoke('parse-voice-contact', {
        body: { transcript: transcriptText },
      });
      if (parseError) throw parseError;

      const parsedContact: ParsedContact = parseData.parsed || {};
      setParsed(parsedContact);
      setState('confirming');
      haptics.success();
    } catch (err) {
      console.error('Voice add error:', err);
      toast.error('Failed to process. Try again?');
      handleReset();
    }
  };

  const updateField = (field: keyof ParsedContact, value: string) => {
    setParsed(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!parsed.name?.trim()) {
      toast.error('Name is required');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await intake(
        {
          name: parsed.name.trim(),
          email: parsed.email?.trim() || null,
          phone: parsed.phone?.trim() ? (normalizePhoneToE164(parsed.phone.trim()) || parsed.phone.trim()) : null,
          company: parsed.company?.trim() || null,
          specialty_summary: parsed.specialty_summary?.trim() || [parsed.title, parsed.company].filter(Boolean).join(' at ') || null,
          linkedin_url: parsed.linkedin_url?.trim() || null,
          city: parsed.city?.trim() || null,
          source: 'voice' as any,
        },
        { onDuplicate: 'auto_merge' }
      );

      setState('success');
      haptics.success();
      if (result.status === 'merged') {
        toast.success(`Merged into ${result.contact.name}`);
      } else if (result.status === 'duplicates') {
        toast(`${parsed.name} saved. Possible duplicate: ${result.matches[0].contact.name}`);
      } else {
        toast.success(`${parsed.name} added to your Black Book`);
      }
      setTimeout(() => {
        handleReset();
        onOpenChange(false);
      }, 800);
    } catch {
      // Error toast handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setState('idle');
    setTranscript('');
    setParsed({});
    processingBlobRef.current = null;
    resetRecording();
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) handleReset();
    onOpenChange(isOpen);
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="bg-background border-border max-h-[90dvh]">
        <div className="overflow-y-auto pb-safe-bottom">
          <AnimatePresence mode="wait">
            {/* Idle */}
            {state === 'idle' && (
              <motion.div
                key="idle"
                {...fadeInUp}
                className="flex flex-col items-center gap-6 text-center px-6 py-8"
              >
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-foreground">Voice Add</h2>
                  <p className="text-sm text-foreground-secondary max-w-[280px]">
                    Say their name, what they do, and how to reach them
                  </p>
                </div>

                <motion.button
                  onClick={handleStartRecording}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "w-28 h-28 rounded-full",
                    "bg-primary flex items-center justify-center",
                    "shadow-lg shadow-primary/30"
                  )}
                >
                  <Mic className="w-10 h-10 text-primary-foreground" />
                </motion.button>

                <div className="bg-secondary/50 rounded-xl px-4 py-3 max-w-[300px]">
                  <p className="text-xs text-foreground-secondary italic">
                    "Sarah Chen, product designer at Nike, sarah@nike.com, based in Portland"
                  </p>
                </div>

                {error && <p className="text-destructive text-caption">{error}</p>}
              </motion.div>
            )}

            {/* Recording */}
            {state === 'recording' && (
              <motion.div
                key="recording"
                {...fadeInUp}
                className="flex flex-col items-center gap-6 text-center px-6 py-8"
              >
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold text-foreground">Listening...</h2>
                  <p className="text-lg text-primary font-mono">{formatDuration(duration)}</p>
                </div>

                <div className="flex items-end justify-center gap-1 h-16">
                  {waveformData.map((value, index) => (
                    <motion.div
                      key={index}
                      className="w-1.5 rounded-full bg-primary"
                      animate={{ height: `${Math.max(value * 100, 12)}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  ))}
                </div>

                <motion.button
                  onClick={handleStopRecording}
                  whileTap={{ scale: 0.95 }}
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-20 h-20 rounded-full bg-destructive flex items-center justify-center shadow-lg shadow-destructive/30"
                >
                  <Square className="w-7 h-7 text-white" fill="white" />
                </motion.button>

                <p className="text-caption text-foreground-secondary">Tap to stop</p>
              </motion.div>
            )}

            {/* Processing */}
            {state === 'processing' && (
              <motion.div
                key="processing"
                {...fadeInUp}
                className="flex flex-col items-center gap-5 text-center px-6 py-12"
              >
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold text-foreground">Understanding...</h2>
                  <p className="text-sm text-foreground-secondary">Extracting contact details</p>
                </div>
                {transcript && (
                  <p className="text-xs text-foreground-secondary italic max-w-xs">
                    "{transcript}"
                  </p>
                )}
              </motion.div>
            )}

            {/* Confirming */}
            {state === 'confirming' && (
              <motion.div
                key="confirming"
                {...fadeInUp}
                className="px-4 py-4"
              >
                <DrawerHeader className="pb-2 pt-0">
                  <DrawerTitle className="text-lg flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-primary" />
                    Confirm Details
                  </DrawerTitle>
                </DrawerHeader>

                <div className="space-y-3 px-2">
                  <FieldInput label="Name" value={parsed.name || ''} onChange={v => updateField('name', v)} autoFocus />
                  <FieldInput label="Title / Role" value={parsed.title || ''} onChange={v => updateField('title', v)} />
                  <FieldInput label="Company" value={parsed.company || ''} onChange={v => updateField('company', v)} />
                  <FieldInput label="Email" value={parsed.email || ''} onChange={v => updateField('email', v)} type="email" />
                  <FieldInput label="Phone" value={parsed.phone || ''} onChange={v => updateField('phone', v)} type="tel" />
                  <FieldInput label="City" value={parsed.city || ''} onChange={v => updateField('city', v)} />
                  <FieldInput label="What they do" value={parsed.specialty_summary || ''} onChange={v => updateField('specialty_summary', v)} />
                </div>

                <div className="flex gap-3 mt-5 px-2 pb-4">
                  <Button variant="outline" onClick={handleReset} className="flex-1" disabled={isSubmitting}>
                    Try Again
                  </Button>
                  <Button onClick={handleSave} className="flex-1" disabled={isSubmitting || !parsed.name?.trim()}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>
                      <Check className="w-4 h-4 mr-1" /> Save
                    </>}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Success */}
            {state === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-12 px-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-4"
                >
                  <Check className="w-8 h-8 text-success" />
                </motion.div>
                <p className="text-lg font-semibold text-foreground">Added to your circle</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

function FieldInput({ label, value, onChange, type = 'text', autoFocus }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="text-[11px] font-medium text-foreground-secondary uppercase tracking-wider mb-1 block">
        {label}
      </label>
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        type={type}
        autoFocus={autoFocus}
        className="bg-input border-border text-foreground text-sm h-10"
      />
    </div>
  );
}

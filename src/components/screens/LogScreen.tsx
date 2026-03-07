import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Send, Keyboard, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { fadeInUp } from '@/constants/animation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

type LogState = 'idle' | 'recording' | 'processing' | 'confirming' | 'success';

interface ParsedLog {
  client?: string;
  client_id?: string | null;
  activity_type?: string;
  duration_minutes?: number;
  notes?: string;
  revenue?: number;
  summary?: string;
  confidence?: number;
}

export const LogScreen = () => {
  const { user } = useAuth();
  const [state, setState] = useState<LogState>('idle');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [transcript, setTranscript] = useState('');
  const [parsedLog, setParsedLog] = useState<ParsedLog | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
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
  } = useVoiceRecording({
    maxDuration: 180000,
    onSilenceDetected: () => {
      if (isRecording) handleStopRecording();
    },
  });

  // FIX BUG-12: Use useEffect to watch audioBlob instead of setTimeout
  useEffect(() => {
    if (audioBlob && state === 'processing' && processingBlobRef.current !== audioBlob) {
      processingBlobRef.current = audioBlob;
      processAudio(audioBlob);
    }
  }, [audioBlob, state]);

  // Load user's clients for matching
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('clients')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .then(({ data }) => setClients(data || []));
  }, [user?.id]);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    setState('recording');
    await startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
    setState('processing');
    // audioBlob will be set async by useVoiceRecording's onstop handler
    // useEffect above will catch it when it updates
  };

  const processAudio = async (blob: Blob) => {
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);
      const audioBase64 = await base64Promise;

      const { data: transcribeData, error: transcribeError } = await supabase.functions.invoke('transcribe', {
        body: { audio: audioBase64, format: 'webm' },
      });

      if (transcribeError) throw transcribeError;

      const transcriptText = transcribeData.transcript;
      setTranscript(transcriptText);

      await parseTranscript(transcriptText);
    } catch (err) {
      console.error('Error processing audio:', err);
      toast.error('Failed to process recording. Please try again.');
      setState('idle');
      resetRecording();
    }
  };

  const parseTranscript = async (transcriptText: string) => {
    try {
      // FIX BUG-03: pass client names for context so AI can match
      const clientNames = clients.map(c => c.name);

      const { data: parseData, error: parseError } = await supabase.functions.invoke('parse-voice-log', {
        body: { transcript: transcriptText, available_clients: clientNames },
      });

      if (parseError) throw parseError;

      // FIX BUG-03: edge fn returns { parsed: {...}, raw_transcript: "..." }
      const parsed: ParsedLog = parseData.parsed || parseData;

      // FIX BUG-13: resolve client name to client_id
      if (parsed.client && clients.length > 0) {
        const match = clients.find(
          c => c.name.toLowerCase().includes(parsed.client!.toLowerCase()) ||
               parsed.client!.toLowerCase().includes(c.name.toLowerCase())
        );
        parsed.client_id = match?.id || null;
        if (match) setSelectedClientId(match.id);
      }

      setParsedLog(parsed);
      setState('confirming');
    } catch (err) {
      console.error('Error parsing transcript:', err);
      toast.error('Failed to understand the log. Please try again.');
      setState('idle');
      resetRecording();
    }
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    setState('processing');
    setTranscript(textInput);
    await parseTranscript(textInput);
  };

  // FIX BUG-01: handleConfirm actually saves to database
  const handleConfirm = async () => {
    if (!user?.id || !parsedLog) return;
    setIsSubmitting(true);
    try {
      const clientId = selectedClientId || parsedLog.client_id || null;

      const { error: insertError } = await supabase
        .from('activity_logs')
        .insert({
          user_id: user.id,
          client_id: clientId,
          activity_type: parsedLog.activity_type || 'work',
          summary: parsedLog.summary || transcript,
          notes: parsedLog.notes || null,
          duration_minutes: parsedLog.duration_minutes || null,
          revenue: parsedLog.revenue || null,
          transcript_raw: transcript,
          created_via_voice: !showTextInput,
          logged_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      // Update client's last_activity_date
      if (clientId) {
        await supabase
          .from('clients')
          .update({ last_activity_date: new Date().toISOString() })
          .eq('id', clientId)
          .eq('user_id', user.id);
      }

      setState('success');
      toast.success('Activity logged!');

      setTimeout(() => {
        setState('idle');
        setTranscript('');
        setParsedLog(null);
        setTextInput('');
        setShowTextInput(false);
        setSelectedClientId(null);
        processingBlobRef.current = null;
        resetRecording();
      }, 2000);

    } catch (err) {
      console.error('Error saving log:', err);
      toast.error('Failed to save. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setState('idle');
    setTranscript('');
    setParsedLog(null);
    setTextInput('');
    setSelectedClientId(null);
    processingBlobRef.current = null;
    resetRecording();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4">
      <AnimatePresence mode="wait">
        {/* Idle State */}
        {state === 'idle' && !showTextInput && (
          <motion.div
            key="idle"
            {...fadeInUp}
            className="flex flex-col items-center gap-8 text-center"
          >
            <div className="space-y-2">
              <h1 className="text-title-1 text-foreground">Log Activity</h1>
              <p className="text-body text-foreground-secondary max-w-xs">
                Tap the mic to record what you've been working on
              </p>
            </div>

            <motion.button
              onClick={handleStartRecording}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "w-32 h-32 rounded-full",
                "bg-primary flex items-center justify-center",
                "shadow-lg shadow-primary/30",
                "transition-all duration-200",
                "hover:shadow-xl hover:shadow-primary/40"
              )}
            >
              <Mic className="w-12 h-12 text-primary-foreground" />
            </motion.button>

            <button
              onClick={() => setShowTextInput(true)}
              className="flex items-center gap-2 text-foreground-secondary text-caption hover:text-foreground transition-colors"
            >
              <Keyboard className="w-4 h-4" />
              <span>Or type instead</span>
            </button>

            {error && (
              <p className="text-destructive text-caption">{error}</p>
            )}
          </motion.div>
        )}

        {/* Text Input State */}
        {state === 'idle' && showTextInput && (
          <motion.div
            key="text-input"
            {...fadeInUp}
            className="w-full max-w-md space-y-4"
          >
            <div className="space-y-2 text-center">
              <h1 className="text-title-1 text-foreground">Log Activity</h1>
              <p className="text-body text-foreground-secondary">
                Describe what you've been working on
              </p>
            </div>

            <Textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="e.g., 2-hour strategy call with TechCorp on Q1 roadmap, billed $400..."
              className="min-h-32 bg-input border-border text-foreground"
              autoFocus
            />

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowTextInput(false)}
                className="flex-1"
              >
                Use Voice
              </Button>
              <Button
                onClick={handleTextSubmit}
                disabled={!textInput.trim()}
                className="flex-1"
              >
                <Send className="w-4 h-4 mr-2" />
                Submit
              </Button>
            </div>
          </motion.div>
        )}

        {/* Recording State */}
        {state === 'recording' && (
          <motion.div
            key="recording"
            {...fadeInUp}
            className="flex flex-col items-center gap-8 text-center"
          >
            <div className="space-y-2">
              <h1 className="text-title-1 text-foreground">Recording...</h1>
              <p className="text-title-2 text-primary font-mono">
                {formatDuration(duration)}
              </p>
            </div>

            <div className="flex items-end justify-center gap-1 h-20">
              {waveformData.map((value, index) => (
                <motion.div
                  key={index}
                  className="waveform-bar"
                  style={{ height: `${value * 100}%` }}
                  animate={{ scaleY: [0.3, 1, 0.3] }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    ease: 'easeInOut' as const,
                    delay: index * 0.1,
                  }}
                />
              ))}
            </div>

            <motion.button
              onClick={handleStopRecording}
              whileTap={{ scale: 0.95 }}
              animate={{ scale: [1, 1.1, 1], opacity: [1, 0.8, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' as const }}
              className={cn(
                "w-24 h-24 rounded-full",
                "bg-destructive flex items-center justify-center",
                "shadow-lg shadow-destructive/30"
              )}
            >
              <Square className="w-8 h-8 text-white" fill="white" />
            </motion.button>

            <p className="text-caption text-foreground-secondary">
              Tap to stop recording
            </p>
          </motion.div>
        )}

        {/* Processing State */}
        {state === 'processing' && (
          <motion.div
            key="processing"
            {...fadeInUp}
            className="flex flex-col items-center gap-6 text-center"
          >
            <Loader2 className="w-16 h-16 text-primary animate-spin" />
            <div className="space-y-2">
              <h1 className="text-title-1 text-foreground">Understanding...</h1>
              <p className="text-body text-foreground-secondary">
                Processing your activity log
              </p>
            </div>
            {transcript && (
              <Card className="max-w-md bg-background-elevated border-border">
                <CardContent className="p-4">
                  <p className="text-caption text-foreground-secondary italic">
                    "{transcript}"
                  </p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* Confirmation State */}
        {state === 'confirming' && parsedLog && (
          <motion.div
            key="confirming"
            {...fadeInUp}
            className="w-full max-w-md space-y-6"
          >
            <div className="text-center space-y-2">
              <h1 className="text-title-1 text-foreground">Confirm Activity</h1>
              <p className="text-body text-foreground-secondary">
                Does this look right?
              </p>
            </div>

            <Card className="bg-background-elevated border-border">
              <CardContent className="p-4 space-y-4">
                {/* Client — with dropdown override if no match */}
                <div className="flex justify-between items-center">
                  <span className="text-foreground-secondary">Client</span>
                  {clients.length > 0 ? (
                    <Select
                      value={selectedClientId || 'none'}
                      onValueChange={(v) => setSelectedClientId(v === 'none' ? null : v)}
                    >
                      <SelectTrigger className="w-40 h-8 text-sm">
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No client</SelectItem>
                        {clients.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-foreground font-medium">{parsedLog.client || '—'}</span>
                  )}
                </div>

                {parsedLog.activity_type && (
                  <div className="flex justify-between">
                    <span className="text-foreground-secondary">Activity</span>
                    <span className="text-foreground font-medium capitalize">{parsedLog.activity_type}</span>
                  </div>
                )}
                {parsedLog.duration_minutes && (
                  <div className="flex justify-between">
                    <span className="text-foreground-secondary">Duration</span>
                    <span className="text-foreground font-medium">{parsedLog.duration_minutes} min</span>
                  </div>
                )}
                {parsedLog.revenue && (
                  <div className="flex justify-between">
                    <span className="text-foreground-secondary">Revenue</span>
                    <span className="text-foreground font-medium text-green-400">${parsedLog.revenue.toLocaleString()}</span>
                  </div>
                )}
                {parsedLog.notes && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-foreground-secondary text-caption">Notes</span>
                    <p className="text-foreground mt-1 text-sm">{parsedLog.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex-1"
                disabled={isSubmitting}
              >
                Try Again
              </Button>
              <Button
                onClick={handleConfirm}
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Confirm
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Success State */}
        {state === 'success' && (
          <motion.div
            key="success"
            {...fadeInUp}
            className="flex flex-col items-center gap-6 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="w-24 h-24 rounded-full bg-success flex items-center justify-center"
            >
              <Check className="w-12 h-12 text-white" />
            </motion.div>
            <h1 className="text-title-1 text-foreground">Activity Logged!</h1>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

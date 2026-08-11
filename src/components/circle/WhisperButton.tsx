import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Square } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { cn } from '@/lib/utils';

interface WhisperButtonProps {
  onTranscript: (transcript: string) => void;
  onError?: (message: string) => void;
  onStatus?: (message: string) => void;
  disabled?: boolean;
  className?: string;
  idleLabel?: string;
  showText?: boolean;
}

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(new Error('Could not read audio'));
    reader.readAsDataURL(blob);
  });

export function WhisperButton({
  onTranscript,
  onError,
  onStatus,
  disabled = false,
  className,
  idleLabel = 'Talk',
  showText = true,
}: WhisperButtonProps) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  const onStatusRef = useRef(onStatus);
  const {
    isRecording,
    audioBlob,
    startRecording,
    stopRecording,
    resetRecording,
    error: recordingError,
  } = useVoiceRecording({ maxDuration: 60_000 });

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
    onStatusRef.current = onStatus;
  }, [onError, onStatus, onTranscript]);

  useEffect(() => {
    if (!recordingError) return;
    onErrorRef.current?.('I could not use the microphone. Type instead.');
    onStatusRef.current?.('Microphone is off.');
  }, [recordingError]);

  useEffect(() => {
    if (!audioBlob) return;
    let cancelled = false;

    void (async () => {
      setIsTranscribing(true);
      onStatusRef.current?.('Turning your voice into text.');
      try {
        const audio = await blobToBase64(audioBlob);
        const mimeType = audioBlob.type.toLowerCase();
        const format = mimeType.includes('mp4')
          ? 'mp4'
          : mimeType.includes('mpeg')
            ? 'mp3'
            : mimeType.includes('wav')
              ? 'wav'
              : mimeType.includes('ogg')
                ? 'ogg'
                : 'webm';
        const { data, error } = await supabase.functions.invoke('transcribe', {
          body: { audio, format },
        });
        if (error) throw error;
        const transcript = (data as { transcript?: string } | null)?.transcript?.trim() ?? '';
        if (!transcript) throw new Error('No words heard');
        if (!cancelled) {
          onTranscriptRef.current(transcript);
          onStatusRef.current?.('Voice added.');
        }
      } catch {
        if (!cancelled) {
          onErrorRef.current?.('I could not hear that clearly. Try again or type it.');
          onStatusRef.current?.('Voice was not added.');
        }
      } finally {
        if (!cancelled) {
          setIsTranscribing(false);
          resetRecording();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [audioBlob, resetRecording]);

  const toggle = useCallback(() => {
    if (disabled || isTranscribing || isStarting) return;
    if (isRecording) {
      stopRecording();
      return;
    }
    onErrorRef.current?.('');
    onStatusRef.current?.('Opening the microphone.');
    setIsStarting(true);
    void startRecording().finally(() => setIsStarting(false));
  }, [disabled, isRecording, isStarting, isTranscribing, startRecording, stopRecording]);

  const label = isTranscribing ? 'Adding...' : isStarting ? 'Opening...' : isRecording ? 'Stop' : idleLabel;

  return (
    <button
      type="button"
      className={cn('circle-whisper-button', className)}
      onClick={toggle}
      disabled={disabled || isTranscribing || isStarting}
      aria-label={label}
      aria-pressed={isRecording}
      data-recording={isRecording}
    >
      {isTranscribing ? (
        <Loader2 className="circle-whisper-spin" aria-hidden="true" />
      ) : isRecording ? (
        <Square aria-hidden="true" />
      ) : (
        <Mic aria-hidden="true" />
      )}
      {showText && <span>{label}</span>}
    </button>
  );
}

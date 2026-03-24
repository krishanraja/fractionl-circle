import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { haptics } from '@/utils/haptics';

type CommandState = 'idle' | 'listening' | 'processing' | 'responding';

interface CommandResult {
  intent: string;
  action: string;
  response: string;
  navigate_to: string | null;
  data?: Record<string, unknown>;
}

export function useVoiceCommands(onNavigate?: (tab: string) => void) {
  const [state, setState] = useState<CommandState>('idle');
  const [result, setResult] = useState<CommandResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    isRecording,
    audioBlob,
    waveformData,
    startRecording,
    stopRecording,
    resetRecording,
  } = useVoiceRecording({ maxDuration: 15000 });

  const startListening = useCallback(async () => {
    haptics.medium();
    setState('listening');
    setResult(null);
    setError(null);
    await startRecording();
  }, [startRecording]);

  const stopListening = useCallback(async () => {
    haptics.light();
    stopRecording();
    setState('processing');

    // Wait for audioBlob to be available
    await new Promise(resolve => setTimeout(resolve, 300));
  }, [stopRecording]);

  const processCommand = useCallback(async (blob: Blob) => {
    try {
      // 1. Transcribe
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

      const command = transcribeData.transcript;
      if (!command?.trim()) {
        setState('idle');
        return;
      }

      // 2. Process command
      const { data: commandData, error: commandError } = await supabase.functions.invoke('voice-command', {
        body: { command },
      });
      if (commandError) throw commandError;

      const cmdResult = commandData as CommandResult;
      setResult(cmdResult);
      setState('responding');
      haptics.success();

      // Auto-navigate if needed
      if (cmdResult.navigate_to) {
        setTimeout(() => {
          onNavigate?.(cmdResult.navigate_to!);
        }, 1500);
      }

      // Auto-dismiss after showing response
      setTimeout(() => {
        setState('idle');
        setResult(null);
        resetRecording();
      }, 4000);

    } catch (err) {
      console.error('Voice command error:', err);
      setError('Could not process command');
      haptics.error();
      setState('idle');
      resetRecording();
    }
  }, [onNavigate, resetRecording]);

  const dismiss = useCallback(() => {
    setState('idle');
    setResult(null);
    setError(null);
    resetRecording();
  }, [resetRecording]);

  return {
    state,
    result,
    error,
    waveformData,
    isRecording,
    audioBlob,
    startListening,
    stopListening,
    processCommand,
    dismiss,
  };
}

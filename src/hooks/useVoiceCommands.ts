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

interface VoiceCommandCallbacks {
  onNavigate?: (tab: string) => void;
  onOpenLog?: () => void;
  onOpenRevenue?: (prefill?: { amount?: string; client_id?: string }) => void;
  onOpenAddContact?: (prefill?: { name?: string }) => void;
  onSetReminder?: (prefill?: { title?: string; clientId?: string }) => void;
}

export function useVoiceCommands(callbacks: VoiceCommandCallbacks = {}) {
  const { onNavigate, onOpenLog, onOpenRevenue, onOpenAddContact, onSetReminder } = callbacks;
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

  const executeAction = useCallback((cmdResult: CommandResult) => {
    const { action, navigate_to, data } = cmdResult;

    // Execute structured actions
    switch (action) {
      case 'log_activity':
        onOpenLog?.();
        return;
      case 'show_revenue':
      case 'add_revenue': {
        const amount = data?.amount as string | undefined;
        const clientId = data?.client_id as string | undefined;
        onOpenRevenue?.({ amount, client_id: clientId });
        return;
      }
      case 'add_contact': {
        const name = data?.name as string | undefined;
        onOpenAddContact?.({ name });
        return;
      }
      case 'show_pipeline':
        onNavigate?.('customers');
        setTimeout(() => {
          document.getElementById('pipeline-card')?.scrollIntoView({ behavior: 'smooth' });
        }, 500);
        return;
      case 'set_reminder': {
        const reminderTitle = data?.title as string | undefined;
        const reminderClient = data?.client_name as string | undefined;
        onSetReminder?.({ title: reminderTitle, clientId: reminderClient });
        return;
      }
      case 'show_clients':
        onNavigate?.('customers');
        setTimeout(() => {
          document.getElementById('portfolio-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 500);
        return;
      case 'navigate_tab':
        if (navigate_to) onNavigate?.(navigate_to);
        return;
      default:
        // Fallback: navigate if specified
        if (navigate_to) {
          setTimeout(() => onNavigate?.(navigate_to), 1500);
        }
    }
  }, [onNavigate, onOpenLog, onOpenRevenue, onOpenAddContact, onSetReminder]);

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

      // Execute the action
      executeAction(cmdResult);

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
  }, [executeAction, resetRecording]);

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

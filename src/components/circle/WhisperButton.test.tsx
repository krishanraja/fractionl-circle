import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WhisperButton } from './WhisperButton';

const mocks = vi.hoisted(() => ({
  state: { audioBlob: null as Blob | null },
  invoke: vi.fn(),
  startRecording: vi.fn(),
  stopRecording: vi.fn(),
  resetRecording: vi.fn(),
}));

vi.mock('@/hooks/useVoiceRecording', () => ({
  useVoiceRecording: () => ({
    isRecording: false,
    audioBlob: mocks.state.audioBlob,
    startRecording: mocks.startRecording,
    stopRecording: mocks.stopRecording,
    resetRecording: mocks.resetRecording,
    error: null,
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: mocks.invoke } },
}));

describe('WhisperButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state.audioBlob = null;
    mocks.invoke.mockResolvedValue({ data: { transcript: 'Maya Chen from the summit' }, error: null });
    mocks.startRecording.mockResolvedValue(undefined);
  });

  it('starts recording from a clear, full-size control', () => {
    render(<WhisperButton onTranscript={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Talk' }));

    expect(mocks.startRecording).toHaveBeenCalledTimes(1);
  });

  it('turns recorded audio into text with the existing transcribe function', async () => {
    mocks.state.audioBlob = new Blob(['audio'], { type: 'audio/webm' });
    const onTranscript = vi.fn();

    render(<WhisperButton onTranscript={onTranscript} />);

    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith(
      'transcribe',
      expect.objectContaining({ body: expect.objectContaining({ format: 'webm' }) }),
    ));
    await waitFor(() => expect(onTranscript).toHaveBeenCalledWith('Maya Chen from the summit'));
    expect(mocks.resetRecording).toHaveBeenCalled();
  });
});

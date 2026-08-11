import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HingeCircle from './HingeCircle';

const mocks = vi.hoisted(() => {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockReturnValue(query);

  return {
    query,
    invoke: vi.fn(),
    ingestQuickAdd: vi.fn(),
    addPersonTags: vi.fn(),
    runBoxQuery: vi.fn(),
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    resetRecording: vi.fn(),
  };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'krish@example.com', user_metadata: {} } }),
}));

vi.mock('@/hooks/useVoiceRecording', () => ({
  useVoiceRecording: () => ({
    isRecording: false,
    audioBlob: null,
    startRecording: mocks.startRecording,
    stopRecording: mocks.stopRecording,
    resetRecording: mocks.resetRecording,
    error: null,
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => mocks.query),
    functions: { invoke: mocks.invoke },
  },
}));

vi.mock('@/lib/circleIngest', async () => {
  const actual = await vi.importActual<typeof import('@/lib/circleIngest')>('@/lib/circleIngest');
  return {
    ...actual,
    ingestQuickAdd: mocks.ingestQuickAdd,
    addPersonTags: mocks.addPersonTags,
  };
});

vi.mock('@/lib/theRead', () => ({ runBoxQuery: mocks.runBoxQuery }));
vi.mock('@/utils/haptics', () => ({
  haptics: { tap: vi.fn(), medium: vi.fn(), success: vi.fn(), error: vi.fn() },
}));
vi.mock('@/components/profile/ProfileSettingsSheet', () => ({ ProfileSettingsSheet: () => null }));
vi.mock('@/components/circle/ContactButton', () => ({
  ContactButton: ({ person }: { person: { display_name: string } }) => <button>Use {person.display_name}</button>,
}));

describe('HingeCircle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    mocks.query.select.mockReturnValue(mocks.query);
    mocks.query.eq.mockReturnValue(mocks.query);
    mocks.query.order.mockReturnValue(mocks.query);
    mocks.query.limit.mockReturnValue(mocks.query);
    mocks.query.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.invoke.mockResolvedValue({ data: { parsed: { name: 'Maya Chen' } }, error: null });
    mocks.ingestQuickAdd.mockResolvedValue({ circlePersonId: 'person-1', sourceId: 'source-1', result: {} });
    mocks.addPersonTags.mockResolvedValue(['met:SaaS Summit']);
    mocks.runBoxQuery.mockResolvedValue({
      intent: 'find_people',
      found: [{
        id: 'person-2',
        name: 'Jamie Rivera',
        title: 'Growth lead',
        company: 'Northstar',
        why: 'Jamie has run pricing tests for a subscription product.',
        degree: 'first',
        matched_on: 'pricing tests',
        confidence: 0.91,
        evidence: [],
      }],
    });
  });

  it('keeps a raw clue and adds optional meeting context', async () => {
    render(<HingeCircle />);

    fireEvent.change(screen.getByLabelText('Your clue'), {
      target: { value: 'Maya Chen, met at SaaS Summit' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Keep clue' }));

    expect(await screen.findByRole('heading', { name: 'Maya is safe.' })).toBeInTheDocument();
    expect(screen.getByLabelText('Where did you meet?')).toHaveValue('SaaS Summit');
    fireEvent.click(screen.getByRole('button', { name: 'Add this' }));

    await waitFor(() => expect(mocks.addPersonTags).toHaveBeenCalledWith('person-1', ['met:SaaS Summit']));
    expect(await screen.findByRole('heading', { name: 'Nothing needs you.' })).toBeInTheDocument();
  });

  it('carries a front-door clue into the app and clears it only after saving', async () => {
    window.sessionStorage.setItem('circle.pendingClue', 'Maya Chen from HealthTech North');
    render(<HingeCircle />);

    expect(screen.getByLabelText('Your clue')).toHaveValue('Maya Chen from HealthTech North');
    fireEvent.click(screen.getByRole('button', { name: 'Keep clue' }));

    expect(await screen.findByRole('heading', { name: 'Maya is safe.' })).toBeInTheDocument();
    expect(window.sessionStorage.getItem('circle.pendingClue')).toBeNull();
  });

  it('corrects the intent and surfaces one grounded person', async () => {
    render(<HingeCircle />);

    fireEvent.click(screen.getByRole('button', { name: 'Find someone instead' }));
    fireEvent.change(screen.getByLabelText('What do you need?'), {
      target: { value: 'Who could help test my pricing idea?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Find' }));

    expect(await screen.findByRole('heading', { name: 'Jamie Rivera' })).toBeInTheDocument();
    expect(screen.getByText('Jamie has run pricing tests for a subscription product.')).toBeInTheDocument();
    expect(screen.getByText('Matched on pricing tests')).toBeInTheDocument();
  });

  it('keeps an empty ask in place with clear recovery text', () => {
    render(<HingeCircle />);

    fireEvent.click(screen.getByRole('button', { name: 'Find someone instead' }));
    fireEvent.click(screen.getByRole('button', { name: 'Find' }));

    const askState = document.querySelector('.hinge-ask');
    expect(askState).not.toBeNull();
    expect(within(askState as HTMLElement).getByText('Say who you need or what you are testing.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Add a little more first.');
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CircleWorkspace from './CircleWorkspace';

const mocks = vi.hoisted(() => ({
  addOpen: vi.fn(),
  sourceOpen: vi.fn(),
  settingsOpen: vi.fn(),
  getRecentRuns: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'krish@example.com', user_metadata: { full_name: 'Krish Raja' } } }),
}));

vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    profile: { full_name: 'Krish Raja', email: 'krish@example.com', positioning: 'I help teams turn hard ideas into simple products.' },
    preferences: { goal_reminders: true },
    loading: false,
  }),
}));

vi.mock('@/integrations/supabase/client', () => {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockResolvedValue({ count: 3 });
  return { supabase: { from: vi.fn(() => query) } };
});

vi.mock('./thesisData', () => ({
  getGoingQuietCount: vi.fn().mockResolvedValue(1),
  getUnrunAnswerCount: vi.fn().mockResolvedValue(1),
  getRecentRuns: mocks.getRecentRuns,
}));

vi.mock('./WorkingOnInput', () => ({ default: () => <div>Ask your network</div> }));
vi.mock('@/components/circle/CirclePeopleList', () => ({ CirclePeopleList: () => <div>People list</div> }));
vi.mock('@/components/circle/AddToCircleSheet', () => ({
  AddToCircleSheet: ({ open }: { open: boolean }) => { mocks.addOpen(open); return open ? <div>Add person sheet</div> : null; },
}));
vi.mock('@/components/circle/AddSourceSheet', () => ({
  AddSourceSheet: ({ open }: { open: boolean }) => { mocks.sourceOpen(open); return open ? <div>Import contacts sheet</div> : null; },
}));
vi.mock('@/components/profile/ProfileSettingsSheet', () => ({
  ProfileSettingsSheet: ({ open }: { open: boolean }) => { mocks.settingsOpen(open); return open ? <div>Profile settings sheet</div> : null; },
}));
vi.mock('./WarmReachDrawer', () => ({ default: () => null }));
vi.mock('./ThesisApp', () => ({
  default: ({ startFresh, initialRunId }: { startFresh?: boolean; initialRunId?: string }) => (
    <div>{startFresh ? 'New idea flow' : `Idea flow ${initialRunId}`}</div>
  ),
}));
vi.mock('@/utils/haptics', () => ({ haptics: { tap: vi.fn() } }));

describe('CircleWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRecentRuns.mockResolvedValue([
      { id: 'idea-1', thesis: 'Help clinics price new services', read: 'A focused offer for clinic leaders.', createdAt: '2026-08-10T12:00:00Z' },
    ]);
  });

  it('makes People the clear front door and keeps both add paths visible', () => {
    render(<CircleWorkspace />);

    expect(screen.getByRole('heading', { name: 'Who could help right now?' })).toBeInTheDocument();
    expect(screen.getByText('Ask your network')).toBeInTheDocument();
    expect(screen.getByText('People list')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Add one person/i }));
    expect(screen.getByText('Add person sheet')).toBeInTheDocument();
  });

  it('shows saved ideas and opens both new and existing idea flows', async () => {
    render(<CircleWorkspace />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Ideas' })[0]);

    expect(await screen.findByText('Help clinics price new services')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Help clinics price new services/i }));
    expect(await screen.findByText('Idea flow idea-1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '← All ideas' }));
    fireEvent.click(screen.getByRole('button', { name: /Start a new idea/i }));
    expect(await screen.findByText('New idea flow')).toBeInTheDocument();
  });

  it('makes profile and settings a first-class destination', () => {
    render(<CircleWorkspace />);
    fireEvent.click(screen.getAllByRole('button', { name: 'You' })[0]);

    expect(screen.getByRole('heading', { name: 'You' })).toBeInTheDocument();
    expect(screen.getByText('I help teams turn hard ideas into simple products.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Edit profile/i }));
    expect(screen.getByText('Profile settings sheet')).toBeInTheDocument();
  });
});

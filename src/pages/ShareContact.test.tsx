import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ShareContact from './ShareContact';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  ingestSharedContact: vi.fn(),
  addPersonTags: vi.fn(),
  readSharedScreenshot: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: mocks.invoke } },
}));

vi.mock('@/lib/circleIngest', async () => {
  const actual = await vi.importActual<typeof import('@/lib/circleIngest')>('@/lib/circleIngest');
  return {
    ...actual,
    ingestSharedContact: mocks.ingestSharedContact,
    addPersonTags: mocks.addPersonTags,
  };
});

vi.mock('@/utils/registerServiceWorker', () => ({
  readSharedScreenshot: mocks.readSharedScreenshot,
}));

vi.mock('@/utils/haptics', () => ({
  haptics: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/circle/WhisperButton', () => ({
  WhisperButton: () => <button type="button">Voice</button>,
}));

describe('ShareContact', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readSharedScreenshot.mockResolvedValue({
      blob: null,
      meta: { title: 'Maya Chen', text: 'Commercial lead at Northstar Health', url: '' },
    });
    mocks.invoke.mockResolvedValue({
      data: { parsed: { name: 'Maya Chen', title: 'Commercial lead', company: 'Northstar Health' } },
      error: null,
    });
    mocks.ingestSharedContact.mockResolvedValue({ circlePersonId: 'person-1', sourceId: 'source-1', result: {} });
    mocks.addPersonTags.mockResolvedValue(['met:HealthTech North']);
  });

  it('reviews a text share and keeps the person with meeting context', async () => {
    render(
      <MemoryRouter initialEntries={['/share-contact?pending=1']}>
        <Routes><Route path="/share-contact" element={<ShareContact />} /></Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Keep this person.' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name *')).toHaveValue('Maya Chen');
    expect(screen.getByLabelText('Company')).toHaveValue('Northstar Health');

    fireEvent.change(screen.getByLabelText('Where did you meet?'), { target: { value: 'HealthTech North' } });
    fireEvent.click(screen.getByRole('button', { name: 'Keep clue' }));

    await waitFor(() => expect(mocks.ingestSharedContact).toHaveBeenCalledWith('user-1', expect.objectContaining({
      name: 'Maya Chen',
      title: 'Commercial lead',
      company: 'Northstar Health',
      notes: 'Maya Chen\nCommercial lead at Northstar Health',
    })));
    expect(mocks.addPersonTags).toHaveBeenCalledWith('person-1', ['met:HealthTech North']);
    expect(await screen.findByRole('heading', { name: 'Maya Chen is safe.' })).toBeInTheDocument();
  });

  it('keeps an empty share in place and focuses the missing name', async () => {
    mocks.readSharedScreenshot.mockResolvedValue({ blob: null, meta: null });
    render(
      <MemoryRouter initialEntries={['/share-contact']}>
        <Routes><Route path="/share-contact" element={<ShareContact />} /></Routes>
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'Keep this person.' });
    fireEvent.click(screen.getByRole('button', { name: 'Keep clue' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Add their name first.');
    expect(screen.getByLabelText('Name *')).toHaveFocus();
    expect(mocks.ingestSharedContact).not.toHaveBeenCalled();
  });

  it('does not ask the user to save the person twice when meeting context fails', async () => {
    mocks.addPersonTags.mockRejectedValueOnce(new Error('tag write failed'));
    render(
      <MemoryRouter initialEntries={['/share-contact?pending=1']}>
        <Routes><Route path="/share-contact" element={<ShareContact />} /></Routes>
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'Keep this person.' });
    fireEvent.change(screen.getByLabelText('Where did you meet?'), { target: { value: 'HealthTech North' } });
    fireEvent.click(screen.getByRole('button', { name: 'Keep clue' }));

    expect(await screen.findByRole('heading', { name: 'Maya Chen is safe.' })).toBeInTheDocument();
    expect(screen.getByText('The person is safe. I could not add where you met, so keep that detail for later.')).toBeInTheDocument();
    expect(mocks.ingestSharedContact).toHaveBeenCalledTimes(1);
  });
});

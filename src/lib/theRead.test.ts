import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runBoxQuery } from './theRead';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  from: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: mocks.invoke },
    from: mocks.from,
  },
}));

describe('runBoxQuery exact-name fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({
      select: () => ({ order: mocks.order }),
    });
    mocks.order.mockReturnValue({ limit: mocks.limit });
    mocks.invoke.mockResolvedValue({
      data: null,
      error: {
        context: {
          status: 402,
          clone: () => ({ json: async () => ({ code: 'upgrade_required' }) }),
        },
      },
    });
  });

  it('brings back an exactly named saved person without paid semantic search', async () => {
    mocks.limit.mockResolvedValue({
      data: [{ id: 'person-1', display_name: 'Circle E2e Aug10 2034z', title: null, company: null }],
      error: null,
    });

    const result = await runBoxQuery('Find Circle E2e Aug10 2034z');

    expect(result.upgrade).toBeUndefined();
    expect(result.found).toEqual([
      expect.objectContaining({ id: 'person-1', name: 'Circle E2e Aug10 2034z', matched_on: 'saved name' }),
    ]);
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it('keeps the upgrade boundary for a broad network search', async () => {
    mocks.limit.mockResolvedValue({
      data: [{ id: 'person-1', display_name: 'Maya Chen', title: null, company: null }],
      error: null,
    });

    const result = await runBoxQuery('Who knows hospital procurement?');

    expect(result).toEqual({ intent: 'find_people', found: [], upgrade: true });
  });

  it('routes an obvious first-person idea directly to the saved-network ranker', async () => {
    mocks.limit.mockResolvedValue({ data: [], error: null });
    mocks.invoke.mockImplementation(async (name: string) => {
      if (name === 'extract-read') return { data: {}, error: null };
      if (name === 'rank-inner-circle') {
        return {
          data: { people: [{ id: 'person-2', name: 'Olivia Nakamura', title: 'Operator', company: 'Northstar', role: 'PROOF', why: 'Olivia knows hospital pricing.' }] },
          error: null,
        };
      }
      throw new Error(`Unexpected function: ${name}`);
    });

    const result = await runBoxQuery('I am testing a hospital pricing tool for health software teams');

    expect(result.intent).toBe('working_on');
    expect(result.working?.[0]?.name).toBe('Olivia Nakamura');
    expect(mocks.invoke).toHaveBeenNthCalledWith(1, 'extract-read', {
      body: { text: 'I am testing a hospital pricing tool for health software teams' },
    });
    expect(mocks.invoke).toHaveBeenNthCalledWith(2, 'rank-inner-circle');
  });

  it('falls back to grounded saved details when the idea ranker is unavailable', async () => {
    mocks.limit.mockResolvedValue({
      data: [{
        id: 'person-3',
        display_name: 'Maya Chen',
        title: 'Hospital pricing advisor',
        company: 'Healthware',
        tags: ['health software'],
        note: null,
        dossier: null,
      }],
      error: null,
    });
    mocks.invoke.mockResolvedValue({ data: null, error: new Error('Function unavailable') });

    const result = await runBoxQuery('I am testing a hospital pricing tool for health software teams');

    expect(result.intent).toBe('working_on');
    expect(result.working?.[0]).toEqual(expect.objectContaining({
      id: 'person-3',
      name: 'Maya Chen',
      why: expect.stringContaining('hospital'),
    }));
  });
});

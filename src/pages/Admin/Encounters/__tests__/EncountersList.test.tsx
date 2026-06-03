import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { EncountersList } from '@/pages/Admin/Encounters/EncountersList';
import type { EncountersListResponse } from '@/pages/Admin/Encounters/encountersTypes';

vi.mock('@/pages/Admin/Encounters/encountersApi', () => ({
  encountersApi: {
    list: vi.fn(),
    create: vi.fn(),
    searchPatients: vi.fn(),
  },
}));

import { encountersApi } from '@/pages/Admin/Encounters/encountersApi';

function makeResponse(overrides: Partial<EncountersListResponse> = {}): EncountersListResponse {
  return {
    data: [
      {
        id: 1,
        serviceDate: '2026-05-01',
        provider: 'Dr. Strange',
        diagnosisCodes: 'A1.2',
        procedureCodes: '99213',
        patientId: 100,
        patientFirstName: 'Alice',
        patientLastName: 'Anderson',
        organizationId: 10,
        organizationName: 'Acme Hospice',
        claimsCount: 3,
        isDeleted: false,
        createdAt: '2026-05-01T00:00:00Z',
        updatedAt: '2026-05-02T00:00:00Z',
      },
      {
        id: 2,
        serviceDate: '2026-05-15',
        provider: 'Dr. Banner',
        diagnosisCodes: 'B2.0',
        procedureCodes: '99214',
        patientId: 200,
        patientFirstName: 'Bob',
        patientLastName: 'Brown',
        organizationId: 11,
        organizationName: 'Beacon Care',
        claimsCount: 0,
        isDeleted: true,
        createdAt: '2026-05-15T00:00:00Z',
        updatedAt: '2026-05-16T00:00:00Z',
      },
    ],
    pagination: { total: 2, page: 1, pageSize: 50, totalPages: 1 },
    ...overrides,
  };
}

function renderList() {
  return render(
    <MemoryRouter>
      <EncountersList />
    </MemoryRouter>
  );
}

describe('EncountersList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(encountersApi.list).mockResolvedValue(makeResponse());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders rows from mocked list after debounce settles', async () => {
    renderList();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    await waitFor(() => {
      expect(encountersApi.list).toHaveBeenCalled();
    });
    // Each patient renders twice (mobile cards <ul> + desktop table) since
    // both layouts mount in jsdom — md:hidden / hidden utility classes only
    // switch visibility, not the DOM tree.
    const alice = await screen.findAllByText(/alice anderson/i);
    expect(alice.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/bob brown/i).length).toBeGreaterThanOrEqual(1);
  });

  it('debounces search 300ms and passes q to encountersApi.list', async () => {
    renderList();

    // initial call after mount
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(encountersApi.list).toHaveBeenCalledWith({
      q: undefined,
      includeDeleted: false,
      page: 1,
      pageSize: 50,
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const search = screen.getByLabelText(/search encounters/i);
    await user.type(search, 'strange');

    const callsBeforeDebounce = vi.mocked(encountersApi.list).mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    await waitFor(() => {
      const calls = vi.mocked(encountersApi.list).mock.calls;
      expect(calls.length).toBeGreaterThan(callsBeforeDebounce);
      expect(calls[calls.length - 1][0]).toMatchObject({ q: 'strange' });
    });
  });

  it('toggles includeDeleted and re-queries with the new param', async () => {
    renderList();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    const callsBefore = vi.mocked(encountersApi.list).mock.calls.length;

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByLabelText(/include deleted/i));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    await waitFor(() => {
      const calls = vi.mocked(encountersApi.list).mock.calls;
      expect(calls.length).toBeGreaterThan(callsBefore);
      expect(calls[calls.length - 1][0]).toMatchObject({ includeDeleted: true });
    });
  });

  it('Next button advances the page param', async () => {
    // Return 50 rows so the Next button isn't disabled.
    const items = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      serviceDate: '2026-05-01',
      provider: `Provider ${i + 1}`,
      diagnosisCodes: 'A1',
      procedureCodes: '99213',
      patientId: 100 + i,
      patientFirstName: `Pat${i + 1}`,
      patientLastName: 'Test',
      organizationId: 10,
      organizationName: 'Acme',
      claimsCount: 0,
      isDeleted: false,
      createdAt: '2026-05-01T00:00:00Z',
      updatedAt: '2026-05-01T00:00:00Z',
    }));
    vi.mocked(encountersApi.list).mockResolvedValue({
      data: items,
      pagination: { total: 100, page: 1, pageSize: 50, totalPages: 2 },
    });

    renderList();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    const callsBefore = vi.mocked(encountersApi.list).mock.calls.length;

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByRole('button', { name: /^next$/i }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    await waitFor(() => {
      const calls = vi.mocked(encountersApi.list).mock.calls;
      expect(calls.length).toBeGreaterThan(callsBefore);
      expect(calls[calls.length - 1][0]).toMatchObject({ page: 2 });
    });
  });

  it('renders empty state when no rows', async () => {
    vi.mocked(encountersApi.list).mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, pageSize: 50, totalPages: 0 },
    });

    renderList();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(await screen.findByText(/no encounters found/i)).toBeInTheDocument();
  });
});

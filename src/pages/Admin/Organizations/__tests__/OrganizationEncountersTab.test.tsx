import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { OrganizationEncountersTab } from '@/pages/Admin/Organizations/OrganizationEncountersTab';
import type { OrganizationDetail } from '@/pages/Admin/Organizations/orgsTypes';
import type { EncountersListResponse } from '@/pages/Admin/Encounters/encountersTypes';

vi.mock('@/pages/Admin/Organizations/orgsApi', () => ({
  orgsApi: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
    getClaims: vi.fn(),
    getPatients: vi.fn(),
    getEncounters: vi.fn(),
    getDocuments: vi.fn(),
    getReports: vi.fn(),
  },
}));

import { orgsApi } from '@/pages/Admin/Organizations/orgsApi';

function makeOrg(overrides: Partial<OrganizationDetail> = {}): OrganizationDetail {
  return {
    id: 42,
    name: 'Acme Hospice',
    slug: 'acme-hospice',
    email: null,
    phone: null,
    address: null,
    taxId: null,
    active: true,
    isDeleted: false,
    parentOrganizationId: null,
    claimsCount: 0,
    patientsCount: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

function makeEncountersResponse(
  overrides: Partial<EncountersListResponse> = {},
): EncountersListResponse {
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
        organizationId: 42,
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
        organizationId: 42,
        organizationName: 'Acme Hospice',
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

function renderTab(orgId: string = '42') {
  return render(
    <MemoryRouter initialEntries={[`/admin/organizations/${orgId}/encounters`]}>
      <Routes>
        <Route
          path="/admin/organizations/:id/encounters"
          element={<OrganizationEncountersTab />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('OrganizationEncountersTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(orgsApi.getById).mockResolvedValue(makeOrg());
    vi.mocked(orgsApi.getEncounters).mockResolvedValue(makeEncountersResponse());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders org header + encounter rows after debounce settles', async () => {
    renderTab();

    // Org header fetch is non-debounced; resolve microtasks first.
    await waitFor(() => {
      expect(orgsApi.getById).toHaveBeenCalled();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(
      await screen.findByRole('heading', {
        name: /Acme Hospice — Encounters/i,
      }),
    ).toBeInTheDocument();
    // Each patient renders twice (mobile cards + desktop table mount in jsdom).
    expect((await screen.findAllByText(/alice anderson/i)).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/bob brown/i).length).toBeGreaterThanOrEqual(1);
  });

  it('calls orgsApi.getEncounters(42, ...) after debounce with URL param org id', async () => {
    renderTab();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    await waitFor(() => {
      expect(orgsApi.getEncounters).toHaveBeenCalledWith(42, {
        page: 1,
        pageSize: 50,
        q: undefined,
        includeDeleted: false,
      });
    });
  });

  it('debounces search 300ms and passes q to getEncounters', async () => {
    renderTab();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    const callsBefore = vi.mocked(orgsApi.getEncounters).mock.calls.length;

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const search = await screen.findByLabelText(/search encounters/i);
    await user.type(search, 'strange');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    await waitFor(() => {
      const calls = vi.mocked(orgsApi.getEncounters).mock.calls;
      expect(calls.length).toBeGreaterThan(callsBefore);
      const last = calls[calls.length - 1];
      expect(last[0]).toBe(42);
      expect(last[1]).toMatchObject({ q: 'strange', page: 1 });
    });
  });

  it('toggling includeDeleted re-queries with the new param', async () => {
    renderTab();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    const callsBefore = vi.mocked(orgsApi.getEncounters).mock.calls.length;

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(await screen.findByLabelText(/include deleted/i));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    await waitFor(() => {
      const calls = vi.mocked(orgsApi.getEncounters).mock.calls;
      expect(calls.length).toBeGreaterThan(callsBefore);
      expect(calls[calls.length - 1][1]).toMatchObject({ includeDeleted: true });
    });
  });

  it('renders empty state when no rows', async () => {
    vi.mocked(orgsApi.getEncounters).mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, pageSize: 50, totalPages: 0 },
    });

    renderTab();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(await screen.findByText(/no encounters found/i)).toBeInTheDocument();
  });

  it('back link points to /admin/organizations/42', async () => {
    renderTab();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    const backLink = await screen.findByRole('link', {
      name: /Back to Acme Hospice/i,
    });
    expect(backLink).toHaveAttribute('href', '/admin/organizations/42');
  });
});

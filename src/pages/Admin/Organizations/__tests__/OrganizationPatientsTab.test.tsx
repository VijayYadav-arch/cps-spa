import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { OrganizationPatientsTab } from '@/pages/Admin/Organizations/OrganizationPatientsTab';
import type { OrganizationDetail } from '@/pages/Admin/Organizations/orgsTypes';
import type { PatientSummary, PaginationMeta } from '@/api/patients';

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
    patientsCount: 2,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

function makePatientsResponse(
  overrides: Partial<{ data: PatientSummary[]; pagination: PaginationMeta }> = {},
): { data: PatientSummary[]; pagination: PaginationMeta } {
  return {
    data: [
      {
        id: 1,
        firstName: 'Alice',
        lastName: 'Anderson',
        dateOfBirth: '1955-03-12',
        organizationId: 42,
        createdAt: '2026-01-15T00:00:00Z',
      },
      {
        id: 2,
        firstName: 'Bob',
        lastName: 'Brown',
        dateOfBirth: '1948-09-04',
        organizationId: 42,
        createdAt: '2026-02-01T00:00:00Z',
      },
    ],
    pagination: { total: 2, page: 1, pageSize: 50, totalPages: 1 },
    ...overrides,
  };
}

function renderTab(orgId: string = '42') {
  return render(
    <MemoryRouter initialEntries={[`/admin/organizations/${orgId}/patients`]}>
      <Routes>
        <Route
          path="/admin/organizations/:id/patients"
          element={<OrganizationPatientsTab />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('OrganizationPatientsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(orgsApi.getById).mockResolvedValue(makeOrg());
    vi.mocked(orgsApi.getPatients).mockResolvedValue(makePatientsResponse());
  });

  it('renders org header + patient rows from mocked APIs', async () => {
    renderTab();

    expect(
      await screen.findByRole('heading', {
        name: /Acme Hospice — Patients/i,
      }),
    ).toBeInTheDocument();

    // Each row renders twice (mobile cards + desktop table mount in jsdom; the
    // md:hidden / hidden utility classes only switch visibility).
    expect((await screen.findAllByText('Anderson')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Brown').length).toBeGreaterThanOrEqual(1);
  });

  it('calls orgsApi.getPatients(42, ...) on mount with the URL param org id', async () => {
    renderTab();

    await waitFor(() => {
      expect(orgsApi.getById).toHaveBeenCalledWith(42);
      expect(orgsApi.getPatients).toHaveBeenCalledWith(42, {
        page: 1,
        pageSize: 50,
      });
    });
  });

  it('Next button advances the page param', async () => {
    // Return 50 rows so Next isn't disabled.
    const items: PatientSummary[] = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      firstName: `Pat${i + 1}`,
      lastName: 'Test',
      dateOfBirth: '1950-01-01',
      organizationId: 42,
      createdAt: '2026-01-01T00:00:00Z',
    }));
    vi.mocked(orgsApi.getPatients).mockResolvedValue({
      data: items,
      pagination: { total: 100, page: 1, pageSize: 50, totalPages: 2 },
    });

    renderTab();
    await screen.findByRole('heading', { name: /Acme Hospice — Patients/i });
    const callsBefore = vi.mocked(orgsApi.getPatients).mock.calls.length;

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /^next$/i }));

    await waitFor(() => {
      const calls = vi.mocked(orgsApi.getPatients).mock.calls;
      expect(calls.length).toBeGreaterThan(callsBefore);
      expect(calls[calls.length - 1][1]).toMatchObject({ page: 2 });
    });
  });

  it('renders empty state when no patients', async () => {
    vi.mocked(orgsApi.getPatients).mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, pageSize: 50, totalPages: 0 },
    });

    renderTab();

    expect(await screen.findByText(/no patients found/i)).toBeInTheDocument();
    expect(screen.getByText(/0 total/i)).toBeInTheDocument();
    expect(screen.queryByText('Anderson')).not.toBeInTheDocument();
  });

  it('back link points to /admin/organizations/42', async () => {
    renderTab();

    const backLink = await screen.findByRole('link', {
      name: /Back to Acme Hospice/i,
    });
    expect(backLink).toHaveAttribute('href', '/admin/organizations/42');
  });
});

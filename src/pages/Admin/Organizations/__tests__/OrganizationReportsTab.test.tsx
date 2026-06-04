import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { OrganizationReportsTab } from '@/pages/Admin/Organizations/OrganizationReportsTab';
import type {
  OrganizationDetail,
  PaginationMeta,
  ReportSummary,
} from '@/pages/Admin/Organizations/orgsTypes';

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

function makeReportsResponse(
  overrides: Partial<{ data: ReportSummary[]; pagination: PaginationMeta }> = {},
): { data: ReportSummary[]; pagination: PaginationMeta } {
  return {
    data: [
      {
        id: 101,
        organizationId: 42,
        title: 'April monthly billing',
        type: 'monthly',
        period: '2026-04',
        url: null,
        summary: null,
        createdAt: '2026-05-01T00:00:00Z',
        updatedAt: '2026-05-01T00:00:00Z',
        isDeleted: false,
      },
      {
        id: 102,
        organizationId: 42,
        title: 'AR aging snapshot',
        type: 'ar-aging',
        period: 'Q1-2026',
        url: null,
        summary: null,
        createdAt: '2026-04-15T00:00:00Z',
        updatedAt: '2026-04-15T00:00:00Z',
        isDeleted: false,
      },
    ],
    pagination: { total: 2, page: 1, pageSize: 50, totalPages: 1 },
    ...overrides,
  };
}

function renderTab(orgId: string = '42') {
  return render(
    <MemoryRouter initialEntries={[`/admin/organizations/${orgId}/reports`]}>
      <Routes>
        <Route
          path="/admin/organizations/:id/reports"
          element={<OrganizationReportsTab />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('OrganizationReportsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(orgsApi.getById).mockResolvedValue(makeOrg());
    vi.mocked(orgsApi.getReports).mockResolvedValue(makeReportsResponse());
  });

  it('renders org header + report rows from mocked APIs', async () => {
    renderTab();

    expect(
      await screen.findByRole('heading', {
        name: /Acme Hospice — Reports/i,
      }),
    ).toBeInTheDocument();

    // Each report renders twice (mobile cards + desktop table mount in jsdom).
    expect((await screen.findAllByText('April monthly billing')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('AR aging snapshot').length).toBeGreaterThanOrEqual(1);
  });

  it('calls orgsApi.getReports(42, ...) on mount with the URL param org id', async () => {
    renderTab();

    await waitFor(() => {
      expect(orgsApi.getById).toHaveBeenCalledWith(42);
      expect(orgsApi.getReports).toHaveBeenCalledWith(42, {
        page: 1,
        pageSize: 50,
      });
    });
  });

  it('selecting type=ar-aging filters the visible rows client-side', async () => {
    renderTab();

    // Wait for initial load.
    await screen.findByRole('heading', { name: /Acme Hospice — Reports/i });
    expect((await screen.findAllByText('April monthly billing')).length).toBeGreaterThanOrEqual(1);

    const user = userEvent.setup();
    const select = screen.getByLabelText(/filter by type/i);
    await user.selectOptions(select, 'ar-aging');

    // Client-side filter: the monthly row disappears, ar-aging row stays.
    await waitFor(() => {
      expect(screen.queryByText('April monthly billing')).not.toBeInTheDocument();
    });
    expect(screen.getAllByText('AR aging snapshot').length).toBeGreaterThanOrEqual(1);
  });

  it('renders empty state when no reports', async () => {
    vi.mocked(orgsApi.getReports).mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, pageSize: 50, totalPages: 0 },
    });

    renderTab();

    expect(await screen.findByText(/no reports found/i)).toBeInTheDocument();
    expect(screen.getByText(/0 total/i)).toBeInTheDocument();
  });

  it('back link points to /admin/organizations/42', async () => {
    renderTab();

    const backLink = await screen.findByRole('link', {
      name: /Back to Acme Hospice/i,
    });
    expect(backLink).toHaveAttribute('href', '/admin/organizations/42');
  });
});

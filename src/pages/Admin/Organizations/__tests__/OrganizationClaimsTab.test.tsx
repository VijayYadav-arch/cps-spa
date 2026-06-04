import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { OrganizationClaimsTab } from '@/pages/Admin/Organizations/OrganizationClaimsTab';
import type { OrganizationDetail } from '@/pages/Admin/Organizations/orgsTypes';
import type { ClaimSummary, PagedResponse } from '@/api/claims';

vi.mock('@/pages/Admin/Organizations/orgsApi', () => ({
  orgsApi: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
    getClaims: vi.fn(),
  },
}));

import { orgsApi } from '@/pages/Admin/Organizations/orgsApi';

function makeOrg(overrides: Partial<OrganizationDetail> = {}): OrganizationDetail {
  return {
    id: 42,
    name: 'Acme Hospice',
    slug: 'acme-hospice',
    email: 'ops@acme.test',
    phone: null,
    address: null,
    taxId: null,
    active: true,
    isDeleted: false,
    parentOrganizationId: null,
    claimsCount: 2,
    patientsCount: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

function makeClaimsResponse(
  overrides: Partial<PagedResponse<ClaimSummary>> = {},
): PagedResponse<ClaimSummary> {
  return {
    data: [
      {
        id: 1001,
        patientName: 'Jane Doe',
        status: 'submitted',
        amount: 250.5,
        submittedDate: '2026-05-01T00:00:00Z',
        organizationId: 42,
        createdAt: '2026-04-15T00:00:00Z',
      },
      {
        id: 1002,
        patientName: 'John Smith',
        status: 'paid',
        amount: 415.0,
        submittedDate: '2026-05-10T00:00:00Z',
        organizationId: 42,
        createdAt: '2026-04-20T00:00:00Z',
      },
    ],
    pagination: { total: 2, page: 1, pageSize: 50, totalPages: 1 },
    ...overrides,
  };
}

function renderTab(orgId: string = '42') {
  return render(
    <MemoryRouter initialEntries={[`/admin/organizations/${orgId}/claims`]}>
      <Routes>
        <Route
          path="/admin/organizations/:id/claims"
          element={<OrganizationClaimsTab />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('OrganizationClaimsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(orgsApi.getById).mockResolvedValue(makeOrg());
    vi.mocked(orgsApi.getClaims).mockResolvedValue(makeClaimsResponse());
  });

  it('renders org header + claims rows from mocked APIs', async () => {
    renderTab();

    // Header surfaces the org name (mounts as both `Back to Acme Hospice`
    // and `Acme Hospice — Claims`)
    expect(
      await screen.findByRole('heading', {
        name: /Acme Hospice — Claims/i,
      }),
    ).toBeInTheDocument();

    // Both rows render (mobile cards + desktop table mount in jsdom; the
    // md:hidden / hidden utility classes only switch visibility).
    expect((await screen.findAllByText('Jane Doe')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('John Smith').length).toBeGreaterThanOrEqual(1);
  });

  it('calls orgsApi.getClaims(42, ...) on mount with the URL param org id', async () => {
    renderTab();

    await waitFor(() => {
      expect(orgsApi.getById).toHaveBeenCalledWith(42);
      expect(orgsApi.getClaims).toHaveBeenCalledWith(42, {
        page: 1,
        pageSize: 50,
        status: undefined,
      });
    });
  });

  it('selecting the "denied" status triggers getClaims with status=denied', async () => {
    renderTab();

    // Wait for the initial load to settle
    await screen.findByRole('heading', { name: /Acme Hospice — Claims/i });
    const callsBefore = vi.mocked(orgsApi.getClaims).mock.calls.length;

    const user = userEvent.setup();
    const select = screen.getByLabelText(/filter by status/i);
    await user.selectOptions(select, 'denied');

    await waitFor(() => {
      const calls = vi.mocked(orgsApi.getClaims).mock.calls;
      expect(calls.length).toBeGreaterThan(callsBefore);
      const [orgIdArg, paramsArg] = calls[calls.length - 1];
      expect(orgIdArg).toBe(42);
      expect(paramsArg).toMatchObject({ status: 'denied', page: 1 });
    });
  });

  it('renders empty state when no claims', async () => {
    vi.mocked(orgsApi.getClaims).mockResolvedValue(
      makeClaimsResponse({
        data: [],
        pagination: { total: 0, page: 1, pageSize: 50, totalPages: 0 },
      }),
    );

    renderTab();

    expect(await screen.findByText(/no claims found/i)).toBeInTheDocument();
    expect(screen.getByText(/0 total/i)).toBeInTheDocument();
    // No row links to /claims/1001 should be present.
    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
  });

  it('back link points to /admin/organizations/42', async () => {
    renderTab();

    const backLink = await screen.findByRole('link', {
      name: /Back to Acme Hospice/i,
    });
    expect(backLink).toHaveAttribute('href', '/admin/organizations/42');
  });
});

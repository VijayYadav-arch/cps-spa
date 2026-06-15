import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { OrganizationDetail } from '@/pages/Admin/Organizations/OrganizationDetail';
import type { OrganizationDetail as Org } from '@/pages/Admin/Organizations/orgsTypes';

vi.mock('@/pages/Admin/Organizations/orgsApi', () => ({
  orgsApi: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
  },
}));

import { orgsApi } from '@/pages/Admin/Organizations/orgsApi';

// Mock the /me query seam so usePermission resolves synchronously without a
// QueryClientProvider. Real usePermission logic still runs against this data.
vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue(
    { data: { permissions } } as unknown as ReturnType<typeof useUserRoles>,
  );
}

function makeOrg(overrides: Partial<Org> = {}): Org {
  return {
    id: 7,
    name: 'Acme Hospice',
    slug: 'acme-hospice',
    email: 'ops@acme.test',
    phone: '555-100-2000',
    address: '123 Main St',
    taxId: '12-3456789',
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

function renderDetail(orgId: string = '7') {
  return render(
    <MemoryRouter initialEntries={[`/admin/organizations/${orgId}`]}>
      <Routes>
        <Route path="/admin/organizations/:id" element={<OrganizationDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('OrganizationDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: user holds admin:manage_orgs so Soft-delete / Restore are enabled.
    setPermissions(['admin:manage_orgs']);
  });

  it('renders the org detail with a Soft-delete action for an active org', async () => {
    vi.mocked(orgsApi.getById).mockResolvedValueOnce(makeOrg());
    renderDetail();

    expect(await screen.findByRole('heading', { name: /acme hospice/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^soft-delete$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^restore$/i })).not.toBeInTheDocument();
  });

  it('renders a Restore action for a soft-deleted org', async () => {
    vi.mocked(orgsApi.getById).mockResolvedValueOnce(makeOrg({ isDeleted: true }));
    renderDetail();

    expect(await screen.findByRole('heading', { name: /acme hospice/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^restore$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^soft-delete$/i })).not.toBeInTheDocument();
  });

  describe('permission gating', () => {
    it('disables Soft-delete with a permission tooltip when the user lacks admin:manage_orgs', async () => {
      setPermissions([]); // no admin:manage_orgs
      vi.mocked(orgsApi.getById).mockResolvedValueOnce(makeOrg());
      renderDetail();

      const btn = await screen.findByRole('button', { name: /^soft-delete$/i });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
    });

    it('enables Soft-delete when the user has admin:manage_orgs', async () => {
      setPermissions(['admin:manage_orgs']);
      vi.mocked(orgsApi.getById).mockResolvedValueOnce(makeOrg());
      renderDetail();

      expect(await screen.findByRole('button', { name: /^soft-delete$/i })).toBeEnabled();
    });

    it('disables Restore with a permission tooltip when the user lacks admin:manage_orgs', async () => {
      setPermissions([]); // no admin:manage_orgs
      vi.mocked(orgsApi.getById).mockResolvedValueOnce(makeOrg({ isDeleted: true }));
      renderDetail();

      const btn = await screen.findByRole('button', { name: /^restore$/i });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
    });
  });
});

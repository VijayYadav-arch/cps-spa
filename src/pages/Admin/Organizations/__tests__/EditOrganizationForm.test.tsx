import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { EditOrganizationForm } from '@/pages/Admin/Organizations/EditOrganizationForm';
import type { OrganizationDetail } from '@/pages/Admin/Organizations/orgsTypes';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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

function makeOrg(overrides: Partial<OrganizationDetail> = {}): OrganizationDetail {
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

function renderEdit(orgId: string = '7') {
  return render(
    <MemoryRouter initialEntries={[`/admin/organizations/${orgId}/edit`]}>
      <Routes>
        <Route path="/admin/organizations/:id/edit" element={<EditOrganizationForm />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('EditOrganizationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
    // Default: user holds admin:manage_orgs so existing behaviour tests see
    // enabled Save / Restore buttons. Permission-gating tests override.
    setPermissions(['admin:manage_orgs']);
  });

  it('preloads form via orgsApi.getById on mount', async () => {
    vi.mocked(orgsApi.getById).mockResolvedValueOnce(makeOrg());
    renderEdit();

    await waitFor(() => {
      expect(orgsApi.getById).toHaveBeenCalledWith(7);
    });
    const nameInput = await screen.findByLabelText(/^name \*$/i);
    expect((nameInput as HTMLInputElement).value).toBe('Acme Hospice');
    const slugInput = screen.getByLabelText(/^slug \*$/i);
    expect((slugInput as HTMLInputElement).value).toBe('acme-hospice');
  });

  it('calls orgsApi.update on submit and navigates back to detail', async () => {
    vi.mocked(orgsApi.getById).mockResolvedValueOnce(makeOrg());
    vi.mocked(orgsApi.update).mockResolvedValueOnce(makeOrg({ name: 'Renamed Org' }));

    const user = userEvent.setup();
    renderEdit();

    const nameInput = await screen.findByLabelText(/^name \*$/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Renamed Org');

    await user.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(orgsApi.update).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ name: 'Renamed Org', slug: 'acme-hospice' })
      );
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin/organizations/7');
    });
  });

  it('shows restore prompt instead of form for soft-deleted orgs', async () => {
    vi.mocked(orgsApi.getById).mockResolvedValueOnce(makeOrg({ isDeleted: true }));
    renderEdit();

    expect(await screen.findByText(/is soft-deleted and cannot be edited/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^restore$/i })).toBeInTheDocument();
    // The form's Save button should NOT be present.
    expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument();
  });

  describe('permission gating', () => {
    it('disables Save with a permission tooltip when the user lacks admin:manage_orgs', async () => {
      setPermissions([]); // no admin:manage_orgs
      vi.mocked(orgsApi.getById).mockResolvedValueOnce(makeOrg());
      renderEdit();

      const btn = await screen.findByRole('button', { name: /^save$/i });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
    });

    it('enables Save when the user has admin:manage_orgs', async () => {
      setPermissions(['admin:manage_orgs']);
      vi.mocked(orgsApi.getById).mockResolvedValueOnce(makeOrg());
      renderEdit();

      expect(await screen.findByRole('button', { name: /^save$/i })).toBeEnabled();
    });

    it('disables Restore (soft-deleted branch) when the user lacks admin:manage_orgs', async () => {
      setPermissions([]); // no admin:manage_orgs
      vi.mocked(orgsApi.getById).mockResolvedValueOnce(makeOrg({ isDeleted: true }));
      renderEdit();

      const btn = await screen.findByRole('button', { name: /^restore$/i });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NewOrganizationForm } from '@/pages/Admin/Organizations/NewOrganizationForm';

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

function renderForm() {
  return render(
    <MemoryRouter>
      <NewOrganizationForm />
    </MemoryRouter>
  );
}

describe('NewOrganizationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
    // Default: user holds the create permission so existing behaviour tests see
    // an enabled button. Permission-gating tests override.
    setPermissions(['platform:admin']);
  });

  it('blocks submit when required fields are empty and shows validation errors', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /^create$/i }));

    expect(await screen.findAllByText('Required')).toHaveLength(2);
    expect(orgsApi.create).not.toHaveBeenCalled();
  });

  it('calls orgsApi.create on submit and navigates to the new org detail', async () => {
    vi.mocked(orgsApi.create).mockResolvedValueOnce({
      id: 42,
      name: 'New Hospice',
      slug: 'new-hospice',
      email: null,
      phone: null,
      address: null,
      taxId: null,
      active: true,
      isDeleted: false,
      parentOrganizationId: null,
      claimsCount: 0,
      patientsCount: 0,
      createdAt: '2026-06-03T00:00:00Z',
      updatedAt: '2026-06-03T00:00:00Z',
    });

    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/^name \*$/i), 'New Hospice');
    await user.type(screen.getByLabelText(/^slug \*$/i), 'new-hospice');
    await user.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(orgsApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Hospice', slug: 'new-hospice', active: true })
      );
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin/organizations/42');
    });
  });

  it('shows an error message when orgsApi.create fails', async () => {
    vi.mocked(orgsApi.create).mockRejectedValueOnce(new Error('Slug already exists'));

    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/^name \*$/i), 'Dup Org');
    await user.type(screen.getByLabelText(/^slug \*$/i), 'taken');
    await user.click(screen.getByRole('button', { name: /^create$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/slug already exists/i);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('Cancel button calls navigate(-1)', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  describe('permission gating', () => {
    it('disables Create with a permission tooltip when the user lacks platform:admin', () => {
      setPermissions([]); // no platform:admin
      renderForm();

      const btn = screen.getByRole('button', { name: /^create$/i });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
    });

    it('enables Create when the user has platform:admin', () => {
      setPermissions(['platform:admin']);
      renderForm();

      expect(screen.getByRole('button', { name: /^create$/i })).toBeEnabled();
    });
  });
});

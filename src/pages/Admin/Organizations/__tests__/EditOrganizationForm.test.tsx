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
});

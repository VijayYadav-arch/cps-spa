import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NewClaimForm } from '@/pages/Claims/NewClaimForm';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/api/claims', async () => {
  const actual = await vi.importActual<typeof import('@/api/claims')>('@/api/claims');
  return {
    ...actual,
    createClaim: vi.fn(),
  };
});

vi.mock('@/api/admin', async () => {
  const actual = await vi.importActual<typeof import('@/api/admin')>('@/api/admin');
  return {
    ...actual,
    getOrganizations: vi.fn(),
  };
});

import { createClaim } from '@/api/claims';
import { getOrganizations } from '@/api/admin';

// Mock the /me query seam so usePermission resolves synchronously without a
// QueryClientProvider. Real usePermission logic still runs against this data.
vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

const ALL_FORM_PERMS = ['claims:view', 'claims:create'];
function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue({ data: { permissions } } as unknown as ReturnType<typeof useUserRoles>);
}

function renderForm() {
  return render(
    <MemoryRouter>
      <NewClaimForm />
    </MemoryRouter>
  );
}

describe('NewClaimForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
    // Default: user holds every form-related permission so existing behaviour
    // tests see an enabled submit button. Permission-gating tests override.
    setPermissions(ALL_FORM_PERMS);
    vi.mocked(getOrganizations).mockResolvedValue({
      data: [
        { id: 1, name: 'Acme Hospice', slug: 'acme', email: null, phone: null, isActive: true, createdAt: '2026-06-01T00:00:00Z' },
        { id: 2, name: 'Beta Health', slug: 'beta', email: null, phone: null, isActive: true, createdAt: '2026-06-01T00:00:00Z' },
      ],
      pagination: { total: 2, page: 1, pageSize: 100, totalPages: 1 },
    });
  });

  it('renders the form heading + back link + payer options', async () => {
    renderForm();
    expect(screen.getByRole('heading', { name: /new claim/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to claims/i })).toHaveAttribute('href', '/claims');
    expect(screen.getByRole('combobox', { name: /payer/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Acme Hospice' })).toBeInTheDocument();
    });
  });

  it('blocks submit and shows error when patient name is empty', async () => {
    const user = userEvent.setup();
    renderForm();
    await waitFor(() => expect(getOrganizations).toHaveBeenCalled());

    await user.type(screen.getByRole('spinbutton', { name: /amount/i }), '100');
    await user.click(screen.getByRole('button', { name: /create claim/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/patient name is required/i);
    expect(createClaim).not.toHaveBeenCalled();
  });

  it('blocks submit when amount is zero or missing', async () => {
    const user = userEvent.setup();
    renderForm();
    await waitFor(() => expect(getOrganizations).toHaveBeenCalled());

    await user.type(screen.getByRole('textbox', { name: /patient name/i }), 'Jane Doe');
    await user.click(screen.getByRole('button', { name: /create claim/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/amount must be greater than zero/i);
    expect(createClaim).not.toHaveBeenCalled();
  });

  it('calls createClaim with payload and navigates to detail on success', async () => {
    vi.mocked(createClaim).mockResolvedValueOnce({
      id: 42,
      patientName: 'Jane Doe',
      status: 'submitted',
      amount: 125.5,
      submittedDate: null,
      organizationId: 1,
      createdAt: '2026-06-04T00:00:00Z',
      paidAmount: null,
      denialReason: null,
      updatedAt: null,
      serviceLines: [],
    });

    const user = userEvent.setup();
    renderForm();
    await waitFor(() => expect(getOrganizations).toHaveBeenCalled());

    await user.type(screen.getByRole('textbox', { name: /patient name/i }), 'Jane Doe');
    await user.type(screen.getByRole('spinbutton', { name: /amount/i }), '125.50');
    await user.type(screen.getByRole('textbox', { name: /primary diagnosis/i }), 'I50.9');
    await user.click(screen.getByRole('button', { name: /create claim/i }));

    await waitFor(() => {
      expect(createClaim).toHaveBeenCalledWith(
        expect.objectContaining({
          patientName: 'Jane Doe',
          amount: 125.5,
          payer: 'Medicare',
          diagnosisCodeA: 'I50.9',
        })
      );
      expect(mockNavigate).toHaveBeenCalledWith('/claims/42');
    });
  });

  it('shows server error and stays on form when createClaim rejects', async () => {
    vi.mocked(createClaim).mockRejectedValueOnce(new Error('Payer is required by clearinghouse'));

    const user = userEvent.setup();
    renderForm();
    await waitFor(() => expect(getOrganizations).toHaveBeenCalled());

    await user.type(screen.getByRole('textbox', { name: /patient name/i }), 'Jane Doe');
    await user.type(screen.getByRole('spinbutton', { name: /amount/i }), '50');
    await user.click(screen.getByRole('button', { name: /create claim/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/payer is required by clearinghouse/i);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('renders empty org list gracefully when getOrganizations rejects', async () => {
    vi.mocked(getOrganizations).mockRejectedValueOnce(new Error('Forbidden'));
    renderForm();

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /client organization/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole('option', { name: 'Acme Hospice' })).not.toBeInTheDocument();
  });

  describe('permission gating', () => {
    it('disables Create Claim with a permission tooltip when the user lacks claims:create', async () => {
      setPermissions(['claims:view']); // no claims:create
      renderForm();
      await waitFor(() => expect(getOrganizations).toHaveBeenCalled());

      const btn = screen.getByRole('button', { name: /create claim/i });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
    });

    it('enables Create Claim when the user has claims:create', async () => {
      setPermissions(['claims:view', 'claims:create']);
      renderForm();
      await waitFor(() => expect(getOrganizations).toHaveBeenCalled());

      expect(screen.getByRole('button', { name: /create claim/i })).toBeEnabled();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { BatchOperationsPage } from '@/pages/Billing/BatchOperationsPage';

vi.mock('@/api/claims', async () => {
  const actual = await vi.importActual<typeof import('@/api/claims')>('@/api/claims');
  return {
    ...actual,
    getClaims: vi.fn(),
    batchSubmitClaims: vi.fn(),
    batchVoidClaims: vi.fn(),
  };
});

import { batchSubmitClaims, batchVoidClaims, getClaims } from '@/api/claims';

// Mock the /me query seam so usePermission resolves synchronously without a
// QueryClientProvider. Real usePermission logic still runs against this data.
vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

const ALL_PERMS = ['billing:queue', 'billing:batch'];
function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue({ data: { permissions } } as unknown as ReturnType<typeof useUserRoles>);
}

function claim(id: number, status = 'pending') {
  return {
    id,
    patientName: `Patient ${id}`,
    status,
    amount: 100 * id,
    submittedDate: null,
    organizationId: 1,
    createdAt: '2026-06-04T00:00:00Z',
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <BatchOperationsPage />
    </MemoryRouter>
  );
}

describe('BatchOperationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: user holds every permission this page uses so existing
    // behaviour tests see enabled buttons. Permission-gating tests override.
    setPermissions(ALL_PERMS);
    vi.mocked(getClaims).mockResolvedValue({
      data: [claim(1), claim(2, 'submitted')],
      pagination: { total: 2, page: 1, pageSize: 50, totalPages: 1 },
    });
  });

  it('renders heading + claim table with checkboxes', async () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /batch operations/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Patient 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Select claim 1')).toBeInTheDocument();
    });
  });

  it('toggles selection + updates counter', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByLabelText('Select claim 1'));

    await user.click(screen.getByLabelText('Select claim 1'));
    expect(screen.getByText(/1 selected/i)).toBeInTheDocument();
  });

  it('disables action buttons when nothing selected', async () => {
    renderPage();
    await waitFor(() => screen.getByText(/0 selected/i));

    expect(screen.getByRole('button', { name: /submit selected/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /void selected/i })).toBeDisabled();
  });

  it('calls batchSubmitClaims on submit + shows result', async () => {
    vi.mocked(batchSubmitClaims).mockResolvedValueOnce({ succeeded: [1, 2], failed: [] });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByLabelText('Select all'));

    await user.click(screen.getByLabelText('Select all'));
    await user.click(screen.getByRole('button', { name: /submit selected/i }));

    await waitFor(() => {
      expect(batchSubmitClaims).toHaveBeenCalledWith([1, 2]);
      expect(screen.getByText(/submit result/i)).toBeInTheDocument();
    });
  });

  it('opens confirm modal before void + calls batchVoidClaims on confirm', async () => {
    vi.mocked(batchVoidClaims).mockResolvedValueOnce({ voided: [1], notFound: [] });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByLabelText('Select claim 1'));

    await user.click(screen.getByLabelText('Select claim 1'));
    await user.click(screen.getByRole('button', { name: /void selected/i }));

    expect(screen.getByRole('dialog', { name: /confirm void/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /confirm void/i }));

    await waitFor(() => {
      expect(batchVoidClaims).toHaveBeenCalledWith([1]);
    });
  });

  describe('permission gating', () => {
    it('disables Submit selected with a permission tooltip when the user lacks billing:batch', async () => {
      setPermissions(['billing:queue']); // no billing:batch
      const user = userEvent.setup();
      renderPage();
      await waitFor(() => screen.getByLabelText('Select claim 1'));
      // Select one so the only remaining disabled reason is the missing permission
      await user.click(screen.getByLabelText('Select claim 1'));

      const btn = screen.getByRole('button', { name: /submit selected/i });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
    });

    it('disables Void selected with a permission tooltip when the user lacks billing:batch', async () => {
      setPermissions(['billing:queue']); // no billing:batch
      const user = userEvent.setup();
      renderPage();
      await waitFor(() => screen.getByLabelText('Select claim 1'));
      await user.click(screen.getByLabelText('Select claim 1'));

      const btn = screen.getByRole('button', { name: /void selected/i });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
    });

    it('enables Submit/Void selected when the user has billing:batch and rows are selected', async () => {
      setPermissions(['billing:queue', 'billing:batch']);
      const user = userEvent.setup();
      renderPage();
      await waitFor(() => screen.getByLabelText('Select claim 1'));
      await user.click(screen.getByLabelText('Select claim 1'));

      expect(screen.getByRole('button', { name: /submit selected/i })).toBeEnabled();
      expect(screen.getByRole('button', { name: /void selected/i })).toBeEnabled();
    });
  });
});

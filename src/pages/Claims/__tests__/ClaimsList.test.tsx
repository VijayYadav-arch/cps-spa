import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ClaimsList } from '@/pages/Claims/ClaimsList';

vi.mock('@/api/claims', () => ({
  getClaims: vi.fn(),
  batchSubmitClaims: vi.fn(),
  batchVoidClaims: vi.fn(),
}));

import {
  getClaims,
  batchSubmitClaims,
  batchVoidClaims,
} from '@/api/claims';

// Mock the /me query seam so usePermission resolves synchronously without a
// QueryClientProvider. Real usePermission logic still runs against this data.
vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

const ALL_LIST_PERMS = ['claims:view', 'billing:batch'];
function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue({ data: { permissions } } as unknown as ReturnType<typeof useUserRoles>);
}

function claim(over: Partial<{ id: number; patientName: string; status: string; amount: number }> = {}) {
  return {
    id: 1,
    patientName: 'Jane Doe',
    status: 'pending',
    amount: 250.00,
    submittedDate: null,
    organizationId: 7,
    createdAt: '2026-01-01',
    ...over,
  };
}

function pagination(totalPages = 1) {
  return { total: 1, page: 1, pageSize: 20, totalPages };
}

function renderList() {
  return render(<MemoryRouter><ClaimsList /></MemoryRouter>);
}

describe('ClaimsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: user holds every list-related permission so existing behaviour
    // tests see enabled buttons. Permission-gating tests override.
    setPermissions(ALL_LIST_PERMS);
  });

  it('renders loading state initially', () => {
    vi.mocked(getClaims).mockReturnValue(new Promise(() => {}));
    renderList();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders claims table after data loads', async () => {
    vi.mocked(getClaims).mockResolvedValueOnce({
      data: [claim()],
      pagination: pagination(),
    });

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('$250.00')).toBeInTheDocument();
    });
  });

  it('shows error when getClaims rejects', async () => {
    vi.mocked(getClaims).mockRejectedValueOnce(new Error('network error'));
    renderList();
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('toolbar appears when a row is selected and clears on Clear', async () => {
    const user = userEvent.setup();
    vi.mocked(getClaims).mockResolvedValueOnce({
      data: [claim()],
      pagination: pagination(),
    });
    renderList();
    await screen.findByText('Jane Doe');

    await user.click(screen.getByLabelText(/Select claim 1/i));
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit 1/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Clear/i }));
    expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
  });

  it('select-all checkbox toggles every row', async () => {
    const user = userEvent.setup();
    vi.mocked(getClaims).mockResolvedValueOnce({
      data: [claim(), claim({ id: 2, patientName: 'Bob Roe' })],
      pagination: pagination(),
    });
    renderList();
    await screen.findByText('Bob Roe');

    await user.click(screen.getByLabelText(/Select all rows/i));
    expect(screen.getByText('2 selected')).toBeInTheDocument();
  });

  it('batch submit posts ids and shows summary', async () => {
    const user = userEvent.setup();
    vi.mocked(getClaims).mockResolvedValue({
      data: [claim(), claim({ id: 2, patientName: 'Bob Roe' })],
      pagination: pagination(),
    });
    vi.mocked(batchSubmitClaims).mockResolvedValue({
      succeeded: [1, 2],
      failed: [],
    });
    renderList();
    await screen.findByText('Bob Roe');

    await user.click(screen.getByLabelText(/Select all rows/i));
    await user.click(screen.getByRole('button', { name: /Submit 2/i }));
    await user.click(screen.getByRole('button', { name: /^Submit$/ }));

    await waitFor(() => {
      expect(batchSubmitClaims).toHaveBeenCalledWith([1, 2]);
    });
    expect(await screen.findByText(/Batch submit · 2\/2 succeeded/)).toBeInTheDocument();
  });

  it('batch void posts ids and shows summary with notFound annotation', async () => {
    const user = userEvent.setup();
    vi.mocked(getClaims).mockResolvedValue({
      data: [claim(), claim({ id: 2, patientName: 'Bob Roe' })],
      pagination: pagination(),
    });
    vi.mocked(batchVoidClaims).mockResolvedValue({
      voided: [1],
      notFound: [2],
    });
    renderList();
    await screen.findByText('Bob Roe');

    await user.click(screen.getByLabelText(/Select all rows/i));
    await user.click(screen.getByRole('button', { name: /Void 2/i }));
    await user.click(screen.getByRole('button', { name: /^Void$/ }));

    await waitFor(() => {
      expect(batchVoidClaims).toHaveBeenCalledWith([1, 2]);
    });
    expect(await screen.findByText(/Batch void · 1\/2 voided.*1 not found/))
      .toBeInTheDocument();
  });

  it('cancels the confirmation dialog without calling the API', async () => {
    const user = userEvent.setup();
    vi.mocked(getClaims).mockResolvedValueOnce({
      data: [claim()],
      pagination: pagination(),
    });
    renderList();
    await screen.findByText('Jane Doe');

    await user.click(screen.getByLabelText(/Select claim 1/i));
    await user.click(screen.getByRole('button', { name: /Submit 1/i }));
    await user.click(screen.getByRole('button', { name: /^Cancel$/ }));

    expect(batchSubmitClaims).not.toHaveBeenCalled();
    // Dialog dismissed; toolbar still visible
    expect(screen.getByText('1 selected')).toBeInTheDocument();
  });

  describe('permission gating', () => {
    it('disables the confirm Submit button with a permission tooltip when the user lacks billing:batch', async () => {
      setPermissions(['claims:view']); // no billing:batch
      const user = userEvent.setup();
      vi.mocked(getClaims).mockResolvedValueOnce({
        data: [claim()],
        pagination: pagination(),
      });
      renderList();
      await screen.findByText('Jane Doe');

      await user.click(screen.getByLabelText(/Select claim 1/i));
      await user.click(screen.getByRole('button', { name: /Submit 1/i }));

      const confirm = screen.getByRole('button', { name: /^Submit$/ });
      expect(confirm).toBeDisabled();
      expect(confirm).toHaveAttribute('title', expect.stringMatching(/permission/i));
    });

    it('disables the confirm Void button when the user lacks billing:batch', async () => {
      setPermissions(['claims:view']); // no billing:batch
      const user = userEvent.setup();
      vi.mocked(getClaims).mockResolvedValueOnce({
        data: [claim()],
        pagination: pagination(),
      });
      renderList();
      await screen.findByText('Jane Doe');

      await user.click(screen.getByLabelText(/Select claim 1/i));
      await user.click(screen.getByRole('button', { name: /Void 1/i }));

      const confirm = screen.getByRole('button', { name: /^Void$/ });
      expect(confirm).toBeDisabled();
      expect(confirm).toHaveAttribute('title', expect.stringMatching(/permission/i));
    });

    it('enables the confirm Submit button when the user has billing:batch', async () => {
      setPermissions(['claims:view', 'billing:batch']);
      const user = userEvent.setup();
      vi.mocked(getClaims).mockResolvedValueOnce({
        data: [claim()],
        pagination: pagination(),
      });
      renderList();
      await screen.findByText('Jane Doe');

      await user.click(screen.getByLabelText(/Select claim 1/i));
      await user.click(screen.getByRole('button', { name: /Submit 1/i }));

      expect(screen.getByRole('button', { name: /^Submit$/ })).toBeEnabled();
    });
  });
});

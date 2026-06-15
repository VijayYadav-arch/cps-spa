import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { BranchesPage } from '@/pages/Admin/BranchesPage';
import type { Branch } from '@/api/admin';

vi.mock('@/api/admin', () => ({
  listBranches: vi.fn(),
  createBranch: vi.fn(),
  updateBranch: vi.fn(),
  deleteBranch: vi.fn(),
}));

import {
  createBranch,
  deleteBranch,
  listBranches,
  updateBranch,
} from '@/api/admin';

// Mock the /me query seam so usePermission resolves synchronously without a
// QueryClientProvider. Real usePermission logic still runs against this data.
vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue({ data: { permissions } } as unknown as ReturnType<typeof useUserRoles>);
}

function branch(over: Partial<Branch> = {}): Branch {
  return {
    id: 1,
    name: 'Tampa Downtown',
    code: 'TPA-DT',
    ccnNumber: '10A1234',
    addressLine1: '1 Hospice Way',
    addressLine2: null,
    city: 'Tampa',
    state: 'FL',
    zipCode: '33602',
    phone: '813-555-0100',
    isActive: true,
    createdAt: '2026-05-19T00:00:00Z',
    ...over,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <BranchesPage />
    </MemoryRouter>,
  );
}

describe('BranchesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: user holds the manage permission so existing behaviour tests see
    // enabled buttons. Permission-gating tests override.
    setPermissions(['admin:manage_branches']);
  });

  it('renders the branch list', async () => {
    vi.mocked(listBranches).mockResolvedValueOnce({
      data: [branch(), branch({ id: 2, name: 'Orlando', code: 'ORL', isActive: false })],
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Tampa Downtown')).toBeInTheDocument();
    });
    expect(screen.getByText('Orlando')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('shows empty state when no branches', async () => {
    vi.mocked(listBranches).mockResolvedValueOnce({ data: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/No branches yet/i)).toBeInTheDocument();
    });
  });

  it('creates a new branch via the form', async () => {
    const user = userEvent.setup();
    vi.mocked(listBranches)
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [branch()] });
    vi.mocked(createBranch).mockResolvedValueOnce(branch());

    renderPage();
    await user.click(await screen.findByRole('button', { name: /New Branch/i }));
    await user.type(screen.getByLabelText(/Name/i), 'Tampa Downtown');
    await user.type(screen.getByLabelText(/Code/i), 'TPA-DT');
    await user.click(screen.getByRole('button', { name: /Create/i }));

    await waitFor(() => {
      expect(createBranch).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Tampa Downtown',
        code: 'TPA-DT',
      }));
    });
    expect(screen.getByText(/Created branch Tampa Downtown/i)).toBeInTheDocument();
  });

  it('shows backend error on duplicate code', async () => {
    const user = userEvent.setup();
    vi.mocked(listBranches).mockResolvedValueOnce({ data: [] });
    vi.mocked(createBranch).mockRejectedValueOnce({
      response: { data: { error: "A branch with code 'TPA' already exists in this organization." } },
    });

    renderPage();
    await user.click(await screen.findByRole('button', { name: /New Branch/i }));
    await user.type(screen.getByLabelText(/Name/i), 'Tampa');
    await user.type(screen.getByLabelText(/Code/i), 'TPA');
    await user.click(screen.getByRole('button', { name: /Create/i }));

    await waitFor(() => {
      expect(screen.getByText(/already exists/i)).toBeInTheDocument();
    });
  });

  it('toggles active state from the row action', async () => {
    const user = userEvent.setup();
    vi.mocked(listBranches).mockResolvedValue({ data: [branch()] });
    vi.mocked(updateBranch).mockResolvedValueOnce(branch({ isActive: false }));

    renderPage();
    await screen.findByText('Tampa Downtown');
    await user.click(screen.getByRole('button', { name: /Deactivate/i }));

    await waitFor(() => {
      expect(updateBranch).toHaveBeenCalledWith(1, expect.objectContaining({ isActive: false }));
    });
  });

  it('confirms before deleting', async () => {
    const user = userEvent.setup();
    vi.mocked(listBranches).mockResolvedValue({ data: [branch()] });

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    renderPage();
    await screen.findByText('Tampa Downtown');
    await user.click(screen.getByRole('button', { name: /Delete/i }));
    expect(deleteBranch).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('deletes when confirmed', async () => {
    const user = userEvent.setup();
    vi.mocked(listBranches)
      .mockResolvedValueOnce({ data: [branch()] })
      .mockResolvedValueOnce({ data: [] });
    vi.mocked(deleteBranch).mockResolvedValueOnce();

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    renderPage();
    await screen.findByText('Tampa Downtown');
    await user.click(screen.getByRole('button', { name: /Delete/i }));
    await waitFor(() => {
      expect(deleteBranch).toHaveBeenCalledWith(1);
    });
    confirmSpy.mockRestore();
  });

  describe('permission gating', () => {
    it('disables New Branch / Deactivate / Delete with a tooltip when the user lacks admin:manage_branches', async () => {
      setPermissions([]); // no admin:manage_branches
      vi.mocked(listBranches).mockResolvedValue({ data: [branch()] });

      renderPage();
      await screen.findByText('Tampa Downtown');

      const newBtn = screen.getByRole('button', { name: /New Branch/i });
      expect(newBtn).toBeDisabled();
      expect(newBtn).toHaveAttribute('title', expect.stringMatching(/permission/i));
      expect(screen.getByRole('button', { name: /Deactivate/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Delete/i })).toBeDisabled();
    });

    it('enables New Branch / Deactivate / Delete when the user has admin:manage_branches', async () => {
      setPermissions(['admin:manage_branches']);
      vi.mocked(listBranches).mockResolvedValue({ data: [branch()] });

      renderPage();
      await screen.findByText('Tampa Downtown');

      expect(screen.getByRole('button', { name: /New Branch/i })).toBeEnabled();
      expect(screen.getByRole('button', { name: /Deactivate/i })).toBeEnabled();
      expect(screen.getByRole('button', { name: /Delete/i })).toBeEnabled();
    });
  });
});

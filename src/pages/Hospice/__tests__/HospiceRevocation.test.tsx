import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HospiceRevocation } from '@/pages/Hospice/HospiceRevocation';

vi.mock('@/api/hospice', () => ({
  revokeElection: vi.fn(),
}));

import { revokeElection } from '@/api/hospice';

// Mock the /me query seam so usePermission resolves synchronously without a
// QueryClientProvider. Real usePermission logic still runs against this data.
vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue({ data: { permissions } } as unknown as ReturnType<typeof useUserRoles>);
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/patients/1/hospice/5/revoke']}>
      <Routes>
        <Route
          path="/patients/:patientId/hospice/:electionId/revoke"
          element={<HospiceRevocation />}
        />
        <Route path="/patients/:patientId" element={<div>Patient Stub</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('HospiceRevocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: user holds hospice:manage so existing behaviour tests see the
    // Revoke button gated only by the acknowledgment checkboxes.
    setPermissions(['hospice:manage']);
  });

  it('disables submit until all three checkboxes are checked', async () => {
    const user = userEvent.setup();
    renderPage();
    const submit = screen.getByRole('button', { name: /Revoke Election/i });
    expect(submit).toBeDisabled();

    const checks = screen.getAllByRole('checkbox');
    expect(checks).toHaveLength(3);
    await user.click(checks[0]);
    expect(submit).toBeDisabled();
    await user.click(checks[1]);
    expect(submit).toBeDisabled();
    await user.click(checks[2]);
    expect(submit).toBeEnabled();
  });

  it('calls revokeElection on submit and navigates back', async () => {
    vi.mocked(revokeElection).mockResolvedValueOnce({
      id: 1,
      electionId: 5,
      revocationDate: '2026-06-01',
      reason: 'reason text',
      filedWithCms: false,
      filedAt: null,
    });
    const user = userEvent.setup();
    renderPage();
    for (const cb of screen.getAllByRole('checkbox')) await user.click(cb);
    await user.click(screen.getByRole('button', { name: /Revoke Election/i }));
    await waitFor(() => {
      expect(revokeElection).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ revocationDate: expect.any(String) }),
      );
      expect(screen.getByText('Patient Stub')).toBeInTheDocument();
    });
  });

  it('shows error if revokeElection rejects', async () => {
    vi.mocked(revokeElection).mockRejectedValueOnce(new Error('boom'));
    const user = userEvent.setup();
    renderPage();
    for (const cb of screen.getAllByRole('checkbox')) await user.click(cb);
    await user.click(screen.getByRole('button', { name: /Revoke Election/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  it('disables Revoke Election with a permission tooltip when the user lacks hospice:manage', async () => {
    setPermissions([]); // no hospice:manage
    const user = userEvent.setup();
    renderPage();
    // Check all acks so the only remaining blocker is the missing permission.
    for (const cb of screen.getAllByRole('checkbox')) await user.click(cb);
    const btn = screen.getByRole('button', { name: /Revoke Election/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
  });

  it('enables Revoke Election when the user has hospice:manage and all acks are checked', async () => {
    setPermissions(['hospice:manage']);
    const user = userEvent.setup();
    renderPage();
    for (const cb of screen.getAllByRole('checkbox')) await user.click(cb);
    expect(screen.getByRole('button', { name: /Revoke Election/i })).toBeEnabled();
  });
});

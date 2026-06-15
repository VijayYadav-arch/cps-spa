import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PriorAuthPage } from '@/pages/Billing/PriorAuthPage';
import type { PriorAuth } from '@/api/billing';

vi.mock('@/api/billing', () => ({
  listPriorAuths: vi.fn(),
  listExpiringPriorAuths: vi.fn(),
  submitPriorAuth: vi.fn(),
  recordPriorAuthDecision: vi.fn(),
  refreshPriorAuthStatusNow: vi.fn(),
}));

import {
  listExpiringPriorAuths,
  listPriorAuths,
  recordPriorAuthDecision,
  submitPriorAuth,
} from '@/api/billing';

// Mock the /me query seam so usePermission resolves synchronously without a
// QueryClientProvider. Real usePermission logic still runs against this data.
vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

const ALL_PERMS = ['clinical:prior_auth'];
function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue({ data: { permissions } } as unknown as ReturnType<typeof useUserRoles>);
}

function pa(over: Partial<PriorAuth> = {}): PriorAuth {
  return {
    id: 1,
    patientId: 100,
    encounterId: null,
    payerId: '00100',
    payerName: 'Medicare Part A/B',
    memberId: '1EG4-TE5-MK74',
    memberFirstName: 'Margaret',
    memberLastName: 'Doe',
    memberDob: '19400314',
    providerNpi: '1234567890',
    providerOrganizationName: 'Demo Hospice',
    serviceTypeCode: '42',
    fromDate: '2026-05-20',
    toDate: '2026-08-20',
    requestedUnits: 30,
    diagnosisCodes: ['C50.911'],
    status: 'pending',
    referenceId: 'REF-1',
    authNumber: null,
    approvedUnits: null,
    authEffectiveDate: null,
    authExpirationDate: null,
    denialReason: null,
    errorMessage: null,
    clearinghouse: 'mock',
    submittedAtUtc: '2026-05-19T12:00:00Z',
    decidedAtUtc: null,
    submittedByEmail: 'intake@x',
    lastStatusCheckedAtUtc: null,
    ...over,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <PriorAuthPage />
    </MemoryRouter>,
  );
}

describe('PriorAuthPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setPermissions(ALL_PERMS);
  });

  it('renders the prior auth list', async () => {
    vi.mocked(listPriorAuths).mockResolvedValueOnce({ data: [pa()] });
    vi.mocked(listExpiringPriorAuths).mockResolvedValueOnce({ data: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Medicare Part A/B')).toBeInTheDocument();
    });
    expect(screen.getByText(/Doe, Margaret/i)).toBeInTheDocument();
    // "pending" appears in both filter button and status badge; scope to table
    expect(screen.getByRole('table').textContent).toContain('pending');
  });

  it('shows expiring-soon banner when approvals expire within 30 days', async () => {
    vi.mocked(listPriorAuths).mockResolvedValueOnce({ data: [] });
    vi.mocked(listExpiringPriorAuths).mockResolvedValueOnce({
      data: [pa({ status: 'approved', authNumber: 'AUTH-1', authExpirationDate: '2026-06-01' })],
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/expiring within 30 days/i)).toBeInTheDocument();
    });
  });

  it('submits a new inquiry', async () => {
    const user = userEvent.setup();
    vi.mocked(listPriorAuths)
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [pa()] });
    vi.mocked(listExpiringPriorAuths).mockResolvedValue({ data: [] });
    vi.mocked(submitPriorAuth).mockResolvedValueOnce(pa());

    renderPage();
    await user.click(await screen.findByRole('button', { name: /New Inquiry/i }));
    await user.type(screen.getByLabelText(/Patient ID/i), '100');
    await user.type(screen.getByLabelText(/Member ID/i), '1EG4-TE5-MK74');
    await user.type(screen.getByLabelText(/Member First Name/i), 'Margaret');
    await user.type(screen.getByLabelText(/Member Last Name/i), 'Doe');
    await user.type(screen.getByLabelText(/Member DOB/i), '1940-03-14');
    await user.type(screen.getByLabelText(/Provider NPI/i), '1234567890');
    await user.type(screen.getByLabelText(/Provider Organization/i), 'Demo Hospice');
    await user.type(screen.getByLabelText(/From Date/i), '2026-05-20');
    await user.type(screen.getByLabelText(/To Date/i), '2026-08-20');
    await user.click(screen.getByRole('button', { name: /Submit Prior Auth/i }));

    await waitFor(() => {
      expect(submitPriorAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 100,
          payerId: '00100',
          serviceTypeCode: '42',
        }),
      );
    });
    expect(screen.getByText(/Submitted prior auth #1/i)).toBeInTheDocument();
  });

  it('approves a pending auth via prompts', async () => {
    const user = userEvent.setup();
    vi.mocked(listPriorAuths).mockResolvedValue({ data: [pa()] });
    vi.mocked(listExpiringPriorAuths).mockResolvedValue({ data: [] });
    vi.mocked(recordPriorAuthDecision).mockResolvedValueOnce(pa({ status: 'approved', authNumber: 'AUTH-123' }));

    const promptSpy = vi.spyOn(window, 'prompt')
      .mockReturnValueOnce('AUTH-123')   // authNum
      .mockReturnValueOnce('30')          // units
      .mockReturnValueOnce('2026-05-20')  // effective
      .mockReturnValueOnce('2026-08-20'); // expiration

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Approve' }));

    await waitFor(() => {
      expect(recordPriorAuthDecision).toHaveBeenCalledWith(1, expect.objectContaining({
        status: 'approved',
        authNumber: 'AUTH-123',
        approvedUnits: 30,
      }));
    });
    promptSpy.mockRestore();
  });

  it('denies a pending auth with reason', async () => {
    const user = userEvent.setup();
    vi.mocked(listPriorAuths).mockResolvedValue({ data: [pa()] });
    vi.mocked(listExpiringPriorAuths).mockResolvedValue({ data: [] });
    vi.mocked(recordPriorAuthDecision).mockResolvedValueOnce(pa({ status: 'denied' }));

    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValueOnce('Insufficient documentation');

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Deny' }));

    await waitFor(() => {
      expect(recordPriorAuthDecision).toHaveBeenCalledWith(1, expect.objectContaining({
        status: 'denied',
        denialReason: 'Insufficient documentation',
      }));
    });
    promptSpy.mockRestore();
  });

  it('hides Approve/Deny on non-pending rows', async () => {
    vi.mocked(listPriorAuths).mockResolvedValueOnce({
      data: [pa({ status: 'approved', authNumber: 'AUTH-1' })],
    });
    vi.mocked(listExpiringPriorAuths).mockResolvedValueOnce({ data: [] });
    renderPage();
    await screen.findByText('approved');
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Deny' })).not.toBeInTheDocument();
  });

  it('filters by status', async () => {
    const user = userEvent.setup();
    vi.mocked(listPriorAuths)
      .mockResolvedValueOnce({ data: [pa(), pa({ id: 2, status: 'approved', authNumber: 'A1' })] })
      .mockResolvedValueOnce({ data: [pa({ id: 2, status: 'approved', authNumber: 'A1' })] });
    vi.mocked(listExpiringPriorAuths).mockResolvedValue({ data: [] });
    renderPage();
    await screen.findByText('pending');
    await user.click(screen.getByRole('button', { name: /^approved/ }));
    await waitFor(() => {
      expect(listPriorAuths).toHaveBeenLastCalledWith('approved');
    });
  });

  describe('permission gating', () => {
    it('disables Refresh pending, Approve and Deny with tooltips when lacking clinical:prior_auth', async () => {
      setPermissions([]); // no clinical:prior_auth
      vi.mocked(listPriorAuths).mockResolvedValueOnce({ data: [pa()] });
      vi.mocked(listExpiringPriorAuths).mockResolvedValueOnce({ data: [] });
      renderPage();
      await screen.findByText('Medicare Part A/B');

      const refreshBtn = screen.getByRole('button', { name: /Refresh pending/i });
      expect(refreshBtn).toBeDisabled();
      expect(refreshBtn).toHaveAttribute('title', expect.stringMatching(/permission/i));

      const approveBtn = screen.getByRole('button', { name: 'Approve' });
      expect(approveBtn).toBeDisabled();
      expect(approveBtn).toHaveAttribute('title', expect.stringMatching(/permission/i));

      const denyBtn = screen.getByRole('button', { name: 'Deny' });
      expect(denyBtn).toBeDisabled();
      expect(denyBtn).toHaveAttribute('title', expect.stringMatching(/permission/i));
    });

    it('disables Submit Prior Auth with a tooltip when lacking clinical:prior_auth', async () => {
      setPermissions([]); // no clinical:prior_auth
      const user = userEvent.setup();
      vi.mocked(listPriorAuths).mockResolvedValueOnce({ data: [] });
      vi.mocked(listExpiringPriorAuths).mockResolvedValueOnce({ data: [] });
      renderPage();
      await user.click(await screen.findByRole('button', { name: /New Inquiry/i }));

      const btn = screen.getByRole('button', { name: /Submit Prior Auth/i });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
    });

    it('enables Approve/Deny/Refresh when the user has clinical:prior_auth', async () => {
      setPermissions(['clinical:prior_auth']);
      vi.mocked(listPriorAuths).mockResolvedValueOnce({ data: [pa()] });
      vi.mocked(listExpiringPriorAuths).mockResolvedValueOnce({ data: [] });
      renderPage();
      await screen.findByText('Medicare Part A/B');
      expect(screen.getByRole('button', { name: /Refresh pending/i })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Deny' })).toBeEnabled();
    });
  });
});

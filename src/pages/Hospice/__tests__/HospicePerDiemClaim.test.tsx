import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HospicePerDiemClaim } from '@/pages/Hospice/HospicePerDiemClaim';

vi.mock('@/api/hospice', () => ({
  getElection: vi.fn(),
  buildPerDiemClaim: vi.fn(),
}));

import { getElection, buildPerDiemClaim } from '@/api/hospice';

// Mock the /me query seam so usePermission resolves synchronously without a
// QueryClientProvider. Real usePermission logic still runs against this data.
vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

const ALL_PERMS = ['hospice:view', 'hospice:per_diem_billing'];
function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue({ data: { permissions } } as unknown as ReturnType<typeof useUserRoles>);
}

const electionFixture = {
  id: 7,
  patientId: 1,
  admissionId: null,
  electionDate: '2026-05-01',
  electionType: 'InitialElection' as const,
  lifetimeDaysAtElection: 0,
  status: 'Active' as const,
  revokedAt: null,
  currentPeriod: {
    id: 1,
    periodNumber: 1,
    startDate: '2026-05-01',
    endDate: '2026-05-31',
    status: 'Active' as const,
    recertDueDate: '2026-05-31',
    daysUntilRecertDue: 30,
    certificationId: null,
  },
  noe: null,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/patients/1/hospice/7/per-diem-claim']}>
      <Routes>
        <Route
          path="/patients/:id/hospice/:electionId/per-diem-claim"
          element={<HospicePerDiemClaim />}
        />
        <Route path="/claims/:id" element={<div>Claim Detail Stub</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('HospicePerDiemClaim', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setPermissions(ALL_PERMS);
  });

  it('shows loading then prefills date range from current period', async () => {
    vi.mocked(getElection).mockResolvedValueOnce(electionFixture);
    renderPage();
    await waitFor(() =>
      expect(screen.getByLabelText(/From/i)).toHaveValue('2026-05-01'),
    );
    expect(screen.getByLabelText(/To/i)).toHaveValue('2026-05-31');
  });

  it('on submit, calls buildPerDiemClaim and renders the draft table', async () => {
    vi.mocked(getElection).mockResolvedValueOnce(electionFixture);
    vi.mocked(buildPerDiemClaim).mockResolvedValueOnce({
      claimId: 100,
      claimNumber: 'HSP-7-20260501',
      totalCharges: 6000,
      lines: [
        {
          levelOfCare: 'RoutineHomeCare',
          tier: 'RoutineTier1Days1To60',
          revenueCode: '0651',
          units: 30,
          unitAmount: 200,
          lineCharges: 6000,
          serviceDateFrom: '2026-05-01',
          serviceDateTo: '2026-05-30',
        },
      ],
      attendanceDayIds: Array.from({ length: 30 }, (_, i) => i + 1),
      warnings: [],
      typeOfBill: '0811',
      isFinalClaim: false,
    });

    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /Build Per-Diem Claim/i }));
    await user.click(screen.getByRole('button', { name: /Build Per-Diem Claim/i }));

    await waitFor(() => expect(buildPerDiemClaim).toHaveBeenCalled());
    expect(screen.getByText('HSP-7-20260501', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('0651')).toBeInTheDocument();
    expect(screen.getByText('30 attendance day(s)', { exact: false })).toBeInTheDocument();
  });

  it('shows warning banner when builder returns warnings', async () => {
    vi.mocked(getElection).mockResolvedValueOnce(electionFixture);
    vi.mocked(buildPerDiemClaim).mockResolvedValueOnce({
      claimId: 100,
      claimNumber: 'HSP-7-20260501',
      totalCharges: 3500,
      lines: [],
      attendanceDayIds: [1, 2, 3, 4, 5, 6, 7],
      warnings: ['Inpatient Respite Care exceeds the 5-day consecutive cap (longest run: 7 days).'],
      typeOfBill: '0811',
      isFinalClaim: false,
    });

    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /Build Per-Diem Claim/i }));
    await user.click(screen.getByRole('button', { name: /Build Per-Diem Claim/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/longest run: 7/),
    );
  });

  it('View Claim button navigates to /claims/:id', async () => {
    vi.mocked(getElection).mockResolvedValueOnce(electionFixture);
    vi.mocked(buildPerDiemClaim).mockResolvedValueOnce({
      claimId: 100,
      claimNumber: 'HSP-7-20260501',
      totalCharges: 1000,
      lines: [],
      attendanceDayIds: [1],
      warnings: [],
      typeOfBill: '0811',
      isFinalClaim: false,
    });

    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /Build Per-Diem Claim/i }));
    await user.click(screen.getByRole('button', { name: /Build Per-Diem Claim/i }));
    await waitFor(() => screen.getByRole('button', { name: /View Claim/i }));
    await user.click(screen.getByRole('button', { name: /View Claim/i }));

    expect(screen.getByText('Claim Detail Stub')).toBeInTheDocument();
  });

  it('shows error banner when build rejects', async () => {
    vi.mocked(getElection).mockResolvedValueOnce(electionFixture);
    vi.mocked(buildPerDiemClaim).mockRejectedValueOnce(new Error('No unbilled days'));

    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /Build Per-Diem Claim/i }));
    await user.click(screen.getByRole('button', { name: /Build Per-Diem Claim/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('No unbilled days'),
    );
  });

  describe('permission gating', () => {
    it('disables Build Per-Diem Claim with a permission tooltip when the user lacks hospice:per_diem_billing', async () => {
      setPermissions(['hospice:view']); // no hospice:per_diem_billing
      vi.mocked(getElection).mockResolvedValueOnce(electionFixture);
      renderPage();
      const btn = await screen.findByRole('button', { name: /Build Per-Diem Claim/i });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
    });

    it('enables Build Per-Diem Claim when the user has hospice:per_diem_billing', async () => {
      setPermissions(['hospice:view', 'hospice:per_diem_billing']);
      vi.mocked(getElection).mockResolvedValueOnce(electionFixture);
      renderPage();
      const btn = await screen.findByRole('button', { name: /Build Per-Diem Claim/i });
      expect(btn).toBeEnabled();
    });
  });
});

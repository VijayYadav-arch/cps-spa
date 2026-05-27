import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HospiceElectionDetail } from '@/pages/Hospice/HospiceElectionDetail';

vi.mock('@/api/hospice', () => ({
  getElection: vi.fn(),
  submitNoe: vi.fn(),
}));

vi.mock('@/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { getElection, submitNoe } from '@/api/hospice';
import { useAuth } from '@/auth/useAuth';

const fixture = {
  id: 1,
  patientId: 1,
  admissionId: null,
  electionDate: '2026-05-15',
  electionType: 'InitialElection' as const,
  lifetimeDaysAtElection: 0,
  status: 'Active' as const,
  revokedAt: null,
  currentPeriod: {
    id: 10,
    periodNumber: 1,
    startDate: '2026-05-15',
    endDate: '2026-08-12',
    status: 'Active' as const,
    recertDueDate: '2026-07-28',
    daysUntilRecertDue: 74,
    certificationId: null,
  },
  noe: {
    id: 5,
    status: 'Pending' as const,
    deadlineDate: '2026-05-20',
    daysUntilDeadline: 5,
    submittedAt: null,
    documentUrl: null,
    clearinghouseConfirmation: null,
    payerCode: 'MEDICARE_A',
  },
};

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/patients/1/hospice/1']}>
      <Routes>
        <Route
          path="/patients/:patientId/hospice/:electionId"
          element={<HospiceElectionDetail />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

function mockAuth(roles: string[] = []) {
  vi.mocked(useAuth).mockReturnValue({
    auth: { isAuthenticated: true, user: { userId: 1, organizationId: 1, roles } },
    loginWithSSO: vi.fn(),
    logout: vi.fn(),
  });
}

describe('HospiceElectionDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  it('shows loading state initially', () => {
    vi.mocked(getElection).mockReturnValue(new Promise(() => {}));
    renderDetail();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders period and NOE cards when loaded', async () => {
    vi.mocked(getElection).mockResolvedValueOnce(fixture);
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText(/Benefit Period 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Notice of Election/i)).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  it('shows error when API rejects', async () => {
    vi.mocked(getElection).mockRejectedValueOnce(new Error('not found'));
    renderDetail();
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  it('Submit NOE button opens modal and calls submitNoe', async () => {
    vi.mocked(getElection).mockResolvedValue(fixture);
    vi.mocked(submitNoe).mockResolvedValueOnce({
      ...fixture.noe,
      status: 'ManualOverride',
    });
    const user = userEvent.setup();
    renderDetail();
    await waitFor(() => screen.getByText(/Submit NOE/i));
    await user.click(screen.getByRole('button', { name: /Submit NOE/i }));
    await user.click(screen.getByRole('button', { name: /Manual/i }));
    const urlInput = screen.getByLabelText(/Document URL/i);
    await user.type(urlInput, 'https://example.com/noe.pdf');
    await user.click(screen.getByRole('button', { name: /Confirm Submission/i }));
    await waitFor(() => expect(submitNoe).toHaveBeenCalled());
  });

  it('shows Discharge Patient button when user has physician role AND election status is Active', async () => {
    mockAuth(['physician']);
    vi.mocked(getElection).mockResolvedValueOnce(fixture);
    renderDetail();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Discharge Patient/i })).toBeInTheDocument();
    });
  });

  it('does not show Discharge Patient button when user lacks hospice:discharge_manage role', async () => {
    mockAuth(['billing_admin']);
    vi.mocked(getElection).mockResolvedValueOnce(fixture);
    renderDetail();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Discharge Patient/i })).not.toBeInTheDocument();
    });
  });

  it('shows Discharged section with link when election status is Discharged', async () => {
    const dischargedFixture = { ...fixture, status: 'Discharged' as const };
    vi.mocked(getElection).mockResolvedValueOnce(dischargedFixture);
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText(/This election has been discharged/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /View discharge details/i })).toBeInTheDocument();
    });
  });
});

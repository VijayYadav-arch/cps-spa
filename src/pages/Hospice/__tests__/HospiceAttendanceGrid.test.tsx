import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HospiceAttendanceGrid } from '@/pages/Hospice/HospiceAttendanceGrid';

vi.mock('@/api/hospice', () => ({
  getElection: vi.fn(),
  getAttendance: vi.fn(),
  recordAttendance: vi.fn(),
}));

import { getElection, getAttendance, recordAttendance } from '@/api/hospice';

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
    endDate: '2026-05-05',
    status: 'Active' as const,
    recertDueDate: '2026-05-05',
    daysUntilRecertDue: 5,
    certificationId: null,
  },
  noe: null,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/patients/1/hospice/7/attendance']}>
      <Routes>
        <Route
          path="/patients/:id/hospice/:electionId/attendance"
          element={<HospiceAttendanceGrid />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('HospiceAttendanceGrid', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows loading state initially', () => {
    vi.mocked(getElection).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders one cell per day in the period', async () => {
    vi.mocked(getElection).mockResolvedValueOnce(electionFixture);
    vi.mocked(getAttendance).mockResolvedValueOnce({ data: [], total: 0 });

    renderPage();
    await waitFor(() => {
      // 5 days (May 1-5) — 5 cells; each shows the day-month suffix (e.g. "05-01")
      expect(screen.getByText('05-01')).toBeInTheDocument();
      expect(screen.getByText('05-05')).toBeInTheDocument();
    });
  });

  it('color-codes cells using HospiceLevelOfCareBadge when day exists', async () => {
    vi.mocked(getElection).mockResolvedValueOnce(electionFixture);
    vi.mocked(getAttendance).mockResolvedValueOnce({
      data: [
        {
          id: 11,
          hospiceElectionId: 7,
          serviceDate: '2026-05-02',
          levelOfCare: 'GeneralInpatient' as const,
          chcHoursOfCare: null,
          primaryNurseUserId: null,
          facilityName: null,
          notes: null,
          claimId: null,
          recordedAt: '2026-05-02T00:00:00Z',
          recordedByUserId: 99,
        },
      ],
      total: 1,
    });

    renderPage();
    await waitFor(() => {
      const badge = screen.getByText('Inpatient');
      expect(badge).toHaveAttribute('data-loc', 'GeneralInpatient');
    });
  });

  it('clicking a day cell opens the attendance form modal', async () => {
    vi.mocked(getElection).mockResolvedValueOnce(electionFixture);
    vi.mocked(getAttendance).mockResolvedValueOnce({ data: [], total: 0 });

    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('05-03'));
    await user.click(screen.getByText('05-03').closest('button')!);

    expect(screen.getByRole('dialog', { name: /Attendance Day Form/i })).toBeInTheDocument();
    expect(screen.getByText(/Attendance for 2026-05-03/)).toBeInTheDocument();
  });

  it('after form submit, calls recordAttendance and reloads', async () => {
    vi.mocked(getElection)
      .mockResolvedValueOnce(electionFixture)
      .mockResolvedValueOnce(electionFixture);
    vi.mocked(getAttendance)
      .mockResolvedValueOnce({ data: [], total: 0 })
      .mockResolvedValueOnce({ data: [], total: 0 });
    vi.mocked(recordAttendance).mockResolvedValueOnce({} as never);

    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('05-02'));
    await user.click(screen.getByText('05-02').closest('button')!);
    await user.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => expect(recordAttendance).toHaveBeenCalled());
    // The dialog should close after success
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /Attendance Day Form/i })).not.toBeInTheDocument(),
    );
  });

  it('shows error when API rejects', async () => {
    vi.mocked(getElection).mockRejectedValueOnce(new Error('boom'));

    renderPage();
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});

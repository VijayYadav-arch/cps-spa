import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HospiceElectionWizard } from '@/pages/Hospice/HospiceElectionWizard';

vi.mock('@/api/hospice', () => ({
  createElection: vi.fn(),
}));

import { createElection } from '@/api/hospice';

function renderWizard(patientId = '1') {
  return render(
    <MemoryRouter initialEntries={[`/patients/${patientId}/hospice/new`]}>
      <Routes>
        <Route path="/patients/:id/hospice/new" element={<HospiceElectionWizard />} />
        <Route
          path="/patients/:id/hospice/:electionId"
          element={<div>Election Detail Stub</div>}
        />
        <Route path="/patients/:id" element={<div>Patient Detail Stub</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('HospiceElectionWizard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders Step 1 (Election Date) by default', () => {
    renderWizard();
    expect(
      screen.getByRole('heading', { name: /Step 1/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Election Date/i)).toBeInTheDocument();
  });

  it('advances to Step 2 when Next is clicked', async () => {
    const user = userEvent.setup();
    renderWizard();
    await user.click(screen.getByRole('button', { name: /Next/i }));
    expect(
      screen.getByRole('heading', { name: /Step 2/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Payer/i)).toBeInTheDocument();
  });

  it('submits createElection on confirm and navigates to detail page', async () => {
    vi.mocked(createElection).mockResolvedValueOnce({
      id: 42,
      patientId: 1,
      admissionId: null,
      electionDate: '2026-05-15',
      electionType: 'InitialElection',
      lifetimeDaysAtElection: 0,
      status: 'Active',
      revokedAt: null,
      currentPeriod: null,
      noe: null,
    });
    const user = userEvent.setup();
    renderWizard();
    await user.click(screen.getByRole('button', { name: /Next/i }));
    await user.click(screen.getByRole('button', { name: /Next/i }));
    await user.click(screen.getByRole('button', { name: /Confirm/i }));
    await waitFor(() => {
      expect(createElection).toHaveBeenCalled();
      expect(screen.getByText('Election Detail Stub')).toBeInTheDocument();
    });
  });

  it('shows error banner if createElection rejects', async () => {
    vi.mocked(createElection).mockRejectedValueOnce(new Error('boom'));
    const user = userEvent.setup();
    renderWizard();
    await user.click(screen.getByRole('button', { name: /Next/i }));
    await user.click(screen.getByRole('button', { name: /Next/i }));
    await user.click(screen.getByRole('button', { name: /Confirm/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  it('Cancel button navigates back to patient detail', async () => {
    const user = userEvent.setup();
    renderWizard();
    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(screen.getByText('Patient Detail Stub')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HospiceHopeForm } from '@/pages/Hospice/HospiceHopeForm';

vi.mock('@/api/hospice', () => ({
  startHopeAssessment: vi.fn(),
  getHopeAssessment: vi.fn(),
  updateHopePayload: vi.fn(),
  signHopeAssessment: vi.fn(),
  submitHopeAssessment: vi.fn(),
}));

import { startHopeAssessment, getHopeAssessment } from '@/api/hospice';

function renderNewForm() {
  return render(
    <MemoryRouter initialEntries={['/patients/1/hospice/7/hope']}>
      <Routes>
        <Route path="/patients/:id/hospice/:electionId/hope" element={<HospiceHopeForm />} />
        <Route
          path="/patients/:id/hospice/:electionId/hope/:assessmentId"
          element={<HospiceHopeForm />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('HospiceHopeForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for the post-create remount that loads the just-created assessment.
    vi.mocked(getHopeAssessment).mockReturnValue(new Promise(() => {}));
  });

  it('renders new-assessment form by default', () => {
    renderNewForm();
    expect(screen.getByLabelText(/Submission Type/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start HOPE Assessment/i })).toBeInTheDocument();
  });

  it('Start HOPE button calls startHopeAssessment with current form state', async () => {
    vi.mocked(startHopeAssessment).mockResolvedValueOnce({
      id: 99,
      hospiceElectionId: 7,
      submissionType: 'Admission',
      targetDate: '2026-05-01',
      status: 'Draft',
      payload: '{}',
      schemaVersion: 'HOPE-1.0',
      signedByUserId: null,
      signedAt: null,
      submittedAt: null,
      cmsConfirmation: null,
      rejectionReason: null,
      deadlineDate: '2026-05-06',
      daysUntilDeadline: 5,
      createdAt: '2026-05-01T00:00:00Z',
    });
    const user = userEvent.setup();
    renderNewForm();
    await user.click(screen.getByRole('button', { name: /Start HOPE Assessment/i }));
    await waitFor(() =>
      expect(startHopeAssessment).toHaveBeenCalledWith(7, expect.objectContaining({
        submissionType: 'Admission',
      })),
    );
  });
});

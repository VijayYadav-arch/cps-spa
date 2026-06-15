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

// Mock the /me query seam so usePermission resolves synchronously without a
// QueryClientProvider. Real usePermission logic still runs against this data.
vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

const ALL_PERMS = ['hospice:view', 'hospice:clinical_assessment'];
function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue({ data: { permissions } } as unknown as ReturnType<typeof useUserRoles>);
}

function hopeAssessment(over: Record<string, unknown> = {}) {
  return {
    id: 99,
    hospiceElectionId: 7,
    submissionType: 'Admission' as const,
    targetDate: '2026-05-01',
    status: 'Draft' as const,
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
    ...over,
  };
}

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

function renderExistingForm() {
  return render(
    <MemoryRouter initialEntries={['/patients/1/hospice/7/hope/99']}>
      <Routes>
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
    setPermissions(ALL_PERMS);
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

  describe('permission gating', () => {
    it('disables Start HOPE Assessment with a tooltip when the user lacks hospice:clinical_assessment', () => {
      setPermissions(['hospice:view']); // no hospice:clinical_assessment
      renderNewForm();
      const btn = screen.getByRole('button', { name: /Start HOPE Assessment/i });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
    });

    it('enables Start HOPE Assessment when the user has hospice:clinical_assessment', () => {
      setPermissions(['hospice:view', 'hospice:clinical_assessment']);
      renderNewForm();
      expect(screen.getByRole('button', { name: /Start HOPE Assessment/i })).toBeEnabled();
    });

    it('disables Save Payload and Sign for a Draft assessment when the user lacks hospice:clinical_assessment', async () => {
      setPermissions(['hospice:view']); // no hospice:clinical_assessment
      vi.mocked(getHopeAssessment).mockResolvedValueOnce(hopeAssessment({ status: 'Draft' }));
      renderExistingForm();

      const save = await screen.findByRole('button', { name: /Save Payload/i });
      const sign = screen.getByRole('button', { name: /^Sign$/i });
      expect(save).toBeDisabled();
      expect(save).toHaveAttribute('title', expect.stringMatching(/permission/i));
      expect(sign).toBeDisabled();
      expect(sign).toHaveAttribute('title', expect.stringMatching(/permission/i));
    });

    it('disables Submit to CMS for a Signed assessment when the user lacks hospice:clinical_assessment', async () => {
      setPermissions(['hospice:view']); // no hospice:clinical_assessment
      vi.mocked(getHopeAssessment).mockResolvedValueOnce(hopeAssessment({ status: 'Signed' }));
      renderExistingForm();

      const submit = await screen.findByRole('button', { name: /Submit to CMS/i });
      expect(submit).toBeDisabled();
      expect(submit).toHaveAttribute('title', expect.stringMatching(/permission/i));
    });

    it('enables Save Payload and Sign for a Draft assessment when the user has hospice:clinical_assessment', async () => {
      setPermissions(['hospice:view', 'hospice:clinical_assessment']);
      vi.mocked(getHopeAssessment).mockResolvedValueOnce(hopeAssessment({ status: 'Draft' }));
      renderExistingForm();

      const save = await screen.findByRole('button', { name: /Save Payload/i });
      expect(save).toBeEnabled();
      expect(screen.getByRole('button', { name: /^Sign$/i })).toBeEnabled();
    });
  });
});

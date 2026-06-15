import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HospiceCertificationSignPanel } from '@/pages/Hospice/HospiceCertificationSignPanel';

vi.mock('@/api/hospice', () => ({
  listCertificationsByElection: vi.fn(),
  signCertification: vi.fn(),
  countersignCertification: vi.fn(),
}));

import {
  listCertificationsByElection,
  signCertification,
  countersignCertification,
} from '@/api/hospice';

// Mock the /me query seam so usePermission resolves synchronously without a
// QueryClientProvider. Real usePermission logic still runs against this data.
vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

const ALL_PERMS = ['hospice:view', 'hospice:clinical_assessment'];
function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue({ data: { permissions } } as unknown as ReturnType<typeof useUserRoles>);
}

const draftCert = {
  id: 9,
  electionId: 7,
  periodId: 1,
  certifyingPhysicianId: 100,
  status: 'Draft' as const,
  signedAt: null,
  narrativeText: 'Patient meets terminal prognosis.',
  createdAt: '2026-05-01T00:00:00Z',
};

const signedCert = {
  id: 9,
  electionId: 7,
  periodId: 1,
  certifyingPhysicianId: 100,
  status: 'Signed' as const,
  signedAt: '2026-05-10T00:00:00Z',
  narrativeText: null,
  createdAt: '2026-05-01T00:00:00Z',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/patients/1/hospice/7/certifications/9']}>
      <Routes>
        <Route
          path="/patients/:id/hospice/:electionId/certifications/:certId"
          element={<HospiceCertificationSignPanel />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('HospiceCertificationSignPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setPermissions(ALL_PERMS);
  });

  it('shows Sign button when status is Draft', async () => {
    vi.mocked(listCertificationsByElection).mockResolvedValueOnce({
      data: [
        {
          id: 9,
          electionId: 7,
          periodId: 1,
          certifyingPhysicianId: 100,
          status: 'Draft',
          signedAt: null,
          narrativeText: 'Patient meets terminal prognosis.',
          createdAt: '2026-05-01T00:00:00Z',
        },
      ],
    });

    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /^Sign$/i }));

    vi.mocked(signCertification).mockResolvedValueOnce({
      id: 9, electionId: 7, periodId: 1, certifyingPhysicianId: 100,
      status: 'Signed', signedAt: '2026-05-18T12:00:00Z',
      narrativeText: 'x', createdAt: '2026-05-01T00:00:00Z',
    });
    await user.click(screen.getByRole('button', { name: /^Sign$/i }));
    await waitFor(() => expect(signCertification).toHaveBeenCalledWith(9));
  });

  it('shows Countersign control when status is Signed and rejects empty physician id', async () => {
    vi.mocked(listCertificationsByElection).mockResolvedValueOnce({
      data: [
        {
          id: 9, electionId: 7, periodId: 1, certifyingPhysicianId: 100,
          status: 'Signed', signedAt: '2026-05-10T00:00:00Z',
          narrativeText: null, createdAt: '2026-05-01T00:00:00Z',
        },
      ],
    });
    vi.mocked(countersignCertification).mockResolvedValueOnce({
      id: 9, electionId: 7, periodId: 1, certifyingPhysicianId: 100,
      status: 'Countersigned', signedAt: '2026-05-10T00:00:00Z',
      narrativeText: null, createdAt: '2026-05-01T00:00:00Z',
    });

    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /Countersign/i }));
    await user.type(screen.getByLabelText(/physician user id/i), '200');
    await user.click(screen.getByRole('button', { name: /Countersign/i }));
    await waitFor(() => expect(countersignCertification).toHaveBeenCalledWith(9, 200));
  });

  it('shows "fully countersigned" message when status is Countersigned', async () => {
    vi.mocked(listCertificationsByElection).mockResolvedValueOnce({
      data: [
        {
          id: 9, electionId: 7, periodId: 1, certifyingPhysicianId: 100,
          status: 'Countersigned', signedAt: '2026-05-10T00:00:00Z',
          narrativeText: null, createdAt: '2026-05-01T00:00:00Z',
        },
      ],
    });

    renderPage();
    await waitFor(() => expect(screen.getByText(/fully countersigned/i)).toBeInTheDocument());
  });

  describe('permission gating', () => {
    it('disables Sign with a permission tooltip when the user lacks hospice:clinical_assessment', async () => {
      setPermissions(['hospice:view']); // no hospice:clinical_assessment
      vi.mocked(listCertificationsByElection).mockResolvedValueOnce({ data: [draftCert] });
      renderPage();
      const btn = await screen.findByRole('button', { name: /^Sign$/i });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
    });

    it('enables Sign when the user has hospice:clinical_assessment', async () => {
      setPermissions(['hospice:view', 'hospice:clinical_assessment']);
      vi.mocked(listCertificationsByElection).mockResolvedValueOnce({ data: [draftCert] });
      renderPage();
      const btn = await screen.findByRole('button', { name: /^Sign$/i });
      expect(btn).toBeEnabled();
    });

    it('disables Countersign with a permission tooltip when the user lacks hospice:clinical_assessment', async () => {
      setPermissions(['hospice:view']); // no hospice:clinical_assessment
      vi.mocked(listCertificationsByElection).mockResolvedValueOnce({ data: [signedCert] });
      renderPage();
      const btn = await screen.findByRole('button', { name: /Countersign/i });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
    });
  });
});

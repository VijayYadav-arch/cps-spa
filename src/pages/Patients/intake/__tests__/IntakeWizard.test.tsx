import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { IntakeWizard } from '@/pages/Patients/intake/IntakeWizard';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/pages/Patients/intake/intakeApi', () => ({
  intakeApi: {
    getMyOpenDraft: vi.fn(),
    createDraft: vi.fn(),
    updateDraft: vi.fn(),
    deleteDraft: vi.fn(),
    submitFinal: vi.fn(),
    getDraftById: vi.fn(),
  },
}));

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { data: [{ id: 7, name: 'Acme Hospice' }] } }),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { intakeApi } from '@/pages/Patients/intake/intakeApi';

// Mock the /me query seam so usePermission resolves synchronously without a
// QueryClientProvider. Real usePermission logic still runs against this data.
vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

const ALL_PERMS = ['patients:view', 'patients:create', 'patients:intake'];
function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue({ data: { permissions } } as unknown as ReturnType<typeof useUserRoles>);
}

function renderWizard() {
  return render(
    <MemoryRouter>
      <IntakeWizard />
    </MemoryRouter>
  );
}

describe('IntakeWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
    // Default: user holds every permission the wizard uses so existing
    // behaviour tests see enabled buttons. Permission-gating tests override.
    setPermissions(ALL_PERMS);
  });

  it('renders DraftResumeBanner when an open draft exists', async () => {
    vi.mocked(intakeApi.getMyOpenDraft).mockResolvedValueOnce({
      id: 99,
      ownerUserId: 'u1',
      organizationId: 7,
      currentStep: 3,
      formJson: JSON.stringify({ firstName: 'Jane', lastName: 'Doe' }),
      createdAt: '2026-06-01T00:00:00Z',
      updatedAt: '2026-06-02T00:00:00Z',
      completedAt: null,
    });
    renderWizard();
    expect(await screen.findByText(/resume in-progress intake/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resume draft/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /discard and start fresh/i })).toBeInTheDocument();
  });

  it('renders step 1 directly when no open draft exists', async () => {
    vi.mocked(intakeApi.getMyOpenDraft).mockResolvedValueOnce(null);
    renderWizard();
    expect(await screen.findByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.queryByText(/resume in-progress intake/i)).not.toBeInTheDocument();
    expect(screen.getByText(/step 1 of 5/i)).toBeInTheDocument();
  });

  it('refuses to advance from step 1 when required fields are empty', async () => {
    vi.mocked(intakeApi.getMyOpenDraft).mockResolvedValueOnce(null);
    const user = userEvent.setup();
    renderWizard();
    await screen.findByLabelText(/first name/i);

    await user.click(screen.getByRole('button', { name: /next/i }));

    // Validation errors render; step does NOT advance.
    expect(await screen.findAllByText('Required')).toHaveLength(3);
    expect(screen.getByText(/step 1 of 5/i)).toBeInTheDocument();
    expect(intakeApi.createDraft).not.toHaveBeenCalled();
    expect(intakeApi.updateDraft).not.toHaveBeenCalled();
  });

  it('advances to step 2 and persists draft when required fields are filled', async () => {
    vi.mocked(intakeApi.getMyOpenDraft).mockResolvedValueOnce(null);
    vi.mocked(intakeApi.createDraft).mockResolvedValueOnce({
      id: 42,
      ownerUserId: 'u1',
      organizationId: 7,
      currentStep: 1,
      formJson: '{}',
      createdAt: '2026-06-02T00:00:00Z',
      updatedAt: '2026-06-02T00:00:00Z',
      completedAt: null,
    });
    vi.mocked(intakeApi.updateDraft).mockResolvedValueOnce({
      id: 42,
      ownerUserId: 'u1',
      organizationId: 7,
      currentStep: 2,
      formJson: '{}',
      createdAt: '2026-06-02T00:00:00Z',
      updatedAt: '2026-06-02T00:00:00Z',
      completedAt: null,
    });

    const user = userEvent.setup();
    renderWizard();

    // Wait for Step 1 to render and for organizations dropdown to populate.
    const orgSelect = await screen.findByLabelText(/organization/i);
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /acme hospice/i })).toBeInTheDocument();
    });
    await user.selectOptions(orgSelect, '7');
    await user.type(screen.getByLabelText(/first name/i), 'Jane');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');

    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(intakeApi.createDraft).toHaveBeenCalledWith(7);
    });
    await waitFor(() => {
      expect(intakeApi.updateDraft).toHaveBeenCalledWith(
        42,
        2,
        expect.objectContaining({ organizationId: '7', firstName: 'Jane', lastName: 'Doe' })
      );
    });
    expect(await screen.findByText(/step 2 of 5/i)).toBeInTheDocument();
  });

  it('skips step 5 when admissionType is not hospice; submit appears on step 4', async () => {
    vi.mocked(intakeApi.getMyOpenDraft).mockResolvedValueOnce({
      id: 7,
      ownerUserId: 'u1',
      organizationId: 7,
      currentStep: 4,
      formJson: JSON.stringify({
        organizationId: '7',
        firstName: 'Joe',
        lastName: 'Smith',
        admissionType: 'palliative',
        admittedAt: '2026-06-02',
      }),
      createdAt: '2026-06-01T00:00:00Z',
      updatedAt: '2026-06-02T00:00:00Z',
      completedAt: null,
    });

    const user = userEvent.setup();
    renderWizard();

    await user.click(await screen.findByRole('button', { name: /resume draft/i }));

    // Now on step 4. With non-hospice admissionType, totalSteps = 4, so the final
    // "Complete intake" button is visible (not "Next").
    expect(await screen.findByText(/step 4 of 4/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /complete intake/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^next$/i })).not.toBeInTheDocument();
  });

  it('auto-computes effectiveTo when effectiveFrom changes (BP=1 → +90 days)', async () => {
    vi.mocked(intakeApi.getMyOpenDraft).mockResolvedValueOnce({
      id: 8,
      ownerUserId: 'u1',
      organizationId: 7,
      currentStep: 5,
      formJson: JSON.stringify({
        organizationId: '7',
        firstName: 'Jane',
        lastName: 'Doe',
        admissionType: 'hospice',
        admittedAt: '2026-01-01',
        benefitPeriod: '1',
        effectiveFrom: '',
        effectiveTo: '',
      }),
      createdAt: '2026-06-01T00:00:00Z',
      updatedAt: '2026-06-02T00:00:00Z',
      completedAt: null,
    });

    const user = userEvent.setup();
    renderWizard();
    await user.click(await screen.findByRole('button', { name: /resume draft/i }));

    const effectiveFrom = await screen.findByLabelText(/effective from/i);
    await act(async () => {
      await user.clear(effectiveFrom);
      await user.type(effectiveFrom, '2026-01-01');
    });

    // Mirror the wizard's autoCalcEffectiveTo algorithm so the assertion is
    // robust to test-runner timezone (the algorithm uses Date#setDate then
    // toISOString().split('T')[0], which can shift a day under non-UTC TZ).
    function expectedTo(bp: number, from: string): string {
      const d = new Date(from);
      d.setDate(d.getDate() + (bp === 1 || bp === 2 ? 90 : 60));
      return d.toISOString().split('T')[0];
    }

    const effectiveTo = screen.getByLabelText(/effective to/i) as HTMLInputElement;
    await waitFor(() => {
      // benefitPeriod=1 => +90 days
      expect(effectiveTo.value).toBe(expectedTo(1, '2026-01-01'));
    });
    // Sanity: value is non-empty (i.e., auto-calc actually ran).
    expect(effectiveTo.value).not.toBe('');
  });

  it('auto-computes effectiveTo when benefitPeriod changes on step 4 (BP=3 → +60 days)', async () => {
    vi.mocked(intakeApi.getMyOpenDraft).mockResolvedValueOnce({
      id: 9,
      ownerUserId: 'u1',
      organizationId: 7,
      currentStep: 4,
      formJson: JSON.stringify({
        organizationId: '7',
        firstName: 'Jane',
        lastName: 'Doe',
        admissionType: 'hospice',
        admittedAt: '2026-01-01',
        benefitPeriod: '1',
        effectiveFrom: '2026-01-01',
        effectiveTo: '',
      }),
      createdAt: '2026-06-01T00:00:00Z',
      updatedAt: '2026-06-02T00:00:00Z',
      completedAt: null,
    });

    const user = userEvent.setup();
    renderWizard();
    await user.click(await screen.findByRole('button', { name: /resume draft/i }));

    const bp = await screen.findByLabelText(/benefit period/i);
    await user.selectOptions(bp, '3');

    function expectedTo(bpVal: number, from: string): string {
      const d = new Date(from);
      d.setDate(d.getDate() + (bpVal === 1 || bpVal === 2 ? 90 : 60));
      return d.toISOString().split('T')[0];
    }

    // benefit period change triggers auto-calc; effectiveTo is on step 5 — the
    // wizard's form state is still updated, but the field is not visible. Advance
    // to step 5 to assert. Wizard's advanceStep persists draft + advances.
    vi.mocked(intakeApi.createDraft).mockResolvedValueOnce({
      id: 9,
      ownerUserId: 'u1',
      organizationId: 7,
      currentStep: 4,
      formJson: '{}',
      createdAt: '2026-06-02T00:00:00Z',
      updatedAt: '2026-06-02T00:00:00Z',
      completedAt: null,
    });
    vi.mocked(intakeApi.updateDraft).mockResolvedValueOnce({
      id: 9,
      ownerUserId: 'u1',
      organizationId: 7,
      currentStep: 5,
      formJson: '{}',
      createdAt: '2026-06-02T00:00:00Z',
      updatedAt: '2026-06-02T00:00:00Z',
      completedAt: null,
    });
    await user.click(screen.getByRole('button', { name: /next/i }));

    const effectiveTo = (await screen.findByLabelText(/effective to/i)) as HTMLInputElement;
    expect(effectiveTo.value).toBe(expectedTo(3, '2026-01-01'));
  });

  it('on final submit: calls submitFinal, deletes draft, navigates to /patients/:id', async () => {
    vi.mocked(intakeApi.getMyOpenDraft).mockResolvedValueOnce({
      id: 12,
      ownerUserId: 'u1',
      organizationId: 7,
      currentStep: 5,
      formJson: JSON.stringify({
        organizationId: '7',
        firstName: 'Jane',
        lastName: 'Doe',
        admissionType: 'hospice',
        admittedAt: '2026-06-02',
        certifiedByName: 'Dr. Smith',
        effectiveFrom: '2026-06-02',
        effectiveTo: '2026-08-31',
        benefitPeriod: '1',
      }),
      createdAt: '2026-06-01T00:00:00Z',
      updatedAt: '2026-06-02T00:00:00Z',
      completedAt: null,
    });
    vi.mocked(intakeApi.submitFinal).mockResolvedValueOnce({ id: 555 });
    vi.mocked(intakeApi.deleteDraft).mockResolvedValueOnce(undefined);

    const user = userEvent.setup();
    renderWizard();
    await user.click(await screen.findByRole('button', { name: /resume draft/i }));

    await user.click(await screen.findByRole('button', { name: /complete intake/i }));

    await waitFor(() => {
      expect(intakeApi.submitFinal).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(intakeApi.deleteDraft).toHaveBeenCalledWith(12);
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/patients/555');
    });
  });

  describe('permission gating', () => {
    // A non-hospice draft on its final step (4) so "Complete intake" is visible.
    const finalDraft = {
      id: 30,
      ownerUserId: 'u1',
      organizationId: 7,
      currentStep: 4,
      formJson: JSON.stringify({
        organizationId: '7',
        firstName: 'Joe',
        lastName: 'Smith',
        admissionType: 'palliative',
        admittedAt: '2026-06-02',
      }),
      createdAt: '2026-06-01T00:00:00Z',
      updatedAt: '2026-06-02T00:00:00Z',
      completedAt: null,
    };

    async function renderOnFinalStep() {
      vi.mocked(intakeApi.getMyOpenDraft).mockResolvedValueOnce(finalDraft);
      const user = userEvent.setup();
      renderWizard();
      await user.click(await screen.findByRole('button', { name: /resume draft/i }));
      await screen.findByText(/step 4 of 4/i);
    }

    it('disables Complete intake with a permission tooltip when the user lacks patients:create', async () => {
      setPermissions(['patients:view', 'patients:intake']); // no patients:create
      await renderOnFinalStep();

      const btn = screen.getByRole('button', { name: /complete intake/i });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
    });

    it('disables Complete intake when the user lacks patients:intake', async () => {
      setPermissions(['patients:view', 'patients:create']); // no patients:intake
      await renderOnFinalStep();

      expect(screen.getByRole('button', { name: /complete intake/i })).toBeDisabled();
    });

    it('enables Complete intake when the user has both patients:create and patients:intake', async () => {
      setPermissions(['patients:view', 'patients:create', 'patients:intake']);
      await renderOnFinalStep();

      expect(screen.getByRole('button', { name: /complete intake/i })).toBeEnabled();
    });

    it('disables Next (draft save) with a permission tooltip when the user lacks patients:intake', async () => {
      setPermissions(['patients:view', 'patients:create']); // no patients:intake
      vi.mocked(intakeApi.getMyOpenDraft).mockResolvedValueOnce(null);
      renderWizard();
      await screen.findByLabelText(/first name/i);

      const btn = screen.getByRole('button', { name: /^next$/i });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
    });

    it('enables Next when the user has patients:intake', async () => {
      setPermissions(['patients:view', 'patients:intake']);
      vi.mocked(intakeApi.getMyOpenDraft).mockResolvedValueOnce(null);
      renderWizard();
      await screen.findByLabelText(/first name/i);

      expect(screen.getByRole('button', { name: /^next$/i })).toBeEnabled();
    });
  });
});

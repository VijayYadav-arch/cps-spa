import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { BreachWorkflowPage } from '@/pages/Compliance/BreachWorkflowPage';
import type {
  BreachActivity,
  BreachWorkflowSummary,
} from '@/api/compliance';

vi.mock('@/api/compliance', () => ({
  listBreachesWorkflow: vi.fn(),
  getBreachWorkflow: vi.fn(),
  getBreachActivity: vi.fn(),
  assessBreachRisk: vi.fn(),
  sendBreachPatientNotifications: vi.fn(),
  sendBreachMediaNotice: vi.fn(),
  sendBreachHhsNotification: vi.fn(),
  closeBreach: vi.fn(),
  registerBreach: vi.fn(),
}));

import {
  assessBreachRisk,
  closeBreach,
  getBreachActivity,
  getBreachWorkflow,
  listBreachesWorkflow,
  registerBreach,
  sendBreachHhsNotification,
  sendBreachPatientNotifications,
} from '@/api/compliance';

// Mock the /me query seam so usePermission resolves synchronously without a
// QueryClientProvider. Real usePermission logic still runs against this data.
vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

const ALL_PERMS = ['compliance:breaches'];
function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue({ data: { permissions } } as unknown as ReturnType<typeof useUserRoles>);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <BreachWorkflowPage />
    </MemoryRouter>,
  );
}

function summary(over: Partial<BreachWorkflowSummary> = {}): BreachWorkflowSummary {
  return {
    id: 1,
    status: 'confirmed',
    discoveredAt: '2026-05-15T00:00:00Z',
    confirmedAt: '2026-05-16T00:00:00Z',
    riskAssessmentAt: null,
    riskLevel: null,
    patientNotificationsSentAt: null,
    mediaNoticeSentAt: null,
    mediaNoticeRequired: false,
    hhsNotifiedAt: null,
    closedAt: null,
    affectedPatientCount: 50,
    description: 'Lost laptop',
    daysUntilDeadline: 55,
    isOverdue: false,
    ...over,
  };
}

function activity(over: Partial<BreachActivity> = {}): BreachActivity {
  return {
    id: 1,
    occurredAtUtc: '2026-05-16T00:00:00Z',
    eventType: 'risk_assessed',
    actorUserId: 50,
    actorEmail: 'officer@x',
    notes: 'Moderate',
    ...over,
  };
}

describe('BreachWorkflowPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: user holds compliance:breaches so existing behaviour tests
    // see enabled action buttons. Gating tests override.
    setPermissions(ALL_PERMS);
  });

  it('renders the breach list with status badges and deadline', async () => {
    vi.mocked(listBreachesWorkflow).mockResolvedValueOnce({
      data: [summary(), summary({ id: 2, isOverdue: true, daysUntilDeadline: -3 })],
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('confirmed')).toBeInTheDocument();
    });
    expect(screen.getByText(/55d remaining/i)).toBeInTheDocument();
    expect(screen.getAllByText(/OVERDUE/i).length).toBeGreaterThanOrEqual(1);
  });

  it('opens the detail panel and shows action buttons', async () => {
    const user = userEvent.setup();
    const b = summary();
    vi.mocked(listBreachesWorkflow).mockResolvedValueOnce({ data: [b] });
    vi.mocked(getBreachWorkflow).mockResolvedValueOnce(b);
    vi.mocked(getBreachActivity).mockResolvedValueOnce({ data: [activity()] });

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Open' }));

    await waitFor(() => {
      expect(getBreachWorkflow).toHaveBeenCalledWith(1);
    });
    expect(screen.getByText(/Breach #1/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Assess Risk/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Mark Patient Notifications Sent/i }),
    ).not.toBeInTheDocument();
  });

  it('runs the assess-risk flow via the 4-factor modal', async () => {
    const user = userEvent.setup();
    const b = summary();
    vi.mocked(listBreachesWorkflow).mockResolvedValue({ data: [b] });
    vi.mocked(getBreachWorkflow).mockResolvedValueOnce(b);
    vi.mocked(getBreachActivity).mockResolvedValue({ data: [] });
    vi.mocked(assessBreachRisk).mockResolvedValueOnce(
      summary({ riskLevel: 'High', riskAssessmentAt: '2026-05-19T00:00:00Z', status: 'assessed' }),
    );

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Open' }));
    await user.click(await screen.findByRole('button', { name: /Assess Risk/i }));

    // Modal opens with structured form
    expect(await screen.findByRole('dialog', { name: /Assess breach risk/i })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/Risk level/i), 'High');
    // Fill out the four-factor textareas
    await user.type(
      screen.getByLabelText(/Nature & extent of PHI/i),
      'names + DOB + diagnoses',
    );
    await user.type(
      screen.getByLabelText(/Unauthorized person/i),
      'external attacker',
    );
    await user.type(
      screen.getByLabelText(/actually acquired or viewed/i),
      'confirmed exfil',
    );
    await user.type(
      screen.getByLabelText(/Extent risk has been mitigated/i),
      'tokens rotated, devices wiped',
    );
    await user.clear(screen.getByLabelText(/Affected patient count/i));
    await user.type(screen.getByLabelText(/Affected patient count/i), '750');

    await user.click(screen.getByRole('button', { name: /Save assessment/i }));

    await waitFor(() => {
      expect(assessBreachRisk).toHaveBeenCalledWith(1, expect.objectContaining({
        riskLevel: 'High',
        affectedPatientCount: 750,
        mediaNoticeRequired: true,
        notes: expect.stringContaining('names + DOB + diagnoses'),
      }));
    });
    // Stitched notes contain all four factor headers
    const callArgs = vi.mocked(assessBreachRisk).mock.calls[0][1];
    expect(callArgs.notes).toContain('1.');
    expect(callArgs.notes).toContain('4.');
  });

  it('sends HHS notification through the notes modal', async () => {
    const user = userEvent.setup();
    const assessed = summary({
      status: 'assessed',
      riskLevel: 'Low',
      riskAssessmentAt: '2026-05-18T00:00:00Z',
    });
    vi.mocked(listBreachesWorkflow).mockResolvedValue({ data: [assessed] });
    vi.mocked(getBreachWorkflow).mockResolvedValueOnce(assessed);
    vi.mocked(getBreachActivity).mockResolvedValue({ data: [] });
    vi.mocked(sendBreachHhsNotification).mockResolvedValueOnce(
      summary({ status: 'hhs_notified', hhsNotifiedAt: '2026-05-19T00:00:00Z' }),
    );

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Open' }));
    await user.click(await screen.findByRole('button', { name: /Mark HHS Notified/i }));
    await user.type(screen.getByLabelText(/Notes/i), 'OCR-REF-123');
    await user.click(screen.getByRole('button', { name: /^Confirm$/ }));

    await waitFor(() => {
      expect(sendBreachHhsNotification).toHaveBeenCalledWith(1, 'OCR-REF-123');
    });
  });

  it('requires closure note when closing confirmed-without-HHS', async () => {
    const user = userEvent.setup();
    const assessed = summary({
      status: 'assessed',
      riskLevel: 'Low',
      riskAssessmentAt: '2026-05-18T00:00:00Z',
    });
    vi.mocked(listBreachesWorkflow).mockResolvedValue({ data: [assessed] });
    vi.mocked(getBreachWorkflow).mockResolvedValueOnce(assessed);
    vi.mocked(getBreachActivity).mockResolvedValue({ data: [] });

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Open' }));
    await user.click(await screen.findByRole('button', { name: /Close Breach/i }));
    // Modal warns inline when HHS hasn't been notified
    expect(await screen.findByText(/HHS has not been notified/i)).toBeInTheDocument();
    // Submit without filling notes
    await user.click(screen.getByRole('button', { name: /^Close breach$/ }));

    await waitFor(() => {
      expect(screen.getByText(/Closure note is required/i)).toBeInTheDocument();
    });
    expect(closeBreach).not.toHaveBeenCalled();
  });

  it('shows the activity timeline', async () => {
    const user = userEvent.setup();
    const b = summary();
    vi.mocked(listBreachesWorkflow).mockResolvedValue({ data: [b] });
    vi.mocked(getBreachWorkflow).mockResolvedValueOnce(b);
    vi.mocked(getBreachActivity).mockResolvedValueOnce({
      data: [
        activity({ id: 1, eventType: 'risk_assessed', notes: 'Moderate' }),
        activity({ id: 2, eventType: 'hhs_notified', notes: 'submitted' }),
      ],
    });

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Open' }));

    await waitFor(() => {
      expect(screen.getByText(/risk_assessed/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/hhs_notified/i)).toBeInTheDocument();
  });

  it('marks patient notifications when assessment is done', async () => {
    const user = userEvent.setup();
    const assessed = summary({
      status: 'assessed',
      riskLevel: 'Low',
      riskAssessmentAt: '2026-05-18T00:00:00Z',
    });
    vi.mocked(listBreachesWorkflow).mockResolvedValue({ data: [assessed] });
    vi.mocked(getBreachWorkflow).mockResolvedValueOnce(assessed);
    vi.mocked(getBreachActivity).mockResolvedValue({ data: [] });
    vi.mocked(sendBreachPatientNotifications).mockResolvedValueOnce(
      summary({ patientNotificationsSentAt: '2026-05-19T00:00:00Z', status: 'notifying' }),
    );

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Open' }));
    await user.click(
      await screen.findByRole('button', { name: /Mark Patient Notifications Sent/i }),
    );
    await user.type(screen.getByLabelText(/Notes/i), 'letters mailed');
    await user.click(screen.getByRole('button', { name: /^Confirm$/ }));

    await waitFor(() => {
      expect(sendBreachPatientNotifications).toHaveBeenCalledWith(1, 'letters mailed');
    });
  });

  it('registers a new breach via the modal', async () => {
    const user = userEvent.setup();
    vi.mocked(listBreachesWorkflow).mockResolvedValue({ data: [] });
    vi.mocked(registerBreach).mockResolvedValueOnce({ id: 99 });

    renderPage();
    await waitFor(() => expect(listBreachesWorkflow).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: /Register breach/i }));
    await user.clear(screen.getByLabelText(/Affected patient count/i));
    await user.type(screen.getByLabelText(/Affected patient count/i), '12');
    await user.type(
      screen.getByLabelText(/PHI types involved/i),
      'names, DOB',
    );
    await user.type(
      screen.getByLabelText(/^Description$/i),
      'Laptop left in cab',
    );
    await user.click(screen.getByRole('button', { name: /^Register$/ }));

    await waitFor(() => {
      expect(registerBreach).toHaveBeenCalledWith(expect.objectContaining({
        affectedPatientCount: 12,
        phiTypesInvolved: 'names, DOB',
        description: 'Laptop left in cab',
      }));
    });
    expect(await screen.findByText(/Breach registered/i)).toBeInTheDocument();
  });

  describe('permission gating', () => {
    it('disables Register breach with a permission tooltip when the user lacks compliance:breaches', async () => {
      setPermissions([]); // no compliance:breaches
      vi.mocked(listBreachesWorkflow).mockResolvedValue({ data: [] });
      renderPage();
      await waitFor(() => expect(listBreachesWorkflow).toHaveBeenCalled());

      const btn = screen.getByRole('button', { name: /Register breach/i });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
    });

    it('disables detail-panel workflow actions when the user lacks compliance:breaches', async () => {
      const user = userEvent.setup();
      const b = summary();
      setPermissions([]); // no compliance:breaches
      vi.mocked(listBreachesWorkflow).mockResolvedValue({ data: [b] });
      vi.mocked(getBreachWorkflow).mockResolvedValueOnce(b);
      vi.mocked(getBreachActivity).mockResolvedValueOnce({ data: [] });

      renderPage();
      await user.click(await screen.findByRole('button', { name: 'Open' }));

      expect(await screen.findByRole('button', { name: /Assess Risk/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Close Breach/i })).toBeDisabled();
    });

    it('enables workflow actions when the user has compliance:breaches', async () => {
      const user = userEvent.setup();
      const b = summary();
      setPermissions(['compliance:breaches']);
      vi.mocked(listBreachesWorkflow).mockResolvedValue({ data: [b] });
      vi.mocked(getBreachWorkflow).mockResolvedValueOnce(b);
      vi.mocked(getBreachActivity).mockResolvedValueOnce({ data: [] });

      renderPage();
      await user.click(await screen.findByRole('button', { name: 'Open' }));

      expect(await screen.findByRole('button', { name: /Assess Risk/i })).toBeEnabled();
      expect(screen.getByRole('button', { name: /Register breach/i })).toBeEnabled();
    });
  });
});

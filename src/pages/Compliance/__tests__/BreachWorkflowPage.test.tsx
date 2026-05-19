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
}));

import {
  assessBreachRisk,
  closeBreach,
  getBreachActivity,
  getBreachWorkflow,
  listBreachesWorkflow,
  sendBreachHhsNotification,
  sendBreachPatientNotifications,
} from '@/api/compliance';

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
  beforeEach(() => vi.clearAllMocks());

  it('renders the breach list with status badges and deadline', async () => {
    vi.mocked(listBreachesWorkflow).mockResolvedValueOnce({
      data: [summary(), summary({ id: 2, isOverdue: true, daysUntilDeadline: -3 })],
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('confirmed')).toBeInTheDocument();
    });
    expect(screen.getByText(/55d until/i)).toBeInTheDocument();
    // both the row's overdue badge AND the deadline column carry "OVERDUE"
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
    // Patient/HHS notification buttons require prior assessment, hidden here
    expect(
      screen.queryByRole('button', { name: /Mark Patient Notifications Sent/i }),
    ).not.toBeInTheDocument();
  });

  it('runs the assess-risk flow with prompts', async () => {
    const user = userEvent.setup();
    const b = summary();
    vi.mocked(listBreachesWorkflow).mockResolvedValue({ data: [b] });
    vi.mocked(getBreachWorkflow).mockResolvedValueOnce(b);
    vi.mocked(getBreachActivity).mockResolvedValue({ data: [] });
    vi.mocked(assessBreachRisk).mockResolvedValueOnce(
      summary({ riskLevel: 'Moderate', riskAssessmentAt: '2026-05-19T00:00:00Z', status: 'assessed' }),
    );

    const promptSpy = vi
      .spyOn(window, 'prompt')
      .mockReturnValueOnce('Moderate')     // risk level
      .mockReturnValueOnce('limited expo') // notes
      .mockReturnValueOnce('100');         // affected count

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Open' }));
    await user.click(await screen.findByRole('button', { name: /Assess Risk/i }));

    await waitFor(() => {
      expect(assessBreachRisk).toHaveBeenCalledWith(1, {
        riskLevel: 'Moderate',
        notes: 'limited expo',
        affectedPatientCount: 100,
        mediaNoticeRequired: false,
      });
    });
    promptSpy.mockRestore();
  });

  it('sends HHS notification after assessment', async () => {
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

    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValueOnce('OCR-REF-123');

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Open' }));
    await user.click(await screen.findByRole('button', { name: /Mark HHS Notified/i }));

    await waitFor(() => {
      expect(sendBreachHhsNotification).toHaveBeenCalledWith(1, 'OCR-REF-123');
    });
    promptSpy.mockRestore();
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

    // user cancels prompt → null
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValueOnce(null);

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Open' }));
    await user.click(await screen.findByRole('button', { name: /Close Breach/i }));

    await waitFor(() => {
      expect(screen.getByText(/Closure note is required/i)).toBeInTheDocument();
    });
    expect(closeBreach).not.toHaveBeenCalled();
    promptSpy.mockRestore();
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

    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValueOnce('letters mailed');
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Open' }));
    await user.click(
      await screen.findByRole('button', { name: /Mark Patient Notifications Sent/i }),
    );

    await waitFor(() => {
      expect(sendBreachPatientNotifications).toHaveBeenCalledWith(1, 'letters mailed');
    });
    promptSpy.mockRestore();
  });
});

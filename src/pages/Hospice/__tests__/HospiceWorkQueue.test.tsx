import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HospiceWorkQueue } from '@/pages/Hospice/HospiceWorkQueue';

vi.mock('@/api/hospice', () => ({
  getWorkQueue: vi.fn(),
}));

import { getWorkQueue } from '@/api/hospice';

function renderPage() {
  return render(
    <MemoryRouter>
      <HospiceWorkQueue />
    </MemoryRouter>,
  );
}

describe('HospiceWorkQueue', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows loading state initially', () => {
    vi.mocked(getWorkQueue).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders all twelve tabs with empty state when no items', async () => {
    vi.mocked(getWorkQueue).mockResolvedValueOnce({
      recertsDue: [],
      noeOverdue: [],
      hopeOverdue: [],
      idgOverdue: [],
      carePlanReviewsDue: [],
      bereavementFollowUps: [],
      bereavementOverdueContact: [],
      addendumDue: [],
      notrOverdue: [],
      ftfDue: [],
      dischargeTasksDue: [],
      surveyRiskDischarges: [],
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Recerts Due/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /NOE Overdue/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /HOPE Overdue/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /IDG Overdue/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Care Plan Reviews Due/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Bereavement Follow-Ups/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Bereavement Overdue/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Addendum Due/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /NOTR Overdue/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /FTF Due/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Discharge Tasks Due/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Survey Risk Discharges/i })).toBeInTheDocument();
      expect(screen.getByText(/No recerts due/i)).toBeInTheDocument();
    });
  });

  it('switches tabs when clicked', async () => {
    vi.mocked(getWorkQueue).mockResolvedValueOnce({
      recertsDue: [
        {
          type: 'RecertDue',
          electionId: 1,
          patientId: 10,
          patientName: 'Jane Doe',
          dueDate: '2026-06-01',
          daysUntilDue: 5,
          daysOverdue: null,
          periodNumber: 2,
        },
      ],
      noeOverdue: [
        {
          type: 'NoeOverdue',
          electionId: 2,
          patientId: 11,
          patientName: 'John Smith',
          dueDate: '2026-05-10',
          daysUntilDue: null,
          daysOverdue: 5,
          periodNumber: null,
        },
      ],
      hopeOverdue: [],
      idgOverdue: [],
      carePlanReviewsDue: [],
      bereavementFollowUps: [],
      bereavementOverdueContact: [],
      addendumDue: [],
      notrOverdue: [],
      ftfDue: [],
      dischargeTasksDue: [],
      surveyRiskDischarges: [],
    });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('Jane Doe'));
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.queryByText('John Smith')).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /NOE Overdue/i }));
    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  it('shows error when API rejects', async () => {
    vi.mocked(getWorkQueue).mockRejectedValueOnce(new Error('boom'));
    renderPage();
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  it('dischargeTasksDue items render in the new tab', async () => {
    vi.mocked(getWorkQueue).mockResolvedValueOnce({
      recertsDue: [],
      noeOverdue: [],
      hopeOverdue: [],
      idgOverdue: [],
      carePlanReviewsDue: [],
      bereavementFollowUps: [],
      bereavementOverdueContact: [],
      addendumDue: [],
      notrOverdue: [],
      ftfDue: [],
      dischargeTasksDue: [
        {
          type: 'DischargeTaskDue',
          dischargeId: 10,
          electionId: 3,
          patientId: 20,
          patientName: 'Alice Brown',
          taskType: 'DmeRetrieval',
          taskTitle: 'Return DME equipment',
          dueDate: '2026-06-05',
          daysUntilDue: 3,
        },
      ],
      surveyRiskDischarges: [],
    });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByRole('tab', { name: /Discharge Tasks Due/i }));
    await user.click(screen.getByRole('tab', { name: /Discharge Tasks Due/i }));
    await waitFor(() => {
      expect(screen.getByText('Alice Brown')).toBeInTheDocument();
      expect(screen.getByText('Return DME equipment')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Open Discharge/i })).toBeInTheDocument();
    });
  });

  it('surveyRiskDischarges items render in the new tab', async () => {
    vi.mocked(getWorkQueue).mockResolvedValueOnce({
      recertsDue: [],
      noeOverdue: [],
      hopeOverdue: [],
      idgOverdue: [],
      carePlanReviewsDue: [],
      bereavementFollowUps: [],
      bereavementOverdueContact: [],
      addendumDue: [],
      notrOverdue: [],
      ftfDue: [],
      dischargeTasksDue: [],
      surveyRiskDischarges: [
        {
          type: 'SurveyRiskDischarge',
          dischargeId: 11,
          electionId: 4,
          patientId: 21,
          patientName: 'Bob Green',
          reason: 'ForCause',
          effectiveDate: '2026-05-20',
          surveyRiskFlags: ['MissingIdgApproval', 'MissingAdvanceNotice'],
        },
      ],
    });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByRole('tab', { name: /Survey Risk Discharges/i }));
    await user.click(screen.getByRole('tab', { name: /Survey Risk Discharges/i }));
    await waitFor(() => {
      expect(screen.getByText('Bob Green')).toBeInTheDocument();
      expect(screen.getByText('ForCause')).toBeInTheDocument();
      expect(screen.getByText(/MissingIdgApproval/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Review/i })).toBeInTheDocument();
    });
  });
});

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HospiceDischargeDetail } from '@/pages/Hospice/HospiceDischargeDetail';
import * as hospiceApi from '@/api/hospice';

vi.mock('@/api/hospice');

function makeDischarge(overrides: any = {}) {
  return {
    id: 1, organizationId: 1, electionId: 42,
    reason: 'Transfer', effectiveDate: '2026-02-01',
    reasonNotes: null, receivingAgencyName: 'Sunrise',
    outOfAreaDestination: null, idgApprovalDate: null,
    physicianSignOffUserId: null, advanceNoticeDate: null,
    alternativeArrangements: null,
    surveyRiskFlags: [], isSurveyRisk: false, pendingTaskCount: 3,
    recordedByUserId: 99, createdAt: '2026-02-01T00:00:00Z', updatedAt: '2026-02-01T00:00:00Z',
    tasks: [],
    ...overrides,
  };
}

function renderDetail(dischargeId = '1') {
  return render(
    <MemoryRouter initialEntries={[`/hospice/discharges/${dischargeId}`]}>
      <Routes>
        <Route path="/hospice/discharges/:dischargeId" element={<HospiceDischargeDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('HospiceDischargeDetail', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders discharge summary', async () => {
    vi.mocked(hospiceApi.getDischarge).mockResolvedValueOnce(makeDischarge());
    renderDetail();
    await waitFor(() => expect(screen.getByText(/sunrise/i)).toBeInTheDocument());
  });

  it('renders task list', async () => {
    vi.mocked(hospiceApi.getDischarge).mockResolvedValueOnce(makeDischarge({
      tasks: [
        { id: 1, dischargeId: 1, taskType: 'DmeRetrieval', title: 'Retrieve DME', dueDate: '2026-02-05', completedAt: null, completedByUserId: null, notes: null, createdAt: '', updatedAt: '' },
      ],
    }));
    renderDetail();
    await waitFor(() => expect(screen.getByText(/retrieve dme/i)).toBeInTheDocument());
  });

  it('shows Survey Risk banner when surveyRiskFlags is non-empty', async () => {
    vi.mocked(hospiceApi.getDischarge).mockResolvedValueOnce(makeDischarge({
      surveyRiskFlags: ['missing_idg_approval', 'missing_physician_signoff'],
      isSurveyRisk: true,
    }));
    renderDetail();
    await waitFor(() => expect(screen.getByText(/survey risk/i)).toBeInTheDocument());
    expect(screen.getByText(/missing_idg_approval/)).toBeInTheDocument();
  });

  it('Complete task action calls completeDischargeTask', async () => {
    vi.mocked(hospiceApi.getDischarge)
      .mockResolvedValueOnce(makeDischarge({
        tasks: [
          { id: 1, dischargeId: 1, taskType: 'DmeRetrieval', title: 'Retrieve DME', dueDate: '2026-02-05', completedAt: null, completedByUserId: null, notes: null, createdAt: '', updatedAt: '' },
        ],
      }))
      .mockResolvedValueOnce(makeDischarge());
    vi.mocked(hospiceApi.completeDischargeTask).mockResolvedValueOnce({} as any);
    renderDetail();
    await waitFor(() => screen.getByRole('button', { name: /complete/i }));
    fireEvent.click(screen.getByRole('button', { name: /complete/i }));
    await waitFor(() => expect(hospiceApi.completeDischargeTask).toHaveBeenCalledWith(1, 1, undefined));
  });

  it('Edit Discharge button is visible and triggers focused form', async () => {
    vi.mocked(hospiceApi.getDischarge).mockResolvedValueOnce(makeDischarge({
      reason: 'ForCause',
      surveyRiskFlags: ['missing_idg_approval'],
      isSurveyRisk: true,
    }));
    renderDetail();
    await waitFor(() => screen.getByRole('button', { name: /edit discharge/i }));
    fireEvent.click(screen.getByRole('button', { name: /edit discharge/i }));
    expect(screen.getByLabelText(/idg approval date/i)).toBeInTheDocument();
  });
});

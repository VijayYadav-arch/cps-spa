import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HospiceClaimSubmissionsPage } from '@/pages/Hospice/HospiceClaimSubmissionsPage';
import type {
  ClaimSubmissionDetail,
  ClaimSubmissionSummary,
  Hospice837IExportResult,
} from '@/api/hospice';

vi.mock('@/api/hospice', () => ({
  exportHospice837I: vi.fn(),
  listClaimSubmissions: vi.fn(),
  getClaimSubmission: vi.fn(),
  markClaimSubmissionSubmitted: vi.fn(),
}));

import {
  exportHospice837I,
  getClaimSubmission,
  listClaimSubmissions,
  markClaimSubmissionSubmitted,
} from '@/api/hospice';

function renderPage(claimId = '700') {
  return render(
    <MemoryRouter initialEntries={[`/hospice/claims/${claimId}/submissions`]}>
      <Routes>
        <Route
          path="/hospice/claims/:claimId/submissions"
          element={<HospiceClaimSubmissionsPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

function pendingSubmission(over: Partial<ClaimSubmissionSummary> = {}): ClaimSubmissionSummary {
  return {
    id: 1,
    claimId: 700,
    clearinghouse: 'availity',
    status: 'pending',
    trackingId: null,
    clearinghouseTrackingId: null,
    ackStatus: null,
    submittedAt: null,
    lastStatusCheckedAt: null,
    createdAt: '2026-05-19T12:00:00Z',
    ...over,
  };
}

function exportResult(over: Partial<Hospice837IExportResult> = {}): Hospice837IExportResult {
  return {
    submissionId: 1,
    edi837: 'ISA*00*...',
    controlNumber: '000000001',
    typeOfBill: '0811',
    lineCount: 1,
    totalCharges: 720,
    warnings: [],
    ...over,
  };
}

function fullDetail(over: Partial<ClaimSubmissionDetail> = {}): ClaimSubmissionDetail {
  return {
    ...pendingSubmission(),
    ackMessage: null,
    edi837: 'ISA*00*          *...',
    ...over,
  };
}

describe('HospiceClaimSubmissionsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads submissions on mount', async () => {
    vi.mocked(listClaimSubmissions).mockResolvedValueOnce({
      data: [pendingSubmission()],
    });
    renderPage();
    await waitFor(() => {
      expect(listClaimSubmissions).toHaveBeenCalledWith(700);
    });
    expect(screen.getByText('Submissions (1)')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('exports an 837I and refreshes the list', async () => {
    const user = userEvent.setup();
    vi.mocked(listClaimSubmissions)
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [pendingSubmission()] });
    vi.mocked(exportHospice837I).mockResolvedValueOnce(exportResult());

    renderPage();
    await screen.findByText('Submissions (0)');
    await user.click(screen.getByRole('button', { name: /Generate 837I/i }));

    await waitFor(() => {
      expect(exportHospice837I).toHaveBeenCalledWith(700, {
        clearinghouse: 'availity',
        priorAuthorizationNumber: null,
        claimNote: null,
      });
    });
    expect(screen.getByText(/Control #000000001/i)).toBeInTheDocument();
    expect(screen.getByText(/0811/i)).toBeInTheDocument();
  });

  it('shows export warnings', async () => {
    const user = userEvent.setup();
    vi.mocked(listClaimSubmissions)
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [pendingSubmission()] });
    vi.mocked(exportHospice837I).mockResolvedValueOnce(
      exportResult({ warnings: ['No active hospice election; using AdmitDate as Occurrence Code 27.'] }),
    );

    renderPage();
    await screen.findByText('Submissions (0)');
    await user.click(screen.getByRole('button', { name: /Generate 837I/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/No active hospice election/i),
      ).toBeInTheDocument();
    });
  });

  it('opens detail panel and shows EDI text', async () => {
    const user = userEvent.setup();
    vi.mocked(listClaimSubmissions).mockResolvedValue({
      data: [pendingSubmission()],
    });
    vi.mocked(getClaimSubmission).mockResolvedValueOnce(fullDetail());
    renderPage();
    await screen.findByText('pending');
    await user.click(screen.getByRole('button', { name: /View EDI/i }));
    await waitFor(() => {
      expect(getClaimSubmission).toHaveBeenCalledWith(1);
    });
    expect(screen.getByText(/Submission #1 EDI body/i)).toBeInTheDocument();
  });

  it('marks a pending submission as submitted', async () => {
    const user = userEvent.setup();
    vi.mocked(listClaimSubmissions).mockResolvedValue({
      data: [pendingSubmission()],
    });
    vi.mocked(markClaimSubmissionSubmitted).mockResolvedValueOnce({
      ...pendingSubmission(),
      status: 'submitted',
      submittedAt: '2026-05-19T12:30:00Z',
    });

    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValueOnce('CH-XYZ');

    renderPage();
    await screen.findByText('pending');
    await user.click(screen.getByRole('button', { name: /Mark Submitted/i }));

    await waitFor(() => {
      expect(markClaimSubmissionSubmitted).toHaveBeenCalledWith(1, 'CH-XYZ');
    });
    promptSpy.mockRestore();
  });

  it('hides Mark Submitted on non-pending rows', async () => {
    vi.mocked(listClaimSubmissions).mockResolvedValueOnce({
      data: [pendingSubmission({ status: 'submitted', submittedAt: '2026-05-19T12:30:00Z' })],
    });
    renderPage();
    await screen.findByText('submitted');
    expect(
      screen.queryByRole('button', { name: /Mark Submitted/i }),
    ).not.toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditAnomalyReviewPage } from '@/pages/Compliance/AuditAnomalyReviewPage';
import type { AnomalyType, AnomalyStatus } from '@/api/compliance';

vi.mock('@/api/compliance', async (orig) => ({
  ...(await orig<object>()),
  listAnomalies: vi.fn(),
  updateAnomalyStatus: vi.fn(),
  scanAnomaliesNow: vi.fn(),
}));

import {
  listAnomalies,
  updateAnomalyStatus,
  scanAnomaliesNow,
} from '@/api/compliance';

beforeEach(() => vi.clearAllMocks());

function alert(over: Partial<{
  id: number; status: AnomalyStatus; anomalyType: AnomalyType;
  userEmail: string | null; evidence: string;
}> = {}) {
  return {
    id: 1, organizationId: 1,
    userId: 5, userEmail: 'biller@x', ipAddress: null,
    anomalyType: 'bulk-read' as const,
    detectedAtUtc: '2026-05-20T10:30:00Z',
    windowStartUtc: '2026-05-20T10:00:00Z',
    windowEndUtc: '2026-05-20T11:00:00Z',
    evidence: '52 distinct patients accessed in 1 hour',
    status: 'open' as const,
    reviewedByUserId: null, reviewedAtUtc: null, notes: null,
    ...over,
  };
}

describe('AuditAnomalyReviewPage', () => {
  it('loads open anomalies on first render', async () => {
    vi.mocked(listAnomalies).mockResolvedValue({
      data: [alert(), alert({ id: 2, anomalyType: 'off-hours', evidence: '14 events overnight' })],
      total: 2,
    });

    render(<AuditAnomalyReviewPage />);

    expect(await screen.findByText(/52 distinct patients/)).toBeInTheDocument();
    expect(screen.getByText(/14 events overnight/)).toBeInTheDocument();
    expect(listAnomalies).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'open' }),
    );
  });

  it('switches filter and re-fetches', async () => {
    const user = userEvent.setup();
    vi.mocked(listAnomalies).mockResolvedValue({ data: [], total: 0 });
    render(<AuditAnomalyReviewPage />);
    await waitFor(() => expect(listAnomalies).toHaveBeenCalledTimes(1));

    await user.selectOptions(
      screen.getByLabelText(/Filter by status/i), 'dismissed',
    );
    await waitFor(() => {
      expect(listAnomalies).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'dismissed' }),
      );
    });
  });

  it('dismisses an alert via the action modal', async () => {
    const user = userEvent.setup();
    vi.mocked(listAnomalies).mockResolvedValue({ data: [alert()], total: 1 });
    vi.mocked(updateAnomalyStatus).mockResolvedValue({ data: alert({ status: 'dismissed' }) });

    render(<AuditAnomalyReviewPage />);
    await screen.findByText(/52 distinct patients/);

    await user.click(screen.getByRole('button', { name: /Dismiss/i }));
    await user.type(screen.getByLabelText(/Notes/i), 'spot check, normal');
    await user.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(updateAnomalyStatus).toHaveBeenCalledWith(1, 'dismissed', 'spot check, normal');
    });
  });

  it('escalates an alert', async () => {
    const user = userEvent.setup();
    vi.mocked(listAnomalies).mockResolvedValue({ data: [alert()], total: 1 });
    vi.mocked(updateAnomalyStatus).mockResolvedValue({ data: alert({ status: 'escalated' }) });

    render(<AuditAnomalyReviewPage />);
    await screen.findByText(/52 distinct patients/);

    await user.click(screen.getByRole('button', { name: /Escalate/i }));
    await user.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(updateAnomalyStatus).toHaveBeenCalledWith(1, 'escalated', null);
    });
  });

  it('runs an on-demand scan', async () => {
    const user = userEvent.setup();
    vi.mocked(listAnomalies).mockResolvedValue({ data: [], total: 0 });
    vi.mocked(scanAnomaliesNow).mockResolvedValue({ data: { inserted: 3 } });

    render(<AuditAnomalyReviewPage />);
    await waitFor(() => expect(listAnomalies).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: /Scan now/i }));
    expect(await screen.findByText(/3 new alert/i)).toBeInTheDocument();
  });

  it('shows API error when load fails', async () => {
    vi.mocked(listAnomalies).mockRejectedValueOnce({
      response: { data: { error: 'forbidden' } },
    });
    render(<AuditAnomalyReviewPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('forbidden');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SlaPage } from '@/pages/Admin/Compliance/SlaPage';

vi.mock('@/api/uptimeRecords', () => ({
  listUptimeRecords: vi.fn(),
  getUptimeSummary: vi.fn(),
}));

import { getUptimeSummary, listUptimeRecords } from '@/api/uptimeRecords';

function record(id: number, status = 'up', responseMs = 100) {
  return {
    id,
    checkUrl: 'https://x/health',
    status,
    responseMs,
    checkedAt: '2026-06-05T00:00:00Z',
    createdAt: '2026-06-05T00:00:00Z',
    updatedAt: '2026-06-05T00:00:00Z',
  };
}

const SUMMARY = {
  totalChecks: 100,
  upChecks: 99,
  degradedChecks: 1,
  downChecks: 0,
  uptimePercentage: 99.0,
  avgResponseMs: 120,
  oldestSampleAt: '2026-05-05T00:00:00Z',
  newestSampleAt: '2026-06-05T00:00:00Z',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <SlaPage />
    </MemoryRouter>
  );
}

describe('SlaPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders KPI cards from summary endpoint', async () => {
    vi.mocked(listUptimeRecords).mockResolvedValueOnce({
      data: [record(1)],
      pagination: { total: 1, page: 1, pageSize: 50 },
    });
    vi.mocked(getUptimeSummary).mockResolvedValueOnce(SUMMARY);

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('99%')).toBeInTheDocument();
      expect(screen.getByText('120ms')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument(); // total checks
    });
  });

  it('shows "Met" badge when uptime >= 99.9', async () => {
    vi.mocked(listUptimeRecords).mockResolvedValueOnce({
      data: [],
      pagination: { total: 0, page: 1, pageSize: 50 },
    });
    vi.mocked(getUptimeSummary).mockResolvedValueOnce({ ...SUMMARY, uptimePercentage: 99.95 });

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Met')).toBeInTheDocument();
    });
  });

  it('shows "No data" instead of a fabricated 99.9%/Met when there are no checks (L2)', async () => {
    vi.mocked(listUptimeRecords).mockResolvedValueOnce({
      data: [],
      pagination: { total: 0, page: 1, pageSize: 50 },
    });
    vi.mocked(getUptimeSummary).mockResolvedValueOnce({
      ...SUMMARY,
      totalChecks: 0,
      upChecks: 0,
      uptimePercentage: 0,
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No data')).toBeInTheDocument();
    });
    expect(screen.queryByText('Met')).not.toBeInTheDocument();
  });

  it('renders incidents table when down/degraded records exist', async () => {
    vi.mocked(listUptimeRecords).mockResolvedValueOnce({
      data: [record(1, 'degraded', 800), record(2, 'down', 0)],
      pagination: { total: 2, page: 1, pageSize: 50 },
    });
    vi.mocked(getUptimeSummary).mockResolvedValueOnce(SUMMARY);

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('degraded')).toBeInTheDocument();
      expect(screen.getByText('down')).toBeInTheDocument();
    });
  });

  it('shows no-incidents message when only "up" records', async () => {
    vi.mocked(listUptimeRecords).mockResolvedValueOnce({
      data: [record(1, 'up'), record(2, 'up')],
      pagination: { total: 2, page: 1, pageSize: 50 },
    });
    vi.mocked(getUptimeSummary).mockResolvedValueOnce({ ...SUMMARY, downChecks: 0, degradedChecks: 0 });

    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/no incidents recorded/i)).toBeInTheDocument();
    });
  });

  it('renders error alert on fetch failure', async () => {
    vi.mocked(listUptimeRecords).mockRejectedValueOnce(new Error('500'));
    vi.mocked(getUptimeSummary).mockRejectedValueOnce(new Error('500'));

    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/500/);
    });
  });
});

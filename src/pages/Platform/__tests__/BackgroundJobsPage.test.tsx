import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { BackgroundJobsPage } from '@/pages/Platform/BackgroundJobsPage';
import type { BackgroundJobTick } from '@/api/platform';

vi.mock('@/api/platform', () => ({
  getBackgroundJobs: vi.fn(),
}));

import { getBackgroundJobs } from '@/api/platform';

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.useRealTimers();
});

function tick(over: Partial<BackgroundJobTick> = {}): BackgroundJobTick {
  return {
    name: 'audit-anomaly-scanner',
    displayName: 'Audit anomaly scanner',
    lastRanAtUtc: '2026-05-22T10:00:00Z',
    intervalSeconds: 600,
    summary: 'scanned window, no new alerts',
    lastError: null,
    lastErrorAtUtc: null,
    secondsSinceLastRun: 120,
    stale: false,
    ...over,
  };
}

function renderPage() {
  return render(<MemoryRouter><BackgroundJobsPage /></MemoryRouter>);
}

describe('BackgroundJobsPage', () => {
  it('renders the service rows with healthy badge', async () => {
    vi.mocked(getBackgroundJobs).mockResolvedValue({
      data: [tick()],
      asOfUtc: '2026-05-22T10:02:00Z',
    });
    renderPage();
    expect(await screen.findByText('Audit anomaly scanner')).toBeInTheDocument();
    expect(screen.getByText('healthy')).toBeInTheDocument();
    expect(screen.getByText(/every 10m/)).toBeInTheDocument();
    expect(screen.getByText(/2m ago/)).toBeInTheDocument();
    expect(screen.getByText(/scanned window, no new alerts/)).toBeInTheDocument();
  });

  it('shows a stale badge for a service whose interval has elapsed 3×', async () => {
    vi.mocked(getBackgroundJobs).mockResolvedValue({
      data: [tick({ stale: true, secondsSinceLastRun: 2400 })],
      asOfUtc: '2026-05-22T10:40:00Z',
    });
    renderPage();
    expect(await screen.findByText('stale')).toBeInTheDocument();
  });

  it('shows a failed badge + error message when LastError is set', async () => {
    vi.mocked(getBackgroundJobs).mockResolvedValue({
      data: [tick({
        lastError: 'database connection refused',
        lastErrorAtUtc: '2026-05-22T10:01:30Z',
      })],
      asOfUtc: '2026-05-22T10:02:00Z',
    });
    renderPage();
    expect(await screen.findByText('failed')).toBeInTheDocument();
    expect(screen.getByText(/database connection refused/)).toBeInTheDocument();
  });

  it('empty state when no jobs have ticked', async () => {
    vi.mocked(getBackgroundJobs).mockResolvedValue({
      data: [],
      asOfUtc: '2026-05-22T10:00:00Z',
    });
    renderPage();
    expect(await screen.findByText(/No background services have ticked/i))
      .toBeInTheDocument();
  });

  it('error banner when the load rejects', async () => {
    vi.mocked(getBackgroundJobs).mockRejectedValueOnce({
      response: { data: { error: 'forbidden' } },
    });
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('forbidden');
  });

  it('re-fetches when "Refresh now" is clicked', async () => {
    vi.useRealTimers();  // userEvent needs real timers
    const user = userEvent.setup();
    vi.mocked(getBackgroundJobs).mockResolvedValue({
      data: [tick()],
      asOfUtc: '2026-05-22T10:02:00Z',
    });
    renderPage();
    await screen.findByText('Audit anomaly scanner');
    expect(getBackgroundJobs).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /Refresh now/i }));
    await waitFor(() => expect(getBackgroundJobs).toHaveBeenCalledTimes(2));
  });

  it('auto-refreshes every 30s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(getBackgroundJobs).mockResolvedValue({
      data: [tick()],
      asOfUtc: '2026-05-22T10:02:00Z',
    });
    renderPage();
    // First call fires on mount.
    await vi.waitFor(() => expect(getBackgroundJobs).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(30_000);
    await vi.waitFor(() => expect(getBackgroundJobs).toHaveBeenCalledTimes(2));
  });
});

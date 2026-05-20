import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { InboxBadge } from '@/components/InboxBadge';

vi.mock('@/api/billing', () => ({
  getInbox: vi.fn(),
}));

import { getInbox } from '@/api/billing';

beforeEach(() => {
  vi.clearAllMocks();
});

function mockStats(stats: Partial<{
  pending: number; inProgress: number; critical: number; overdue: number; total: number;
}>) {
  vi.mocked(getInbox).mockResolvedValue({
    data: [],
    stats: {
      total: stats.total ?? 0,
      pending: stats.pending ?? 0,
      inProgress: stats.inProgress ?? 0,
      critical: stats.critical ?? 0,
      overdue: stats.overdue ?? 0,
    },
  });
}

describe('InboxBadge', () => {
  it('renders nothing when inbox is empty', async () => {
    mockStats({ pending: 0, inProgress: 0 });
    const { container } = render(<InboxBadge />);
    // Wait for the resolved fetch to settle
    await waitFor(() => {
      expect(getInbox).toHaveBeenCalled();
    });
    // Nothing visible in the container
    expect(container.querySelector('span[aria-label]')).toBeNull();
  });

  it('renders the open count when there is work', async () => {
    mockStats({ pending: 3, inProgress: 2 });
    render(<InboxBadge />);
    expect(await screen.findByText('5')).toBeInTheDocument();
  });

  it('caps display at 99+ for large counts', async () => {
    mockStats({ pending: 50, inProgress: 60 });
    render(<InboxBadge />);
    expect(await screen.findByText('99+')).toBeInTheDocument();
  });

  it('uses red badge when critical > 0', async () => {
    mockStats({ pending: 5, critical: 2 });
    render(<InboxBadge />);
    const badge = await screen.findByText('5');
    expect((badge as HTMLElement).style.background).toMatch(/rgb\(220, 38, 38\)|#dc2626/);
  });

  it('uses amber badge when only overdue > 0', async () => {
    mockStats({ pending: 3, overdue: 1 });
    render(<InboxBadge />);
    const badge = await screen.findByText('3');
    expect((badge as HTMLElement).style.background).toMatch(/rgb\(245, 158, 11\)|#f59e0b/);
  });

  it('uses gray badge when only routine work is open', async () => {
    mockStats({ pending: 2, inProgress: 1 });
    render(<InboxBadge />);
    const badge = await screen.findByText('3');
    expect((badge as HTMLElement).style.background).toMatch(/rgb\(100, 116, 139\)|#64748b/);
  });

  it('exposes an accessible aria-label describing the counts', async () => {
    mockStats({ pending: 5, inProgress: 0, critical: 2, overdue: 1 });
    render(<InboxBadge />);
    expect(await screen.findByLabelText(/5 open work items/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/2 critical/i)).toBeInTheDocument();
  });

  it('silently no-ops when the API rejects', async () => {
    vi.mocked(getInbox).mockRejectedValueOnce(new Error('403'));
    const { container } = render(<InboxBadge />);
    await waitFor(() => {
      expect(getInbox).toHaveBeenCalled();
    });
    // No exception escaped; nothing visible
    expect(container.querySelector('span[aria-label]')).toBeNull();
  });
});

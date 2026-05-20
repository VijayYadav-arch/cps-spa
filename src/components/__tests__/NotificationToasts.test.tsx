import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NotificationToasts } from '@/components/NotificationToasts';

vi.mock('@/api/billing', () => ({
  pollInboxNotifications: vi.fn(),
  acknowledgeInboxNotifications: vi.fn(),
}));

import {
  pollInboxNotifications,
  acknowledgeInboxNotifications,
} from '@/api/billing';

beforeEach(() => vi.clearAllMocks());

function notif(over: Partial<{
  itemId: number; description: string; priority: string;
  occurredAtUtc: string; actorEmail: string;
}> = {}) {
  return {
    itemId: 1,
    itemType: 'denial',
    priority: 'medium',
    description: 'Review denial CLM-1',
    claimId: 42,
    patientId: null,
    eventType: 'assigned' as const,
    actorEmail: 'lead@x',
    occurredAtUtc: '2026-05-21T12:00:00Z',
    ...over,
  };
}

function renderToasts() {
  return render(
    <MemoryRouter>
      <NotificationToasts />
    </MemoryRouter>,
  );
}

describe('NotificationToasts', () => {
  it('renders nothing when the poll returns empty', async () => {
    vi.mocked(pollInboxNotifications).mockResolvedValue({
      notifications: [],
      serverNowUtc: '2026-05-21T12:00:00Z',
      lastSeenAtUtc: '2026-05-21T11:00:00Z',
    });
    vi.mocked(acknowledgeInboxNotifications).mockResolvedValue(undefined);

    const { container } = renderToasts();
    await waitFor(() => {
      expect(pollInboxNotifications).toHaveBeenCalled();
    });
    expect(container.querySelector('[role="region"]')).toBeNull();
  });

  it('shows a toast for an assigned-to-me notification', async () => {
    vi.mocked(pollInboxNotifications).mockResolvedValue({
      notifications: [notif()],
      serverNowUtc: '2026-05-21T12:00:00Z',
      lastSeenAtUtc: '2026-05-21T11:00:00Z',
    });
    vi.mocked(acknowledgeInboxNotifications).mockResolvedValue(undefined);

    renderToasts();
    expect(await screen.findByText(/Review denial CLM-1/i)).toBeInTheDocument();
    expect(screen.getByText(/Assigned to you/i)).toBeInTheDocument();
    expect(screen.getByText(/by lead@x/i)).toBeInTheDocument();
  });

  it('flags critical priority in the toast header', async () => {
    vi.mocked(pollInboxNotifications).mockResolvedValue({
      notifications: [notif({ priority: 'critical' })],
      serverNowUtc: '2026-05-21T12:00:00Z',
      lastSeenAtUtc: '2026-05-21T11:00:00Z',
    });
    vi.mocked(acknowledgeInboxNotifications).mockResolvedValue(undefined);

    renderToasts();
    expect(await screen.findByText(/CRITICAL/i)).toBeInTheDocument();
  });

  it('acks the server-now timestamp after a successful poll', async () => {
    vi.mocked(pollInboxNotifications).mockResolvedValue({
      notifications: [notif()],
      serverNowUtc: '2026-05-21T12:30:00Z',
      lastSeenAtUtc: '2026-05-21T11:00:00Z',
    });
    vi.mocked(acknowledgeInboxNotifications).mockResolvedValue(undefined);

    renderToasts();
    await waitFor(() => {
      expect(acknowledgeInboxNotifications).toHaveBeenCalledWith('2026-05-21T12:30:00Z');
    });
  });

  it('dismisses a toast on click', async () => {
    const user = userEvent.setup();
    vi.mocked(pollInboxNotifications).mockResolvedValue({
      notifications: [notif()],
      serverNowUtc: '2026-05-21T12:00:00Z',
      lastSeenAtUtc: '2026-05-21T11:00:00Z',
    });
    vi.mocked(acknowledgeInboxNotifications).mockResolvedValue(undefined);

    renderToasts();
    const toast = await screen.findByText(/Review denial CLM-1/i);
    await user.click(toast);
    expect(screen.queryByText(/Review denial CLM-1/i)).not.toBeInTheDocument();
  });

  it('fails silently when the poll rejects', async () => {
    vi.mocked(pollInboxNotifications).mockRejectedValueOnce(new Error('403'));
    const { container } = renderToasts();
    await waitFor(() => {
      expect(pollInboxNotifications).toHaveBeenCalled();
    });
    expect(container.querySelector('[role="region"]')).toBeNull();
  });
});

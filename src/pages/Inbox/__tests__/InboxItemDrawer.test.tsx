import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InboxItemDrawer } from '@/pages/Inbox/InboxItemDrawer';
import type { WorkQueueItem } from '@/api/billing';

vi.mock('@/api/billing', () => ({
  getWorkItemEvents: vi.fn(),
}));

import { getWorkItemEvents } from '@/api/billing';

function item(over: Partial<WorkQueueItem> = {}): WorkQueueItem {
  return {
    id: 1,
    type: 'denial',
    description: 'Review denial for CLM-1',
    priority: 'high',
    status: 'in-progress',
    claimId: 42,
    patientId: null,
    dueDate: null,
    assignedTo: 50,
    snoozeUntilUtc: null,
    createdAt: '2026-05-19T12:00:00Z',
    ...over,
  };
}

beforeEach(() => vi.clearAllMocks());

describe('InboxItemDrawer', () => {
  it('renders item metadata header', async () => {
    vi.mocked(getWorkItemEvents).mockResolvedValue([]);
    const onClose = vi.fn();
    render(<InboxItemDrawer item={item()} onClose={onClose} />);

    expect(screen.getByText(/Item #1/i)).toBeInTheDocument();
    expect(screen.getByText(/Review denial for CLM-1/i)).toBeInTheDocument();
    expect(screen.getByText(/Claim #42/i)).toBeInTheDocument();
  });

  it('renders the chronological event list', async () => {
    vi.mocked(getWorkItemEvents).mockResolvedValue([
      { id: 1, workQueueItemId: 1, eventType: 'created',
        actorUserId: 50, actorEmail: 'tester@x',
        description: 'Created — Review denial for CLM-1',
        occurredAtUtc: '2026-05-19T12:00:00Z' },
      { id: 2, workQueueItemId: 1, eventType: 'claimed',
        actorUserId: 50, actorEmail: 'tester@x',
        description: 'Claimed for self',
        occurredAtUtc: '2026-05-19T12:05:00Z' },
      { id: 3, workQueueItemId: 1, eventType: 'snoozed',
        actorUserId: 50, actorEmail: 'tester@x',
        description: 'Snoozed until 2026-05-20T12:00:00Z',
        occurredAtUtc: '2026-05-19T12:10:00Z' },
    ]);
    render(<InboxItemDrawer item={item()} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Claimed for self/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Snoozed until 2026-05-20/i)).toBeInTheDocument();
    expect(screen.getAllByText(/tester@x/i).length).toBe(3);
  });

  it('shows empty-state when no events recorded', async () => {
    vi.mocked(getWorkItemEvents).mockResolvedValue([]);
    render(<InboxItemDrawer item={item()} onClose={vi.fn()} />);
    expect(await screen.findByText(/No activity recorded yet/i)).toBeInTheDocument();
  });

  it('surfaces a load error in an alert', async () => {
    vi.mocked(getWorkItemEvents).mockRejectedValueOnce(new Error('Network down'));
    render(<InboxItemDrawer item={item()} onClose={vi.fn()} />);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/Network down/i);
  });

  it('calls onClose when the backdrop is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(getWorkItemEvents).mockResolvedValue([]);
    const onClose = vi.fn();
    render(<InboxItemDrawer item={item()} onClose={onClose} />);
    await user.click(screen.getByRole('presentation'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(getWorkItemEvents).mockResolvedValue([]);
    const onClose = vi.fn();
    render(<InboxItemDrawer item={item()} onClose={onClose} />);
    await user.click(screen.getByLabelText('Close detail drawer'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows the snooze banner when item is still snoozed', async () => {
    vi.mocked(getWorkItemEvents).mockResolvedValue([]);
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    render(<InboxItemDrawer item={item({ snoozeUntilUtc: future })} onClose={vi.fn()} />);
    expect(await screen.findByText(/Snoozed until/i)).toBeInTheDocument();
  });

  it('does not show the snooze banner for an expired snooze', async () => {
    vi.mocked(getWorkItemEvents).mockResolvedValue([]);
    const past = '2020-01-01T00:00:00Z';
    render(<InboxItemDrawer item={item({ snoozeUntilUtc: past })} onClose={vi.fn()} />);
    // Loaded state should never include the "Snoozed until" header
    await screen.findByText(/No activity recorded yet/i);
    expect(screen.queryByText(/Snoozed until/i)).not.toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { InboxPage } from '@/pages/Inbox/InboxPage';
import type { WorkQueueItem } from '@/api/billing';

vi.mock('@/api/billing', () => ({
  getInbox: vi.fn(),
  claimWorkItem: vi.fn(),
  completeWorkItem: vi.fn(),
  snoozeWorkItem: vi.fn(),
  wakeWorkItem: vi.fn(),
}));

import {
  getInbox, claimWorkItem, completeWorkItem, snoozeWorkItem, wakeWorkItem,
} from '@/api/billing';

function item(over: Partial<WorkQueueItem> = {}): WorkQueueItem {
  return {
    id: 1,
    type: 'denial',
    description: 'Review denial for claim CLM-1',
    priority: 'high',
    status: 'pending',
    claimId: 42,
    patientId: null,
    dueDate: null,
    assignedTo: null,
    snoozeUntilUtc: null,
    createdAt: '2026-05-19T12:00:00Z',
    ...over,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <InboxPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('confirm', vi.fn(() => true));
  vi.mocked(getInbox).mockResolvedValue({
    data: [item()],
    stats: { total: 1, pending: 1, inProgress: 0, critical: 0, overdue: 0 },
  });
});

describe('InboxPage', () => {
  it('renders the inbox table with priority + type chips', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Review denial for claim/i)).toBeInTheDocument();
    });
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('Denial')).toBeInTheDocument();
    // Claim deep link
    expect(screen.getByRole('link', { name: /Claim #42/i })).toBeInTheDocument();
  });

  it('shows empty state when inbox is clear', async () => {
    vi.mocked(getInbox).mockResolvedValueOnce({
      data: [],
      stats: { total: 0, pending: 0, inProgress: 0, critical: 0, overdue: 0 },
    });
    renderPage();
    expect(await screen.findByText(/Inbox zero/i)).toBeInTheDocument();
  });

  it('claims an unassigned item', async () => {
    const user = userEvent.setup();
    vi.mocked(claimWorkItem).mockResolvedValue(undefined);
    renderPage();
    await screen.findByText(/Review denial/i);

    await user.click(screen.getByRole('button', { name: 'Claim' }));

    await waitFor(() => {
      expect(claimWorkItem).toHaveBeenCalledWith(1);
    });
    expect(await screen.findByText(/Claimed work item #1/i)).toBeInTheDocument();
  });

  it('completes an item after confirmation', async () => {
    const user = userEvent.setup();
    vi.mocked(completeWorkItem).mockResolvedValue(undefined);
    renderPage();
    await screen.findByText(/Review denial/i);

    await user.click(screen.getByRole('button', { name: 'Complete' }));

    await waitFor(() => {
      expect(completeWorkItem).toHaveBeenCalledWith(1);
    });
    expect(await screen.findByText(/Completed work item #1/i)).toBeInTheDocument();
  });

  it('snoozes an item via the dropdown', async () => {
    const user = userEvent.setup();
    vi.mocked(snoozeWorkItem).mockResolvedValue(undefined);
    renderPage();
    await screen.findByText(/Review denial/i);

    await user.selectOptions(screen.getByLabelText(/Snooze item 1/i), 'Tomorrow');

    await waitFor(() => {
      expect(snoozeWorkItem).toHaveBeenCalledWith(1, expect.stringMatching(/^\d{4}-\d{2}-\d{2}/));
    });
    expect(await screen.findByText(/Snoozed #1 until tomorrow/i)).toBeInTheDocument();
  });

  it('wakes a snoozed item', async () => {
    vi.mocked(getInbox).mockResolvedValueOnce({
      data: [item({ snoozeUntilUtc: new Date(Date.now() + 60 * 60 * 1000).toISOString() })],
      stats: { total: 1, pending: 1, inProgress: 0, critical: 0, overdue: 0 },
    });
    vi.mocked(wakeWorkItem).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/snoozed/i);

    await user.click(screen.getByRole('button', { name: 'Wake' }));

    await waitFor(() => {
      expect(wakeWorkItem).toHaveBeenCalledWith(1);
    });
  });

  it('switches between mine and all tabs', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/Review denial/i);

    await user.click(screen.getByRole('button', { name: 'All open' }));
    await waitFor(() => {
      expect(getInbox).toHaveBeenLastCalledWith(false);
    });
  });

  it('flags overdue items in the row', async () => {
    vi.mocked(getInbox).mockResolvedValueOnce({
      data: [item({ dueDate: '2020-01-01T00:00:00Z' })],
      stats: { total: 1, pending: 1, inProgress: 0, critical: 0, overdue: 1 },
    });
    renderPage();
    await screen.findByText(/Review denial/i);
    // "Overdue" stats card always renders — scope to the table cell text
    expect(screen.getByText(/\(overdue\)/i)).toBeInTheDocument();
  });

  it('hides Claim button on already-assigned items', async () => {
    vi.mocked(getInbox).mockResolvedValueOnce({
      data: [item({ assignedTo: 42 })],
      stats: { total: 1, pending: 1, inProgress: 0, critical: 0, overdue: 0 },
    });
    renderPage();
    await screen.findByText(/Review denial/i);
    expect(screen.queryByRole('button', { name: 'Claim' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Complete' })).toBeInTheDocument();
  });
});

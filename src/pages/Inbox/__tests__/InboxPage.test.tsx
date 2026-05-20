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
  bulkWorkItem: vi.fn(),
  getAssignableUsers: vi.fn().mockResolvedValue([]),
  assignWorkItem: vi.fn(),
  getWorkItemEvents: vi.fn().mockResolvedValue([]),
}));

import {
  getInbox, claimWorkItem, completeWorkItem, snoozeWorkItem, wakeWorkItem, bulkWorkItem,
  getAssignableUsers, assignWorkItem,
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

  // ── Bulk actions ────────────────────────────────────────────────

  describe('bulk actions', () => {
    function multi(...over: Partial<WorkQueueItem>[]) {
      return over.map((o, i) => item({
        id: i + 1,
        description: `Item ${o.id ?? i + 1}`,
        ...o,
      }));
    }

    it('toolbar appears only after at least one row is selected', async () => {
      const user = userEvent.setup();
      vi.mocked(getInbox).mockResolvedValueOnce({
        data: multi({ id: 1 }, { id: 2 }),
        stats: { total: 2, pending: 2, inProgress: 0, critical: 0, overdue: 0 },
      });
      renderPage();
      await screen.findByLabelText('Select item 1');

      // No toolbar before selection
      expect(screen.queryByRole('region', { name: /bulk actions/i })).not.toBeInTheDocument();

      await user.click(screen.getByLabelText('Select item 1'));
      expect(await screen.findByText(/1 selected/i)).toBeInTheDocument();
    });

    it('select-all checkbox toggles every row', async () => {
      const user = userEvent.setup();
      vi.mocked(getInbox).mockResolvedValueOnce({
        data: multi({ id: 1 }, { id: 2 }, { id: 3 }),
        stats: { total: 3, pending: 3, inProgress: 0, critical: 0, overdue: 0 },
      });
      renderPage();
      await screen.findByLabelText('Select all items');

      await user.click(screen.getByLabelText('Select all items'));
      expect(await screen.findByText(/3 selected/i)).toBeInTheDocument();
      // Toggle off
      await user.click(screen.getByLabelText('Select all items'));
      expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
    });

    it('Complete all calls bulkWorkItem with selected ids', async () => {
      const user = userEvent.setup();
      vi.mocked(getInbox).mockResolvedValueOnce({
        data: multi({ id: 1 }, { id: 2 }),
        stats: { total: 2, pending: 2, inProgress: 0, critical: 0, overdue: 0 },
      });
      vi.mocked(bulkWorkItem).mockResolvedValue({ succeeded: [1, 2], failed: [] });
      renderPage();
      await screen.findByLabelText('Select all items');
      await user.click(screen.getByLabelText('Select all items'));
      await user.click(screen.getByRole('button', { name: 'Complete all' }));

      await waitFor(() => {
        expect(bulkWorkItem).toHaveBeenCalledWith('complete', [1, 2], {});
      });
      expect(await screen.findByText(/2 items processed/i)).toBeInTheDocument();
    });

    it('Claim all calls bulkWorkItem with action=claim', async () => {
      const user = userEvent.setup();
      vi.mocked(getInbox).mockResolvedValueOnce({
        data: multi({ id: 1 }),
        stats: { total: 1, pending: 1, inProgress: 0, critical: 0, overdue: 0 },
      });
      vi.mocked(bulkWorkItem).mockResolvedValue({ succeeded: [1], failed: [] });
      renderPage();
      await screen.findByLabelText('Select item 1');
      await user.click(screen.getByLabelText('Select item 1'));
      await user.click(screen.getByRole('button', { name: 'Claim all' }));

      await waitFor(() => {
        expect(bulkWorkItem).toHaveBeenCalledWith('claim', [1], {});
      });
    });

    it('Snooze all uses a future ISO timestamp', async () => {
      const user = userEvent.setup();
      vi.mocked(getInbox).mockResolvedValueOnce({
        data: multi({ id: 1 }),
        stats: { total: 1, pending: 1, inProgress: 0, critical: 0, overdue: 0 },
      });
      vi.mocked(bulkWorkItem).mockResolvedValue({ succeeded: [1], failed: [] });
      renderPage();
      await screen.findByLabelText('Select item 1');
      await user.click(screen.getByLabelText('Select item 1'));

      await user.selectOptions(screen.getByLabelText(/Snooze all selected/i), 'Tomorrow');

      await waitFor(() => {
        expect(bulkWorkItem).toHaveBeenCalledWith(
          'snooze',
          [1],
          expect.objectContaining({
            snoozeUntilUtc: expect.stringMatching(/^\d{4}-\d{2}-\d{2}/),
          }),
        );
      });
    });

    it('reports partial failures in the error strip', async () => {
      const user = userEvent.setup();
      vi.mocked(getInbox).mockResolvedValue({
        data: multi({ id: 1, assignedTo: null }, { id: 2, assignedTo: 99 }),
        stats: { total: 2, pending: 2, inProgress: 0, critical: 0, overdue: 0 },
      });
      vi.mocked(bulkWorkItem).mockResolvedValue({
        succeeded: [1],
        failed: [{ id: 2, error: 'Item is already assigned to another user' }],
      });
      renderPage();
      await screen.findByLabelText('Select item 1');
      // Selecting both items individually avoids the select-all checkbox
      // path so we exercise the bulk endpoint with exactly the two ids.
      await user.click(screen.getByLabelText('Select item 1'));
      await user.click(screen.getByLabelText('Select item 2'));
      await user.click(screen.getByRole('button', { name: 'Claim all' }));

      await waitFor(() => {
        expect(bulkWorkItem).toHaveBeenCalled();
      });
      // Both notice ("1 succeeded") and error ("1 item failed (first: ...)")
      // render after the bulk call resolves
      expect(await screen.findByText(/1 item failed/i)).toBeInTheDocument();
      expect(screen.getByText(/already assigned/i)).toBeInTheDocument();
    });

    it('clears selection after a successful bulk action', async () => {
      const user = userEvent.setup();
      vi.mocked(getInbox).mockResolvedValue({
        data: multi({ id: 1 }),
        stats: { total: 1, pending: 1, inProgress: 0, critical: 0, overdue: 0 },
      });
      vi.mocked(bulkWorkItem).mockResolvedValue({ succeeded: [1], failed: [] });
      renderPage();
      await screen.findByLabelText('Select item 1');
      await user.click(screen.getByLabelText('Select item 1'));
      await user.click(screen.getByRole('button', { name: 'Complete all' }));

      await waitFor(() => {
        expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
      });
    });
  });

  // ── Assignment to others ────────────────────────────────────────

  describe('assignment to others', () => {
    function teammate(id: number, lastName: string, firstName = 'Test') {
      return { id, firstName, lastName, email: `${firstName.toLowerCase()}@x` };
    }

    it('per-row Assign… dropdown calls assignWorkItem(id, userId)', async () => {
      const user = userEvent.setup();
      vi.mocked(getAssignableUsers).mockResolvedValue([
        teammate(7, 'Adams'),
        teammate(8, 'Brown'),
      ]);
      vi.mocked(getInbox).mockResolvedValue({
        data: [item({ id: 1 })],
        stats: { total: 1, pending: 1, inProgress: 0, critical: 0, overdue: 0 },
      });
      vi.mocked(assignWorkItem).mockResolvedValue(undefined);

      renderPage();
      await screen.findByLabelText(/Assign item 1 to/i);
      await user.selectOptions(screen.getByLabelText(/Assign item 1 to/i), '8');

      await waitFor(() => {
        expect(assignWorkItem).toHaveBeenCalledWith(1, 8);
      });
      expect(await screen.findByText(/Assigned #1 to Test Brown/i)).toBeInTheDocument();
    });

    it('bulk Assign all to… calls bulkWorkItem with assignToUserId', async () => {
      const user = userEvent.setup();
      vi.mocked(getAssignableUsers).mockResolvedValue([teammate(7, 'Adams')]);
      vi.mocked(getInbox).mockResolvedValue({
        data: [item({ id: 1 }), item({ id: 2, description: 'Item 2' })],
        stats: { total: 2, pending: 2, inProgress: 0, critical: 0, overdue: 0 },
      });
      vi.mocked(bulkWorkItem).mockResolvedValue({ succeeded: [1, 2], failed: [] });

      renderPage();
      await screen.findByLabelText('Select all items');
      await user.click(screen.getByLabelText('Select all items'));
      await user.selectOptions(screen.getByLabelText(/Assign all selected to/i), '7');

      await waitFor(() => {
        expect(bulkWorkItem).toHaveBeenCalledWith('assign', [1, 2], {
          assignToUserId: 7,
        });
      });
    });

    it('hides per-row Assign dropdown when assignable list is empty', async () => {
      vi.mocked(getAssignableUsers).mockResolvedValue([]);
      vi.mocked(getInbox).mockResolvedValue({
        data: [item({ id: 1 })],
        stats: { total: 1, pending: 1, inProgress: 0, critical: 0, overdue: 0 },
      });
      renderPage();
      // Wait for the row to render
      await screen.findByText(/Review denial/i);
      expect(screen.queryByLabelText(/Assign item 1 to/i)).not.toBeInTheDocument();
    });

    it('disables bulk Assign-all select when assignable list is empty', async () => {
      const user = userEvent.setup();
      vi.mocked(getAssignableUsers).mockResolvedValue([]);
      vi.mocked(getInbox).mockResolvedValue({
        data: [item({ id: 1 })],
        stats: { total: 1, pending: 1, inProgress: 0, critical: 0, overdue: 0 },
      });
      renderPage();
      await screen.findByLabelText('Select item 1');
      await user.click(screen.getByLabelText('Select item 1'));

      const bulkAssignSelect = screen.getByLabelText(/Assign all selected to/i) as HTMLSelectElement;
      expect(bulkAssignSelect.disabled).toBe(true);
    });

    it('silently no-ops when the assignable-users fetch rejects', async () => {
      vi.mocked(getAssignableUsers).mockRejectedValueOnce(new Error('403'));
      vi.mocked(getInbox).mockResolvedValue({
        data: [item({ id: 1 })],
        stats: { total: 1, pending: 1, inProgress: 0, critical: 0, overdue: 0 },
      });
      renderPage();
      await screen.findByText(/Review denial/i);
      // No assign dropdowns — the picker just stays empty
      expect(screen.queryByLabelText(/Assign item 1 to/i)).not.toBeInTheDocument();
    });
  });

  it('opens the activity drawer when the description is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(getInbox).mockResolvedValueOnce({
      data: [item({ id: 7 })],
      stats: { total: 1, pending: 1, inProgress: 0, critical: 0, overdue: 0 },
    });
    renderPage();
    await screen.findByText(/Review denial/i);

    await user.click(screen.getByLabelText(/Open details for item 7/i));

    // The drawer mounts a dialog with the item id in its label
    expect(await screen.findByRole('dialog', { name: /Work item #7/i })).toBeInTheDocument();
  });
});

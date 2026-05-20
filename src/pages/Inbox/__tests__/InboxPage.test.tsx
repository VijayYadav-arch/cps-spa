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
  getSavedFilters: vi.fn().mockResolvedValue([]),
  createSavedFilter: vi.fn(),
  deleteSavedFilter: vi.fn(),
  enqueueWorkItem: vi.fn(),
}));

import {
  getInbox, claimWorkItem, completeWorkItem, snoozeWorkItem, wakeWorkItem, bulkWorkItem,
  getAssignableUsers, assignWorkItem,
  getSavedFilters, createSavedFilter, deleteSavedFilter,
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
    // "high" appears in both the filter chip strip and the row priority
    // badge — at least one is enough to confirm the badge rendered.
    expect(screen.getAllByText('high').length).toBeGreaterThanOrEqual(1);
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

    expect(await screen.findByRole('dialog', { name: /Work item #7/i })).toBeInTheDocument();
  });

  // ── Saved filters ──────────────────────────────────────────────

  describe('saved filters', () => {
    it('priority chip filters the visible rows', async () => {
      const user = userEvent.setup();
      vi.mocked(getInbox).mockResolvedValueOnce({
        data: [
          item({ id: 1, priority: 'critical' }),
          item({ id: 2, priority: 'low', description: 'Low one' }),
        ],
        stats: { total: 2, pending: 2, inProgress: 0, critical: 1, overdue: 0 },
      });
      renderPage();
      await screen.findByText(/Review denial/i);

      // Both visible initially
      expect(screen.getByText(/Low one/i)).toBeInTheDocument();

      // Click "critical" chip
      await user.click(screen.getByRole('button', { name: 'critical', pressed: false }));

      // Low row gone; critical row stays
      await waitFor(() => {
        expect(screen.queryByText(/Low one/i)).not.toBeInTheDocument();
      });
      expect(screen.getByText(/Review denial/i)).toBeInTheDocument();
    });

    it('overdue chip filters to overdue rows only', async () => {
      const user = userEvent.setup();
      vi.mocked(getInbox).mockResolvedValueOnce({
        data: [
          item({ id: 1, dueDate: '2020-01-01T00:00:00Z', description: 'Old one' }),
          item({ id: 2, dueDate: null, description: 'No-due one' }),
        ],
        stats: { total: 2, pending: 2, inProgress: 0, critical: 0, overdue: 1 },
      });
      renderPage();
      await screen.findByText(/Old one/i);

      await user.click(screen.getByRole('button', { name: 'overdue' }));

      await waitFor(() => {
        expect(screen.queryByText(/No-due one/i)).not.toBeInTheDocument();
      });
      expect(screen.getByText(/Old one/i)).toBeInTheDocument();
    });

    it('renders saved filter chips and applies one when clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(getSavedFilters).mockResolvedValue([{
        id: 99, userId: 1, organizationId: 1,
        name: 'My overdue', filterJson: '{"overdueOnly":true}',
        createdAt: '2026-05-21T12:00:00Z', updatedAt: '2026-05-21T12:00:00Z',
      }]);
      vi.mocked(getInbox).mockResolvedValueOnce({
        data: [
          item({ id: 1, dueDate: '2020-01-01T00:00:00Z', description: 'Old one' }),
          item({ id: 2, dueDate: null, description: 'No-due one' }),
        ],
        stats: { total: 2, pending: 2, inProgress: 0, critical: 0, overdue: 1 },
      });
      renderPage();
      await screen.findByText(/Old one/i);

      // Saved-filter chip appears in the filter strip
      const chip = await screen.findByRole('button', { name: 'My overdue' });
      await user.click(chip);

      // Only the overdue row remains
      await waitFor(() => {
        expect(screen.queryByText(/No-due one/i)).not.toBeInTheDocument();
      });
      expect(chip).toHaveAttribute('aria-pressed', 'true');
    });

    it('saves the current filter when prompted', async () => {
      const user = userEvent.setup();
      vi.stubGlobal('prompt', vi.fn(() => 'My critical'));
      vi.mocked(createSavedFilter).mockResolvedValue({
        id: 50, userId: 1, organizationId: 1,
        name: 'My critical', filterJson: '{"priority":["critical"],"tab":"mine"}',
        createdAt: '2026-05-21T12:00:00Z', updatedAt: '2026-05-21T12:00:00Z',
      });
      vi.mocked(getInbox).mockResolvedValueOnce({
        data: [item({ id: 1, priority: 'critical' })],
        stats: { total: 1, pending: 1, inProgress: 0, critical: 1, overdue: 0 },
      });
      renderPage();
      await screen.findByText(/Review denial/i);

      // Need to enable a filter so the Save button activates
      await user.click(screen.getByRole('button', { name: 'critical' }));
      await user.click(screen.getByRole('button', { name: /Save current filter/i }));

      await waitFor(() => {
        expect(createSavedFilter).toHaveBeenCalledWith(
          'My critical',
          expect.objectContaining({ priority: ['critical'], tab: 'mine' }),
        );
      });
      // New chip rendered after creation
      expect(await screen.findByRole('button', { name: 'My critical' })).toBeInTheDocument();
    });

    it('deletes a saved filter via its × button', async () => {
      const user = userEvent.setup();
      vi.stubGlobal('confirm', vi.fn(() => true));
      vi.mocked(getSavedFilters).mockResolvedValue([{
        id: 99, userId: 1, organizationId: 1,
        name: 'Old saved', filterJson: '{}',
        createdAt: '2026-05-21T12:00:00Z', updatedAt: '2026-05-21T12:00:00Z',
      }]);
      vi.mocked(deleteSavedFilter).mockResolvedValue(undefined);
      vi.mocked(getInbox).mockResolvedValueOnce({
        data: [item({ id: 1 })],
        stats: { total: 1, pending: 1, inProgress: 0, critical: 0, overdue: 0 },
      });
      renderPage();
      await screen.findByRole('button', { name: 'Old saved' });

      await user.click(screen.getByLabelText(/Delete saved filter Old saved/i));

      await waitFor(() => {
        expect(deleteSavedFilter).toHaveBeenCalledWith(99);
      });
      expect(screen.queryByRole('button', { name: 'Old saved' })).not.toBeInTheDocument();
    });

    it('Save current filter button is disabled with no filters active', async () => {
      vi.mocked(getInbox).mockResolvedValueOnce({
        data: [item({ id: 1 })],
        stats: { total: 1, pending: 1, inProgress: 0, critical: 0, overdue: 0 },
      });
      renderPage();
      await screen.findByText(/Review denial/i);
      expect(screen.getByRole('button', { name: /Save current filter/i }))
        .toHaveProperty('disabled', true);
    });
  });
});

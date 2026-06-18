import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { WorkQueuePage } from '@/pages/Billing/WorkQueuePage';

vi.mock('@/permissions/usePermission', () => ({ usePermission: () => true }));

vi.mock('@/api/billing', async () => {
  const actual = await vi.importActual<typeof import('@/api/billing')>('@/api/billing');
  return {
    ...actual,
    getWorkQueue: vi.fn(),
    getInbox: vi.fn(),
    getWorkQueueStats: vi.fn(),
    getAssignableUsers: vi.fn(),
    claimWorkItem: vi.fn(),
    completeWorkItem: vi.fn(),
  };
});

import {
  getInbox,
  getWorkQueue,
  getWorkQueueStats,
  getAssignableUsers,
  claimWorkItem,
} from '@/api/billing';

function item(id: number, priority = 'urgent', type = 'denied') {
  return {
    id,
    type,
    description: `Item ${id} description`,
    priority,
    status: 'pending',
    claimId: 100 + id,
    patientId: null,
    dueDate: '2026-06-30',
    assignedTo: null,
    snoozeUntilUtc: null,
    createdAt: '2026-06-04T00:00:00Z',
  };
}

const stats = { total: 5, pending: 3, inProgress: 1, critical: 2, overdue: 0 };

function renderPage() {
  return render(
    <MemoryRouter>
      <WorkQueuePage />
    </MemoryRouter>
  );
}

describe('WorkQueuePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getWorkQueue).mockResolvedValue({ data: [item(1), item(2, 'high')], stats });
    vi.mocked(getInbox).mockResolvedValue({ data: [item(1)], stats });
    vi.mocked(getWorkQueueStats).mockResolvedValue(stats);
    vi.mocked(getAssignableUsers).mockResolvedValue([]);
    vi.mocked(claimWorkItem).mockResolvedValue(undefined);
  });

  it('renders heading + stats cards + items', async () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /work queue/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Item 1 description')).toBeInTheDocument();
      expect(screen.getByText('Item 2 description')).toBeInTheDocument();
    });
  });

  it('switches to assigned-to-me filter', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(getWorkQueue).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('tab', { name: /assigned to me/i }));

    await waitFor(() => expect(getInbox).toHaveBeenCalledWith(true));
  });

  it('shows empty state when no items', async () => {
    vi.mocked(getWorkQueue).mockResolvedValueOnce({ data: [], stats });
    renderPage();
    await waitFor(() => expect(screen.getByText(/queue clear/i)).toBeInTheDocument());
  });

  it('shows error on fetch failure', async () => {
    vi.mocked(getWorkQueue).mockRejectedValueOnce(new Error('500'));
    renderPage();
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  it('claims an unassigned item via the row action (M4)', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getAllByText('Item 1 description')[0]).toBeInTheDocument());

    await user.click(screen.getAllByRole('button', { name: 'Claim' })[0]);

    await waitFor(() => expect(claimWorkItem).toHaveBeenCalledWith(1));
  });
});

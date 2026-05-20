import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewWorkItemDialog } from '@/pages/Inbox/NewWorkItemDialog';

vi.mock('@/api/billing', () => ({
  enqueueWorkItem: vi.fn(),
}));

import { enqueueWorkItem } from '@/api/billing';

beforeEach(() => vi.clearAllMocks());

const baseItem = {
  id: 1, type: 'follow-up', description: 'X', priority: 'medium',
  status: 'pending', claimId: null, patientId: null, dueDate: null,
  assignedTo: null, snoozeUntilUtc: null, createdAt: '2026-05-21T12:00:00Z',
};

describe('NewWorkItemDialog', () => {
  it('rejects empty description client-side', async () => {
    const user = userEvent.setup();
    render(<NewWorkItemDialog onClose={vi.fn()} onCreated={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /Create/ }));

    expect(await screen.findByText(/Description is required/i)).toBeInTheDocument();
    expect(enqueueWorkItem).not.toHaveBeenCalled();
  });

  it('submits a new item with the form values', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    vi.mocked(enqueueWorkItem).mockResolvedValue({ ...baseItem, id: 42 });

    render(<NewWorkItemDialog onClose={vi.fn()} onCreated={onCreated} />);

    await user.type(screen.getByLabelText(/Description/i), 'Call patient about denial');
    await user.selectOptions(screen.getByLabelText(/Priority/i), 'high');
    await user.type(screen.getByLabelText(/Claim ID/i), '99');
    await user.click(screen.getByRole('button', { name: /Create/ }));

    await waitFor(() => {
      expect(enqueueWorkItem).toHaveBeenCalledWith(expect.objectContaining({
        priority: 'high',
        description: 'Call patient about denial',
        claimId: 99,
      }));
    });
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: 42 }));
  });

  it('closes when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<NewWorkItemDialog onClose={onClose} onCreated={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Cancel/ }));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes when the backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<NewWorkItemDialog onClose={onClose} onCreated={vi.fn()} />);
    await user.click(screen.getByRole('presentation'));
    expect(onClose).toHaveBeenCalled();
  });

  it('surfaces backend errors', async () => {
    const user = userEvent.setup();
    vi.mocked(enqueueWorkItem).mockRejectedValueOnce({
      response: { data: { error: 'Permission denied' } },
    });

    render(<NewWorkItemDialog onClose={vi.fn()} onCreated={vi.fn()} />);
    await user.type(screen.getByLabelText(/Description/i), 'X');
    await user.click(screen.getByRole('button', { name: /Create/ }));

    expect(await screen.findByText('Permission denied')).toBeInTheDocument();
  });
});

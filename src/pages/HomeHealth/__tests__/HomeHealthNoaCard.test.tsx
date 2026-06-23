import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HomeHealthNoaCard } from '@/pages/HomeHealth/HomeHealthNoaCard';
import * as hhApi from '@/api/homehealth';

vi.mock('@/api/homehealth');

describe('HomeHealthNoaCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the deadline + a submit action for a pending NOA', async () => {
    vi.mocked(hhApi.getNoa).mockResolvedValue({
      id: 1, episodeId: 42, deadlineDate: '2026-06-06', status: 'pending', submissionMode: null, submittedAt: null,
    });
    vi.mocked(hhApi.submitNoa).mockResolvedValue({
      id: 1, episodeId: 42, deadlineDate: '2026-06-06', status: 'submitted', submissionMode: 'manual', submittedAt: '2026-06-04T00:00:00Z',
    });

    render(<HomeHealthNoaCard episodeId={42} canManage />);
    await waitFor(() => expect(screen.getByText('2026-06-06')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /submit noa/i }));
    await waitFor(() => expect(hhApi.submitNoa).toHaveBeenCalledWith(42, 'manual'));
  });

  it('hides the submit action once submitted', async () => {
    vi.mocked(hhApi.getNoa).mockResolvedValue({
      id: 1, episodeId: 42, deadlineDate: '2026-06-06', status: 'submitted', submissionMode: 'manual', submittedAt: '2026-06-04T00:00:00Z',
    });
    render(<HomeHealthNoaCard episodeId={42} canManage />);
    await waitFor(() => expect(screen.getByText('submitted')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /submit noa/i })).not.toBeInTheDocument();
  });
});

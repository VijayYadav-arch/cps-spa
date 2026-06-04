import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IdgMeetingsPage } from '@/pages/Admin/IdgMeetings/IdgMeetingsPage';

vi.mock('@/api/client', () => ({
  apiClient: { get: vi.fn() },
}));

import { apiClient } from '@/api/client';

function meeting(id: number) {
  return {
    id,
    meetingDate: '2026-06-15T00:00:00Z',
    hospiceElectionId: null,
    facilitatorUserId: null,
    status: 'Scheduled' as const,
    attendees: JSON.stringify(['Alice', 'Bob']),
    patientsReviewed: JSON.stringify([1, 2, 3]),
    notes: null,
    actionItems: JSON.stringify(['Follow up']),
    nextMeetingDate: null,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <IdgMeetingsPage />
    </MemoryRouter>
  );
}

describe('IdgMeetingsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders heading + meeting rows with parsed JSON counts', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { data: [meeting(1)] },
    } as never);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('2 attendees')).toBeInTheDocument();
      expect(screen.getByText('3 patients')).toBeInTheDocument();
      expect(screen.getByText('1 items')).toBeInTheDocument();
    });
  });

  it('shows empty state', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: [] } } as never);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/no idg meetings scheduled/i)).toBeInTheDocument()
    );
  });

  it('shows error on fetch failure', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('500'));
    renderPage();
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});

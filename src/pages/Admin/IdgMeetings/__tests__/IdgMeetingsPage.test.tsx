import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { IdgMeetingsPage } from '@/pages/Admin/IdgMeetings/IdgMeetingsPage';

vi.mock('@/api/client', () => ({
  apiClient: { get: vi.fn() },
}));

vi.mock('@/api/hospice', async (orig) => ({
  ...(await orig<object>()),
  streamIdgPrepBrief: vi.fn(),
}));

import { apiClient } from '@/api/client';
import { streamIdgPrepBrief } from '@/api/hospice';

function meeting(id: number, over: Partial<{
  prepBriefText: string | null;
  prepBriefGeneratedAtUtc: string | null;
}> = {}) {
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
    prepBriefText: null as string | null,
    prepBriefGeneratedAtUtc: null as string | null,
    ...over,
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

  it('generates a prep brief and shows the AI toggle + expanded content', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { data: [meeting(1)] },
    } as never);
    vi.mocked(streamIdgPrepBrief).mockImplementationOnce(async (_id, handlers) => {
      handlers.onDelta('Patient #1 -- 3 visits since last IDG. ');
      handlers.onDone({
        prepBriefText: 'Patient #1 -- 3 visits since last IDG. Discuss pain plan.',
        prepBriefGeneratedAtUtc: '2026-06-14T10:00:00Z',
      });
    });
    renderPage();
    await screen.findByText('2 attendees');

    await user.click(screen.getByRole('button', { name: /^generate$/i }));

    await waitFor(() => {
      expect(streamIdgPrepBrief).toHaveBeenCalled();
    });
    expect(vi.mocked(streamIdgPrepBrief).mock.calls[0][0]).toBe(1);
    expect(await screen.findByText(/3 visits since last IDG/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^regenerate$/i })).toBeInTheDocument();
  });

  it('shows existing brief when meeting already has one', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { data: [meeting(1, {
        prepBriefText: 'Prior brief content',
        prepBriefGeneratedAtUtc: '2026-06-13T10:00:00Z',
      })] },
    } as never);
    renderPage();
    await screen.findByText('2 attendees');

    expect(screen.queryByText(/Prior brief content/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /show brief for meeting 1/i }));
    expect(await screen.findByText(/Prior brief content/)).toBeInTheDocument();
  });

  it('shows error when prep-brief generation fails', async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { data: [meeting(1)] },
    } as never);
    vi.mocked(streamIdgPrepBrief).mockImplementationOnce(async (_id, handlers) => {
      handlers.onError({ status: 0, error: 'ai_provider_unreachable' });
    });
    renderPage();
    await screen.findByText('2 attendees');

    await user.click(screen.getByRole('button', { name: /^generate$/i }));
    expect(await screen.findByText(/couldn't reach the ai service/i)).toBeInTheDocument();
  });
});

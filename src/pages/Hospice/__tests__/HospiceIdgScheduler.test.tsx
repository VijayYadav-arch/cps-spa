import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HospiceIdgScheduler } from '@/pages/Hospice/HospiceIdgScheduler';

vi.mock('@/api/hospice', () => ({
  listUpcomingIdg: vi.fn(),
  scheduleIdgMeeting: vi.fn(),
}));

import { listUpcomingIdg, scheduleIdgMeeting } from '@/api/hospice';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/patients/1/hospice/7/idg']}>
      <Routes>
        <Route
          path="/patients/:id/hospice/:electionId/idg"
          element={<HospiceIdgScheduler />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('HospiceIdgScheduler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders empty state when no upcoming meetings', async () => {
    vi.mocked(listUpcomingIdg).mockResolvedValueOnce({ data: [] });
    renderPage();
    await waitFor(() => expect(screen.getByText(/No upcoming meetings/i)).toBeInTheDocument());
  });

  it('Schedule button calls scheduleIdgMeeting with the CMS-compliant default attendee set', async () => {
    vi.mocked(listUpcomingIdg).mockResolvedValue({ data: [] });
    vi.mocked(scheduleIdgMeeting).mockResolvedValueOnce({
      id: 1,
      meetingDate: '2026-05-20T09:00:00Z',
      hospiceElectionId: 7,
      facilitatorUserId: null,
      status: 'Scheduled',
      attendees: '[]',
      patientsReviewed: '[]',
      notes: null,
      actionItems: null,
      nextMeetingDate: null,
    });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /Schedule/i }));
    await user.click(screen.getByRole('button', { name: /Schedule/i }));
    await waitFor(() =>
      expect(scheduleIdgMeeting).toHaveBeenCalledWith(expect.objectContaining({
        hospiceElectionId: 7,
        attendees: expect.arrayContaining([
          expect.objectContaining({ role: 'physician' }),
          expect.objectContaining({ role: 'rn' }),
          expect.objectContaining({ role: 'social_worker' }),
          expect.objectContaining({ role: 'chaplain' }),
        ]),
      })),
    );
  });
});

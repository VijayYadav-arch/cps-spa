import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HospiceCarePlanReviewLog } from '@/pages/Hospice/HospiceCarePlanReviewLog';

vi.mock('@/api/hospice', () => ({
  listCarePlanReviews: vi.fn(),
  recordCarePlanReview: vi.fn(),
  listUpcomingIdg: vi.fn().mockResolvedValue({ data: [] }),
}));

import { listCarePlanReviews, recordCarePlanReview } from '@/api/hospice';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/patients/1/hospice/7/care-plan-reviews/20']}>
      <Routes>
        <Route
          path="/patients/:id/hospice/:electionId/care-plan-reviews/:carePlanId"
          element={<HospiceCarePlanReviewLog />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('HospiceCarePlanReviewLog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows empty state', async () => {
    vi.mocked(listCarePlanReviews).mockResolvedValueOnce({ data: [] });
    renderPage();
    await waitFor(() => expect(screen.getByText(/No reviews recorded/i)).toBeInTheDocument());
  });

  it('records a review through the inline form', async () => {
    vi.mocked(listCarePlanReviews)
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({
        data: [
          {
            id: 1,
            carePlanId: 20,
            idgMeetingId: null,
            reviewDate: '2026-05-10',
            reviewedByUserId: 99,
            outcome: 'NoChange',
            changesSummary: null,
            nextReviewDate: '2026-05-25',
            createdAt: '2026-05-10T00:00:00Z',
          },
        ],
      });
    vi.mocked(recordCarePlanReview).mockResolvedValueOnce({
      id: 1,
      carePlanId: 20,
      idgMeetingId: null,
      reviewDate: '2026-05-10',
      reviewedByUserId: 99,
      outcome: 'NoChange',
      changesSummary: null,
      nextReviewDate: '2026-05-25',
      createdAt: '2026-05-10T00:00:00Z',
    });

    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByRole('button', { name: /Record New Review/i }));
    await user.click(screen.getByRole('button', { name: /Record New Review/i }));
    await user.click(screen.getByRole('button', { name: /Record$/i }));

    await waitFor(() => expect(recordCarePlanReview).toHaveBeenCalledWith(20, expect.objectContaining({
      outcome: 'NoChange',
    })));
  });
});

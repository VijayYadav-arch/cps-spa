import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HospiceHopeOverdue } from '@/pages/Hospice/HospiceHopeOverdue';

vi.mock('@/api/hospice', () => ({
  listHopeOverdue: vi.fn(),
}));

import { listHopeOverdue } from '@/api/hospice';

function renderPage() {
  return render(
    <MemoryRouter>
      <HospiceHopeOverdue />
    </MemoryRouter>,
  );
}

describe('HospiceHopeOverdue', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows loading then empty state', async () => {
    vi.mocked(listHopeOverdue).mockResolvedValueOnce({ data: [] });
    renderPage();
    expect(screen.getByRole('status')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/No HOPE assessments overdue/i)).toBeInTheDocument());
  });

  it('renders overdue rows', async () => {
    vi.mocked(listHopeOverdue).mockResolvedValueOnce({
      data: [
        {
          id: 1,
          hospiceElectionId: 7,
          submissionType: 'Admission',
          targetDate: '2026-03-01',
          status: 'Draft',
          payload: '{}',
          schemaVersion: 'HOPE-1.0',
          signedByUserId: null,
          signedAt: null,
          submittedAt: null,
          cmsConfirmation: null,
          rejectionReason: null,
          deadlineDate: '2026-03-06',
          daysUntilDeadline: -73,
          createdAt: '2026-03-01T00:00:00Z',
        },
      ],
    });
    renderPage();
    await waitFor(() => expect(screen.getByText('Admission')).toBeInTheDocument());
    expect(screen.getByText('73')).toBeInTheDocument();
  });

  it('shows error on rejection', async () => {
    vi.mocked(listHopeOverdue).mockRejectedValueOnce(new Error('boom'));
    renderPage();
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});

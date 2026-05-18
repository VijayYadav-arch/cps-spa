import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HospiceSummaryCard } from '@/components/HospiceSummaryCard';

vi.mock('@/api/hospice', () => ({
  getPatientElections: vi.fn(),
}));

import { getPatientElections } from '@/api/hospice';

function renderCard() {
  return render(
    <MemoryRouter>
      <HospiceSummaryCard patientId={1} />
    </MemoryRouter>,
  );
}

describe('HospiceSummaryCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders nothing while loading', () => {
    vi.mocked(getPatientElections).mockReturnValue(new Promise(() => {}));
    const { container } = renderCard();
    expect(container.firstChild).toBeNull();
  });

  it('shows "Start Hospice Election" when no elections exist', async () => {
    vi.mocked(getPatientElections).mockResolvedValueOnce({ data: [] });
    renderCard();
    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: /Start Hospice Election/i }),
      ).toBeInTheDocument();
    });
  });

  it('shows current election summary when active', async () => {
    vi.mocked(getPatientElections).mockResolvedValueOnce({
      data: [
        {
          id: 7,
          patientId: 1,
          admissionId: null,
          electionDate: '2026-05-15',
          electionType: 'InitialElection',
          lifetimeDaysAtElection: 0,
          status: 'Active',
          revokedAt: null,
          currentPeriod: {
            id: 1,
            periodNumber: 1,
            startDate: '2026-05-15',
            endDate: '2026-08-12',
            status: 'Active',
            recertDueDate: '2026-07-28',
            daysUntilRecertDue: 74,
            certificationId: null,
          },
          noe: {
            id: 1,
            status: 'Pending',
            deadlineDate: '2026-05-20',
            daysUntilDeadline: 5,
            submittedAt: null,
            documentUrl: null,
            clearinghouseConfirmation: null,
            payerCode: 'MEDICARE_A',
          },
        },
      ],
    });
    renderCard();
    await waitFor(() => {
      expect(screen.getByText(/Period 1/i)).toBeInTheDocument();
      expect(screen.getByText(/NOE: Pending/i)).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /Manage Hospice Election/i }),
      ).toBeInTheDocument();
    });
  });
});

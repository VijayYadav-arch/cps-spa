import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HospiceWorkQueue } from '@/pages/Hospice/HospiceWorkQueue';

vi.mock('@/api/hospice', () => ({
  getWorkQueue: vi.fn(),
}));

import { getWorkQueue } from '@/api/hospice';

function renderPage() {
  return render(
    <MemoryRouter>
      <HospiceWorkQueue />
    </MemoryRouter>,
  );
}

describe('HospiceWorkQueue', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows loading state initially', () => {
    vi.mocked(getWorkQueue).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders all five tabs with empty state when no items', async () => {
    vi.mocked(getWorkQueue).mockResolvedValueOnce({
      recertsDue: [],
      noeOverdue: [],
      hopeOverdue: [],
      idgOverdue: [],
      carePlanReviewsDue: [],
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Recerts Due/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /NOE Overdue/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /HOPE Overdue/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /IDG Overdue/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Care Plan Reviews Due/i })).toBeInTheDocument();
      expect(screen.getByText(/No recerts due/i)).toBeInTheDocument();
    });
  });

  it('switches tabs when clicked', async () => {
    vi.mocked(getWorkQueue).mockResolvedValueOnce({
      recertsDue: [
        {
          type: 'RecertDue',
          electionId: 1,
          patientId: 10,
          patientName: 'Jane Doe',
          dueDate: '2026-06-01',
          daysUntilDue: 5,
          daysOverdue: null,
          periodNumber: 2,
        },
      ],
      noeOverdue: [
        {
          type: 'NoeOverdue',
          electionId: 2,
          patientId: 11,
          patientName: 'John Smith',
          dueDate: '2026-05-10',
          daysUntilDue: null,
          daysOverdue: 5,
          periodNumber: null,
        },
      ],
      hopeOverdue: [],
      idgOverdue: [],
      carePlanReviewsDue: [],
    });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByText('Jane Doe'));
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.queryByText('John Smith')).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /NOE Overdue/i }));
    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  it('shows error when API rejects', async () => {
    vi.mocked(getWorkQueue).mockRejectedValueOnce(new Error('boom'));
    renderPage();
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});

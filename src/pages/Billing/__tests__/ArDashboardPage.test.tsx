import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ArDashboardPage } from '@/pages/Billing/ArDashboardPage';
import type { ArDashboardSummary } from '@/api/billing';

vi.mock('@/api/billing', () => ({
  getArDashboard: vi.fn(),
  logArCall: vi.fn(),
}));

import { getArDashboard, logArCall } from '@/api/billing';

function summary(over: Partial<ArDashboardSummary> = {}): ArDashboardSummary {
  return {
    asOfUtc: '2026-05-19T12:00:00Z',
    totalFollowUpClaims: 3,
    totalAmount: 5000,
    amountOver90Days: 1000,
    actionsDueToday: 1,
    actionsOverdue: 1,
    actionQueue: [
      {
        claimId: 1,
        claimNumber: 'C-OVERDUE',
        patientName: 'Doe, John',
        payer: 'MEDICARE',
        amount: 1500,
        daysAged: 75,
        nextFollowUpDate: '2026-05-15T00:00:00Z',
        daysUntilFollowUp: -4,
        lastContactedAt: '2026-05-10T00:00:00Z',
      },
      {
        claimId: 2,
        claimNumber: 'C-TODAY',
        patientName: 'Smith, Jane',
        payer: 'MEDICAID',
        amount: 800,
        daysAged: 30,
        nextFollowUpDate: '2026-05-19T00:00:00Z',
        daysUntilFollowUp: 0,
        lastContactedAt: null,
      },
    ],
    byPayer: [
      {
        payer: 'MEDICARE',
        claimCount: 2,
        totalAmount: 3500,
        bucket0To30Count: 1,
        bucket31To60Count: 0,
        bucket61To90Count: 0,
        over90Count: 1,
        over90Amount: 1000,
      },
      {
        payer: 'MEDICAID',
        claimCount: 1,
        totalAmount: 1500,
        bucket0To30Count: 1,
        bucket31To60Count: 0,
        bucket61To90Count: 0,
        over90Count: 0,
        over90Amount: 0,
      },
    ],
    ...over,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ArDashboardPage />
    </MemoryRouter>,
  );
}

describe('ArDashboardPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders metric cards', async () => {
    vi.mocked(getArDashboard).mockResolvedValueOnce(summary());
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Follow-Up Claims/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Total AR/i)).toBeInTheDocument();
    expect(screen.getByText(/> 90-Day AR/i)).toBeInTheDocument();
    expect(screen.getByText(/Actions Due Today/i)).toBeInTheDocument();
    expect(screen.getByText(/Actions Overdue/i)).toBeInTheDocument();
  });

  it('shows action queue with overdue and today labels', async () => {
    vi.mocked(getArDashboard).mockResolvedValueOnce(summary());
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('C-OVERDUE')).toBeInTheDocument();
    });
    expect(screen.getByText(/4d overdue/i)).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('shows by-payer table with > 90 highlights', async () => {
    vi.mocked(getArDashboard).mockResolvedValueOnce(summary());
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/AR by Payer/i)).toBeInTheDocument();
    });
    // Both payers appear (in action queue + by-payer table)
    expect(screen.getAllByText('MEDICARE').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('MEDICAID').length).toBeGreaterThanOrEqual(1);
  });

  it('logs a call via prompts', async () => {
    const user = userEvent.setup();
    vi.mocked(getArDashboard).mockResolvedValue(summary());
    vi.mocked(logArCall).mockResolvedValueOnce({ data: {} });

    const promptSpy = vi.spyOn(window, 'prompt')
      .mockReturnValueOnce('Acme Rep')             // contact
      .mockReturnValueOnce('promised-payment')      // outcome
      .mockReturnValueOnce('will pay Friday')       // note
      .mockReturnValueOnce('');                     // next date blank

    renderPage();
    const [firstLogBtn] = await screen.findAllByRole('button', { name: 'Log Call' });
    await user.click(firstLogBtn);

    await waitFor(() => {
      expect(logArCall).toHaveBeenCalledWith(1, expect.objectContaining({
        contactName: 'Acme Rep',
        outcome: 'promised-payment',
        nextFollowUpDate: null,
      }));
    });
    promptSpy.mockRestore();
  });

  it('rejects invalid outcome', async () => {
    const user = userEvent.setup();
    vi.mocked(getArDashboard).mockResolvedValue(summary());

    const promptSpy = vi.spyOn(window, 'prompt')
      .mockReturnValueOnce('Acme')
      .mockReturnValueOnce('bogus-outcome');

    renderPage();
    const [firstLogBtn] = await screen.findAllByRole('button', { name: 'Log Call' });
    await user.click(firstLogBtn);

    expect(logArCall).not.toHaveBeenCalled();
    promptSpy.mockRestore();
  });

  it('shows empty state when action queue is empty', async () => {
    vi.mocked(getArDashboard).mockResolvedValueOnce(
      summary({ actionQueue: [], actionsDueToday: 0, actionsOverdue: 0 }),
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Great job staying on top of AR/i)).toBeInTheDocument();
    });
  });
});

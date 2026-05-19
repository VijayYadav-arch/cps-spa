import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { StatementsPage } from '@/pages/Billing/StatementsPage';
import type {
  DunningQueueResponse,
  StatementRun,
} from '@/api/billing';

vi.mock('@/api/billing', () => ({
  listStatementRuns: vi.fn(),
  getStatementDunningQueue: vi.fn(),
  generateStatementRun: vi.fn(),
  markStatementSent: vi.fn(),
  recordStatementPayment: vi.fn(),
  writeOffStatement: vi.fn(),
  escalateStatement: vi.fn(),
}));

import {
  escalateStatement,
  generateStatementRun,
  getStatementDunningQueue,
  listStatementRuns,
  markStatementSent,
  recordStatementPayment,
  writeOffStatement,
} from '@/api/billing';

function run(over: Partial<StatementRun> = {}): StatementRun {
  return {
    id: 1,
    patientId: 100,
    patientName: 'Doe, Jane',
    status: 'draft',
    dunningCycle: 1,
    statementDate: '2026-05-19T00:00:00Z',
    dueDate: '2026-06-18T00:00:00Z',
    totalCharges: 1000,
    totalPayments: 700,
    totalAdjustments: 0,
    patientBalance: 300,
    amountPaid: 0,
    sentAt: null,
    paidAt: null,
    previousRunId: null,
    lineItems: [
      {
        claimId: 5, claimNumber: 'C-1',
        serviceDate: '2026-04-15T00:00:00Z',
        description: 'MEDICARE claim (paid)',
        chargeAmount: 1000, paidAmount: 700, adjustmentAmount: 0,
        patientBalance: 300,
      },
    ],
    ...over,
  };
}

function dunning(over: Partial<DunningQueueResponse> = {}): DunningQueueResponse {
  return {
    asOfUtc: '2026-05-19T00:00:00Z',
    cycle2Eligible: 0,
    cycle3Eligible: 0,
    entries: [],
    ...over,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <StatementsPage />
    </MemoryRouter>,
  );
}

describe('StatementsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders dunning metric cards + statement table', async () => {
    vi.mocked(listStatementRuns).mockResolvedValueOnce({ data: [run()] });
    vi.mocked(getStatementDunningQueue).mockResolvedValueOnce(dunning({ cycle2Eligible: 2 }));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Doe, Jane')).toBeInTheDocument();
    });
    expect(screen.getByText(/Cycle 2 Due/i)).toBeInTheDocument();
    expect(screen.getByText(/Cycle 3 Due/i)).toBeInTheDocument();
  });

  it('shows empty state for empty filter', async () => {
    vi.mocked(listStatementRuns).mockResolvedValueOnce({ data: [] });
    vi.mocked(getStatementDunningQueue).mockResolvedValueOnce(dunning());
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/No statement runs match/i)).toBeInTheDocument();
    });
  });

  it('generates a statement via prompt', async () => {
    const user = userEvent.setup();
    vi.mocked(listStatementRuns).mockResolvedValue({ data: [] });
    vi.mocked(getStatementDunningQueue).mockResolvedValue(dunning());
    vi.mocked(generateStatementRun).mockResolvedValueOnce(run());

    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValueOnce('100');
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Generate Statement/i }));

    await waitFor(() => {
      expect(generateStatementRun).toHaveBeenCalledWith(100);
    });
    promptSpy.mockRestore();
  });

  it('marks a draft run as sent', async () => {
    const user = userEvent.setup();
    vi.mocked(listStatementRuns).mockResolvedValue({ data: [run()] });
    vi.mocked(getStatementDunningQueue).mockResolvedValue(dunning());
    vi.mocked(markStatementSent).mockResolvedValueOnce(run({ status: 'sent' }));

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Mark Sent' }));

    await waitFor(() => {
      expect(markStatementSent).toHaveBeenCalledWith(1);
    });
  });

  it('records a payment via prompt', async () => {
    const user = userEvent.setup();
    vi.mocked(listStatementRuns).mockResolvedValue({ data: [run({ status: 'sent' })] });
    vi.mocked(getStatementDunningQueue).mockResolvedValue(dunning());
    vi.mocked(recordStatementPayment).mockResolvedValueOnce(
      run({ status: 'partial-pay', amountPaid: 100 }),
    );

    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValueOnce('100');
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Record Payment' }));

    await waitFor(() => {
      expect(recordStatementPayment).toHaveBeenCalledWith(1, 100);
    });
    promptSpy.mockRestore();
  });

  it('confirms before write off', async () => {
    const user = userEvent.setup();
    vi.mocked(listStatementRuns).mockResolvedValue({ data: [run({ status: 'sent' })] });
    vi.mocked(getStatementDunningQueue).mockResolvedValue(dunning());

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Write Off' }));
    expect(writeOffStatement).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('escalates to next cycle', async () => {
    const user = userEvent.setup();
    vi.mocked(listStatementRuns).mockResolvedValue({ data: [run({ status: 'sent' })] });
    vi.mocked(getStatementDunningQueue).mockResolvedValue(dunning());
    vi.mocked(escalateStatement).mockResolvedValueOnce(
      run({ id: 2, status: 'draft', dunningCycle: 2, previousRunId: 1 }),
    );

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Escalate' }));

    await waitFor(() => {
      expect(escalateStatement).toHaveBeenCalledWith(1);
    });
  });

  it('opens detail panel with line items', async () => {
    const user = userEvent.setup();
    vi.mocked(listStatementRuns).mockResolvedValue({ data: [run()] });
    vi.mocked(getStatementDunningQueue).mockResolvedValue(dunning());

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Details' }));

    expect(screen.getByText(/Run #1/i)).toBeInTheDocument();
    expect(screen.getByText(/Line Items/i)).toBeInTheDocument();
    expect(screen.getByText('C-1')).toBeInTheDocument();
  });
});

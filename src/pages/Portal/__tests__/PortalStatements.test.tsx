import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PortalStatements } from '@/pages/Portal/PortalStatements';
import { PortalStatementDetail } from '@/pages/Portal/PortalStatementDetail';
import userEvent from '@testing-library/user-event';

vi.mock('@/portal/portalApi', () => ({
  portalStatements: vi.fn(),
  portalStatement: vi.fn(),
  portalPayStatement: vi.fn(),
}));

vi.mock('@/portal/PortalAuthContext', () => ({
  usePortalAuth: () => ({
    me: { patientId: 100, relationshipLabel: 'Daughter', email: null, phoneNumber: null },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

import { portalStatements, portalStatement, portalPayStatement } from '@/portal/portalApi';

beforeEach(() => vi.clearAllMocks());

function st(over: Record<string, unknown> = {}) {
  return {
    id: 1,
    patientId: 100,
    status: 'sent',
    statementDate: '2026-04-01T00:00:00Z',
    dueDate: '2026-05-01T00:00:00Z',
    patientBalance: 250,
    amountPaid: 0,
    balanceRemaining: 250,
    dunningCycle: 1,
    paidAt: null,
    lineItems: [],
    ...over,
  };
}

describe('PortalStatements list', () => {
  it('shows an empty-state message when no statements', async () => {
    vi.mocked(portalStatements).mockResolvedValue([]);
    render(<MemoryRouter><PortalStatements /></MemoryRouter>);
    expect(await screen.findByText(/no statements on file/i)).toBeInTheDocument();
  });

  it('renders rows and a Pay button only on owed statements', async () => {
    vi.mocked(portalStatements).mockResolvedValue([
      st({ id: 1, status: 'sent', patientBalance: 250 }),
      st({ id: 2, status: 'paid', patientBalance: 100, amountPaid: 100 }),
    ]);
    render(<MemoryRouter><PortalStatements /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('sent')).toBeInTheDocument();
    });
    expect(screen.getByText('paid')).toBeInTheDocument();
    const payLinks = screen.getAllByRole('link', { name: 'Pay' });
    expect(payLinks).toHaveLength(1);
  });
});

describe('PortalStatementDetail', () => {
  it('renders balance and a payment form', async () => {
    vi.mocked(portalStatement).mockResolvedValue(
      st({ id: 5, status: 'sent', patientBalance: 300, amountPaid: 50, balanceRemaining: 250,
        lineItems: [{ claimId: 1, serviceDate: '2026-04-01', description: 'Visit', balance: 250 }] }),
    );
    render(
      <MemoryRouter initialEntries={['/portal/statements/5']}>
        <Routes>
          <Route path="/portal/statements/:runId" element={<PortalStatementDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Balance due/i)).toBeInTheDocument();
    });
    // $250.00 may appear in both the balance hero and the line items
    expect(screen.getAllByText('$250.00').length).toBeGreaterThanOrEqual(1);
    // Form fields exist
    expect(screen.getByLabelText('Amount')).toBeInTheDocument();
    expect(screen.getByLabelText('Card number')).toBeInTheDocument();
  });

  it('submits a payment and renders the confirmation', async () => {
    const user = userEvent.setup();
    vi.mocked(portalStatement).mockResolvedValue(
      st({ id: 5, status: 'sent', patientBalance: 300, amountPaid: 0, balanceRemaining: 300 }),
    );
    vi.mocked(portalPayStatement).mockResolvedValue({
      paymentId: 42,
      statementRunId: 5,
      confirmationNumber: 'CONF-123',
      amount: 300,
      method: 'card',
      last4: '1111',
      newStatus: 'paid',
      newBalanceRemaining: 0,
      paidAtUtc: '2026-05-20T12:00:00Z',
    });
    render(
      <MemoryRouter initialEntries={['/portal/statements/5']}>
        <Routes>
          <Route path="/portal/statements/:runId" element={<PortalStatementDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText(/Balance due/i);

    await user.type(screen.getByLabelText('Card number'), '4111111111111111');
    await user.type(screen.getByLabelText('Name on card'), 'Daughter Doe');
    await user.click(screen.getByRole('button', { name: /Pay \$300/ }));

    await waitFor(() => {
      expect(screen.getByText('Payment received')).toBeInTheDocument();
    });
    expect(screen.getByText('CONF-123')).toBeInTheDocument();
    expect(portalPayStatement).toHaveBeenCalledWith(100, 5, expect.objectContaining({
      amount: 300, method: 'card', cardNumber: '4111111111111111',
    }));
  });

  it('rejects a too-short card number client side', async () => {
    const user = userEvent.setup();
    vi.mocked(portalStatement).mockResolvedValue(st({ balanceRemaining: 100 }));
    render(
      <MemoryRouter initialEntries={['/portal/statements/1']}>
        <Routes>
          <Route path="/portal/statements/:runId" element={<PortalStatementDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText(/Balance due/i);
    await user.type(screen.getByLabelText('Card number'), '111');
    await user.click(screen.getByRole('button', { name: /Pay/ }));

    expect(await screen.findByText(/at least 12 digits/i)).toBeInTheDocument();
    expect(portalPayStatement).not.toHaveBeenCalled();
  });
});

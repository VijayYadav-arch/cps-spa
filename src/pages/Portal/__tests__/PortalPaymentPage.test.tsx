import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PortalPaymentPage } from '@/pages/Portal/PortalPaymentPage';
import type { StatementRun } from '@/api/billing';

vi.mock('@/api/billing', () => ({
  getStatementRun: vi.fn(),
  recordStatementPayment: vi.fn(),
}));

import { getStatementRun, recordStatementPayment } from '@/api/billing';

// Mock the /me query seam so usePermission resolves synchronously without a
// QueryClientProvider. Real usePermission logic still runs against this data.
vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue(
    { data: { permissions } } as unknown as ReturnType<typeof useUserRoles>,
  );
}

function run(over: Partial<StatementRun> = {}): StatementRun {
  return {
    id: 7,
    patientId: 100,
    patientName: 'Doe, Jane',
    status: 'sent',
    dunningCycle: 1,
    statementDate: '2026-05-01T00:00:00Z',
    dueDate: '2026-05-31T00:00:00Z',
    totalCharges: 500,
    totalPayments: 400,
    totalAdjustments: 0,
    patientBalance: 100,
    amountPaid: 0,
    sentAt: '2026-05-01T00:00:00Z',
    paidAt: null,
    previousRunId: null,
    lineItems: [],
    ...over,
  };
}

function renderPage(runId = '7') {
  return render(
    <MemoryRouter initialEntries={[`/portal/pay/${runId}`]}>
      <Routes>
        <Route path="/portal/pay/:runId" element={<PortalPaymentPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PortalPaymentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: user holds billing:statements so existing behaviour tests
    // see an enabled Pay button. Permission-gating tests override.
    setPermissions(['billing:statements']);
  });

  it('renders the statement header + payment form with prefilled balance', async () => {
    vi.mocked(getStatementRun).mockResolvedValueOnce(run());
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Pay Your Statement/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Doe, Jane')).toBeInTheDocument();
    expect(screen.getAllByText(/\$100/).length).toBeGreaterThanOrEqual(1);

    // amount input pre-filled with remaining balance
    const amount = screen.getByLabelText(/Payment Amount/i) as HTMLInputElement;
    expect(amount.value).toBe('100.00');
  });

  it('submits a payment and shows confirmation', async () => {
    const user = userEvent.setup();
    vi.mocked(getStatementRun).mockResolvedValueOnce(run());
    vi.mocked(recordStatementPayment).mockResolvedValueOnce(
      run({ status: 'paid', amountPaid: 100, paidAt: '2026-05-19T00:00:00Z' }),
    );

    renderPage();
    await screen.findByText(/Pay Your Statement/i);
    await user.type(screen.getByLabelText(/Name on Card/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/Card Number/i), '4111111111111111');
    await user.type(screen.getByLabelText(/Expiration/i), '12/29');
    await user.type(screen.getByLabelText(/CVV/i), '123');
    await user.click(screen.getByRole('button', { name: /Pay \$100/i }));

    await waitFor(() => {
      expect(recordStatementPayment).toHaveBeenCalledWith(7, 100);
    });
    expect(screen.getByText(/Thank you!/i)).toBeInTheDocument();
    expect(screen.getByText(/paid in full/i)).toBeInTheDocument();
  });

  it('shows partial-pay confirmation when amount < balance', async () => {
    const user = userEvent.setup();
    vi.mocked(getStatementRun).mockResolvedValueOnce(run({ patientBalance: 200 }));
    vi.mocked(recordStatementPayment).mockResolvedValueOnce(
      run({ status: 'partial-pay', amountPaid: 50, patientBalance: 200 }),
    );

    renderPage();
    await screen.findByText(/Pay Your Statement/i);
    const amount = screen.getByLabelText(/Payment Amount/i) as HTMLInputElement;
    await user.clear(amount);
    await user.type(amount, '50');
    await user.type(screen.getByLabelText(/Name on Card/i), 'Jane');
    await user.type(screen.getByLabelText(/Card Number/i), '4111');
    await user.type(screen.getByLabelText(/Expiration/i), '12/29');
    await user.type(screen.getByLabelText(/CVV/i), '123');
    await user.click(screen.getByRole('button', { name: /Pay \$50/i }));

    await waitFor(() => {
      expect(screen.getByText(/Thank you!/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Remaining balance/i)).toBeInTheDocument();
    expect(screen.getAllByText(/\$150/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows "not found" state when statement is missing', async () => {
    vi.mocked(getStatementRun).mockRejectedValueOnce(new Error('404'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Statement Not Found/i }))
        .toBeInTheDocument();
    });
    expect(screen.getByText(/contact the hospice billing department/i))
      .toBeInTheDocument();
  });

  it('shows backend error when payment fails', async () => {
    const user = userEvent.setup();
    vi.mocked(getStatementRun).mockResolvedValueOnce(run());
    vi.mocked(recordStatementPayment).mockRejectedValueOnce({
      response: { data: { error: 'Payment exceeds remaining balance.' } },
    });

    renderPage();
    await screen.findByText(/Pay Your Statement/i);
    await user.type(screen.getByLabelText(/Name on Card/i), 'Jane');
    await user.type(screen.getByLabelText(/Card Number/i), '4111');
    await user.type(screen.getByLabelText(/Expiration/i), '12/29');
    await user.type(screen.getByLabelText(/CVV/i), '123');
    await user.click(screen.getByRole('button', { name: /Pay/i }));

    await waitFor(() => {
      expect(screen.getByText(/exceeds remaining balance/i)).toBeInTheDocument();
    });
  });

  describe('permission gating', () => {
    it('disables Pay with a permission tooltip when the user lacks billing:statements', async () => {
      setPermissions([]); // no billing:statements
      vi.mocked(getStatementRun).mockResolvedValueOnce(run());

      renderPage();
      await screen.findByText(/Pay Your Statement/i);

      const btn = screen.getByRole('button', { name: /Pay/i });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
    });

    it('enables Pay when the user has billing:statements', async () => {
      setPermissions(['billing:statements']);
      vi.mocked(getStatementRun).mockResolvedValueOnce(run());

      renderPage();
      await screen.findByText(/Pay Your Statement/i);

      expect(screen.getByRole('button', { name: /Pay/i })).toBeEnabled();
    });
  });
});

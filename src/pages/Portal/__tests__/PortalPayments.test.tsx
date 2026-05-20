import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PortalPayments } from '@/pages/Portal/PortalPayments';

vi.mock('@/portal/portalApi', () => ({
  portalPayments: vi.fn(),
}));

vi.mock('@/portal/PortalAuthContext', () => ({
  usePortalAuth: () => ({
    me: { patientId: 100, relationshipLabel: 'Daughter', email: null, phoneNumber: null },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

import { portalPayments } from '@/portal/portalApi';

beforeEach(() => vi.clearAllMocks());

function renderPage() {
  return render(
    <MemoryRouter>
      <PortalPayments />
    </MemoryRouter>,
  );
}

describe('PortalPayments', () => {
  it('shows empty state when no payments exist', async () => {
    vi.mocked(portalPayments).mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/haven't made any payments yet/i)).toBeInTheDocument();
  });

  it('renders rows with masked card data and confirmation numbers', async () => {
    vi.mocked(portalPayments).mockResolvedValue([
      {
        id: 1, statementRunId: 10, amount: 250, method: 'card', last4: '1111',
        confirmationNumber: 'CONF-AAA', paidAtUtc: '2026-05-19T12:00:00Z',
      },
      {
        id: 2, statementRunId: 11, amount: 100, method: 'ach', last4: null,
        confirmationNumber: 'CONF-BBB', paidAtUtc: '2026-05-18T12:00:00Z',
      },
    ]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('CONF-AAA')).toBeInTheDocument();
    });
    expect(screen.getByText('CONF-BBB')).toBeInTheDocument();
    expect(screen.getByText(/ending 1111/i)).toBeInTheDocument();
    expect(screen.getByText('$250.00')).toBeInTheDocument();
    // Statement links go back to the detail pages
    expect(screen.getByRole('link', { name: '#10' })).toHaveAttribute(
      'href', '/portal/statements/10',
    );
  });

  it('shows total count and amount in the summary line', async () => {
    vi.mocked(portalPayments).mockResolvedValue([
      { id: 1, statementRunId: 10, amount: 100, method: 'card', last4: '1111',
        confirmationNumber: 'A', paidAtUtc: '2026-05-19T12:00:00Z' },
      { id: 2, statementRunId: 11, amount: 50, method: 'card', last4: '2222',
        confirmationNumber: 'B', paidAtUtc: '2026-05-18T12:00:00Z' },
    ]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/payments totalling/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/\$150\.00/)).toBeInTheDocument();
  });

  it('shows an error message when the load fails', async () => {
    vi.mocked(portalPayments).mockRejectedValueOnce(new Error('network down'));
    renderPage();
    expect(await screen.findByText('network down')).toBeInTheDocument();
  });
});

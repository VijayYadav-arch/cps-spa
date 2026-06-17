import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OrdersPage } from '@/pages/Admin/Clinical/OrdersPage';

vi.mock('@/api/client', () => ({
  apiClient: { get: vi.fn() },
}));

// usePermission pulls from a TanStack Query hook needing a provider; stub it here.
vi.mock('@/permissions/usePermission', () => ({ usePermission: () => false }));

import { apiClient } from '@/api/client';

function order(id: number, status = 'active') {
  return {
    id,
    orderDate: '2026-06-01T00:00:00Z',
    orderType: 'medication',
    orderText: `Order ${id}`,
    orderedBy: 'Dr. Smith',
    isVerbal: false,
    signedBy: 'Dr. Smith',
    status,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <OrdersPage />
    </MemoryRouter>
  );
}

describe('OrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default for the secondary patient-list fetch (add-form picker); per-test
    // mockResolvedValueOnce still wins for the orders call.
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: [] } } as never);
  });

  it('renders heading + orders table', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { data: [order(1), order(2, 'completed')] },
    } as never);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Order 1')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });

  it('shows empty state', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: [] } } as never);
    renderPage();
    await waitFor(() => expect(screen.getByText(/no orders yet/i)).toBeInTheDocument());
  });

  it('shows error on fetch failure', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('500'));
    renderPage();
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { DenialsList } from '@/pages/Billing/DenialsList';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/api/billing', async () => {
  const actual = await vi.importActual<typeof import('@/api/billing')>('@/api/billing');
  return {
    ...actual,
    getDenials: vi.fn(),
  };
});

import { getDenials } from '@/api/billing';

function buildItem(overrides: Partial<{ id: number; status: string; category: string }> = {}) {
  return {
    id: overrides.id ?? 1,
    claimId: 100 + (overrides.id ?? 1),
    organizationId: 1,
    status: overrides.status ?? 'new',
    denialCode: 'CO-50',
    denialReason: 'Not medically necessary',
    category: overrides.category ?? 'medical-necessity',
    appealDeadline: '2026-07-01',
    resolvedAt: null,
    assignedTo: null,
    appealHistory: null,
    draftAppealText: null,
    draftAppealGeneratedAtUtc: null,
    createdAt: '2026-06-04T00:00:00Z',
    updatedAt: '2026-06-04T00:00:00Z',
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <DenialsList />
    </MemoryRouter>
  );
}

describe('DenialsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
    vi.mocked(getDenials).mockResolvedValue({
      data: [buildItem({ id: 1 })],
      pagination: { total: 1, page: 1, pageSize: 50 },
    });
  });

  it('renders header, status tabs, and the aging-queue back-link', async () => {
    renderPage();
    await waitFor(() => expect(getDenials).toHaveBeenCalled());

    expect(screen.getByRole('heading', { name: /denial management/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view aging queue/i })).toHaveAttribute(
      'href',
      '/billing/denials/queue'
    );
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'New' })).toBeInTheDocument();
  });

  it('switches status filter and refetches', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(getDenials).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('tab', { name: 'Appealing' }));

    await waitFor(() => {
      expect(getDenials).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'appealing', page: 1 })
      );
    });
  });

  it('switches category filter and refetches', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(getDenials).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: /^auth$/i }));

    await waitFor(() => {
      expect(getDenials).toHaveBeenLastCalledWith(
        expect.objectContaining({ category: 'auth', page: 1 })
      );
    });
  });

  it('paginates Next + disables when on last page', async () => {
    vi.mocked(getDenials).mockResolvedValue({
      data: Array.from({ length: 50 }, (_, i) => buildItem({ id: i + 1 })),
      pagination: { total: 100, page: 1, pageSize: 50 },
    });
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(getDenials).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(getDenials).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
    });
  });

  it('navigates to detail when View button clicked (md+ table)', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(getDenials).toHaveBeenCalled());

    const viewButtons = await screen.findAllByRole('button', { name: /^view$/i });
    await user.click(viewButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/billing/denials/1');
  });

  it('renders empty-state message when no items', async () => {
    vi.mocked(getDenials).mockResolvedValueOnce({
      data: [],
      pagination: { total: 0, page: 1, pageSize: 50 },
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/no denials match the current filters/i)).toBeInTheDocument();
    });
  });
});

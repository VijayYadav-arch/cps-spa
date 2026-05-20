import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { EraPostingsPage } from '@/pages/Billing/EraPostingsPage';
import type { EraPostingRow } from '@/api/billing';

vi.mock('@/api/billing', () => ({
  listEraPostings: vi.fn(),
  postEra: vi.fn(),
}));

import { listEraPostings, postEra } from '@/api/billing';

beforeEach(() => vi.clearAllMocks());

function row(over: Partial<EraPostingRow> = {}): EraPostingRow {
  return {
    id: 1,
    checkNumber: 'CHK-001',
    checkDate: '20260420',
    payerName: 'Medicare',
    paymentAmount: 1000,
    matchedClaims: 1,
    unmatchedClaims: 0,
    status: 'posted',
    postedAt: '2026-04-20T14:00:00Z',
    ...over,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <EraPostingsPage />
    </MemoryRouter>,
  );
}

describe('EraPostingsPage', () => {
  it('loads paginated ERA postings on first render', async () => {
    vi.mocked(listEraPostings).mockResolvedValue({
      data: [
        row(),
        row({ id: 2, payerName: 'Aetna', paymentAmount: 500, matchedClaims: 1, unmatchedClaims: 1 }),
      ],
      total: 2,
    });
    renderPage();

    expect(await screen.findByText('Medicare')).toBeInTheDocument();
    expect(screen.getByText('Aetna')).toBeInTheDocument();
    // Unmatched annotation
    expect(screen.getByText(/1 unmatched/)).toBeInTheDocument();
  });

  it('shows summary tiles totalling the page', async () => {
    vi.mocked(listEraPostings).mockResolvedValue({
      data: [
        row({ paymentAmount: 1000, matchedClaims: 2, unmatchedClaims: 0 }),
        row({ id: 2, paymentAmount: 500, matchedClaims: 1, unmatchedClaims: 1 }),
      ],
      total: 2,
    });
    renderPage();

    expect(await screen.findByText('$1,500.00')).toBeInTheDocument();
    // "Claims matched" tile shows 3
    expect(screen.getByText('Claims matched')).toBeInTheDocument();
  });

  it('opens the upload form and posts a raw 835', async () => {
    const user = userEvent.setup();
    vi.mocked(listEraPostings).mockResolvedValue({ data: [], total: 0 });
    vi.mocked(postEra).mockResolvedValue({
      data: { eraPostingId: 42, matched: 1, unmatched: 0 },
    });

    renderPage();
    await waitFor(() => expect(listEraPostings).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: /Manual upload/i }));
    await user.type(screen.getByLabelText(/Raw 835/i), 'ISA*00*...');
    await user.click(screen.getByRole('button', { name: /^Post ERA$/ }));

    await waitFor(() => {
      expect(postEra).toHaveBeenCalledWith(expect.objectContaining({
        raw835: 'ISA*00*...',
      }));
    });
    expect(await screen.findByText(/Posted ERA #42.*1 matched/)).toBeInTheDocument();
  });

  it('prevents empty upload submission', async () => {
    const user = userEvent.setup();
    vi.mocked(listEraPostings).mockResolvedValue({ data: [], total: 0 });
    renderPage();
    await waitFor(() => expect(listEraPostings).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: /Manual upload/i }));
    await user.click(screen.getByRole('button', { name: /^Post ERA$/ }));

    expect(await screen.findByText(/Provide raw 835.*or a submission id/i))
      .toBeInTheDocument();
    expect(postEra).not.toHaveBeenCalled();
  });

  it('paginates next/prev', async () => {
    const user = userEvent.setup();
    vi.mocked(listEraPostings).mockResolvedValue({
      data: [row()],
      total: 60, // 3 pages at pageSize 25
    });

    renderPage();
    await screen.findByText('Medicare');

    await user.click(screen.getByRole('button', { name: /Next/i }));
    await waitFor(() => {
      expect(listEraPostings).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
      );
    });
  });

  it('shows empty state when no postings', async () => {
    vi.mocked(listEraPostings).mockResolvedValue({ data: [], total: 0 });
    renderPage();
    expect(await screen.findByText(/No ERA postings yet/i)).toBeInTheDocument();
  });

  it('shows error banner when load fails', async () => {
    vi.mocked(listEraPostings).mockRejectedValueOnce({
      response: { data: { error: 'forbidden' } },
    });
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('forbidden');
  });
});

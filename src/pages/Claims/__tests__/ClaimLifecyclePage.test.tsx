import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ClaimLifecyclePage } from '@/pages/Claims/ClaimLifecyclePage';

vi.mock('@/api/claims', async (orig) => ({
  ...(await orig<object>()),
  getClaimLifecycle: vi.fn(),
}));

import { getClaimLifecycle } from '@/api/claims';

beforeEach(() => vi.clearAllMocks());

function lifecycle(over: Partial<{
  events: { atUtc: string; eventType: 'created' | 'submitted' | 'status-checked' | 'ack' | 'era-posted'; description: string }[];
  submissions: number;
  eraPostings: number;
  paid: number | null;
  status: string;
}> = {}) {
  return {
    header: {
      id: 42,
      claimNumber: 'CLM-001',
      status: over.status ?? 'paid',
      patientName: 'Margaret Doe',
      patientId: 99,
      payer: 'Medicare',
      serviceDate: '2026-04-15T00:00:00Z',
      submittedDate: '2026-04-18T12:00:00Z',
      amount: 1200,
      paidAmount: over.paid ?? 1000,
    },
    submissions: Array.from({ length: over.submissions ?? 1 }, (_, i) => ({
      id: i + 1,
      clearinghouse: 'mock',
      status: 'paid',
      trackingId: `MOCK-${i + 1}`,
      clearinghouseTrackingId: `MOCK-${i + 1}`,
      submittedAt: '2026-04-18T12:00:00Z',
      lastStatusCheckedAt: '2026-04-19T10:00:00Z',
      ackStatus: 'accepted',
      hasEdi837: true,
      hasEdi835: true,
      payerOrder: 'primary',
    })),
    eraPostings: Array.from({ length: over.eraPostings ?? 1 }, (_, i) => ({
      id: i + 1,
      claimSubmissionId: 1,
      payerName: 'Medicare',
      checkNumber: 'CHK-001',
      checkDate: '20260420',
      paymentAmount: 1000,
      paymentMethod: 'CHK',
      totalClaims: 1,
      matchedClaims: 1,
      unmatchedClaims: 0,
      postedAt: '2026-04-20T14:00:00Z',
    })),
    serviceLines: [
      {
        id: 1, lineNumber: 1, procedureCode: '99215',
        modifier1: null,
        serviceDateFrom: '2026-04-15T00:00:00Z', serviceDateTo: null,
        charges: 1200,
      },
    ],
    events: over.events ?? [
      { atUtc: '2026-04-16T09:00:00Z', eventType: 'created', description: 'Claim created' },
      { atUtc: '2026-04-18T12:00:00Z', eventType: 'submitted', description: 'Submitted to mock' },
      { atUtc: '2026-04-20T14:00:00Z', eventType: 'era-posted', description: 'ERA posted — $1000.00' },
    ],
  };
}

function renderAt(claimId: number) {
  return render(
    <MemoryRouter initialEntries={[`/claims/${claimId}/lifecycle`]}>
      <Routes>
        <Route path="/claims/:id/lifecycle" element={<ClaimLifecyclePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ClaimLifecyclePage', () => {
  it('renders the full lifecycle', async () => {
    vi.mocked(getClaimLifecycle).mockResolvedValue(lifecycle());

    renderAt(42);

    expect(await screen.findByText(/Claim CLM-001 lifecycle/i)).toBeInTheDocument();
    expect(screen.getByText('Margaret Doe')).toBeInTheDocument();
    // "Medicare" appears in the header card and the ERA row — at least once is enough
    expect(screen.getAllByText('Medicare').length).toBeGreaterThan(0);
    // Timeline events
    expect(screen.getByText(/Claim created/)).toBeInTheDocument();
    expect(screen.getByText(/ERA posted/)).toBeInTheDocument();
    // ERA total/matched
    expect(screen.getByText(/1\/1/)).toBeInTheDocument();
    // Service line
    expect(screen.getByText('99215')).toBeInTheDocument();
  });

  it('renders empty sections gracefully', async () => {
    vi.mocked(getClaimLifecycle).mockResolvedValue({
      ...lifecycle({ submissions: 0, eraPostings: 0 }),
      submissions: [], eraPostings: [], serviceLines: [],
      events: [{ atUtc: '2026-04-16T09:00:00Z', eventType: 'created', description: 'Claim created' }],
    });

    renderAt(42);
    expect(await screen.findByText(/Claim CLM-001 lifecycle/i)).toBeInTheDocument();
    expect(screen.getByText(/No submissions yet/i)).toBeInTheDocument();
    expect(screen.getByText(/No ERA postings yet/i)).toBeInTheDocument();
    expect(screen.getByText(/No service lines/i)).toBeInTheDocument();
  });

  it('shows 404 friendly message', async () => {
    vi.mocked(getClaimLifecycle).mockRejectedValueOnce({ response: { status: 404 } });
    renderAt(99);
    expect(await screen.findByText(/Claim not found/i)).toBeInTheDocument();
  });

  it('flags unmatched ERA claims', async () => {
    const data = lifecycle();
    data.eraPostings[0] = {
      ...data.eraPostings[0],
      totalClaims: 3, matchedClaims: 2, unmatchedClaims: 1,
    };
    vi.mocked(getClaimLifecycle).mockResolvedValue(data);

    renderAt(42);
    expect(await screen.findByText(/2\/3/)).toBeInTheDocument();
    expect(screen.getByText(/1 unmatched/)).toBeInTheDocument();
  });
});

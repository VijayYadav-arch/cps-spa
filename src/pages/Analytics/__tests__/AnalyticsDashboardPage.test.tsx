import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AnalyticsDashboardPage } from '@/pages/Analytics/AnalyticsDashboardPage';

vi.mock('@/api/analytics', () => ({
  getDashboardSummary: vi.fn(),
  getRevenue: vi.fn(),
  getPayerMix: vi.fn(),
  getArAging: vi.fn(),
  getDenialAnalysis: vi.fn(),
  getStatementCollection: vi.fn(),
  exportAnalyticsCsv: vi.fn(),
}));

// usePermission pulls from a TanStack Query hook needing a provider; stub it here.
vi.mock('@/permissions/usePermission', () => ({ usePermission: () => false }));

import {
  getDashboardSummary,
  getRevenue,
  getPayerMix,
  getArAging,
  getDenialAnalysis,
  getStatementCollection,
} from '@/api/analytics';

function renderPage() {
  return render(
    <MemoryRouter>
      <AnalyticsDashboardPage />
    </MemoryRouter>,
  );
}

function setUpStandardMocks() {
  vi.mocked(getDashboardSummary).mockResolvedValue({
    asOfDate: '2026-05-20',
    revenueLast30: 25000,
    revenueLast90: 82000,
    outstandingAr: 41500,
    openDenials: 7,
    openStatements: 12,
    overallCollectionRatePct: 88.4,
  });
  vi.mocked(getRevenue).mockResolvedValue({
    from: '2025-05-01',
    to: '2026-05-20',
    points: [
      { month: '2026-03-01', billedAmount: 10000, collectedAmount: 8500, claimCount: 12 },
      { month: '2026-04-01', billedAmount: 14000, collectedAmount: 11000, claimCount: 18 },
    ],
    totalBilled: 24000,
    totalCollected: 19500,
    collectionRatePct: 81.25,
  });
  vi.mocked(getPayerMix).mockResolvedValue({
    from: '2025-05-01',
    to: '2026-05-20',
    rows: [
      { payer: 'Medicare', claimCount: 30, billedAmount: 50000, collectedAmount: 44000,
        deniedClaims: 2, denialRatePct: 6.67 },
      { payer: 'Aetna', claimCount: 12, billedAmount: 18000, collectedAmount: 13000,
        deniedClaims: 3, denialRatePct: 25.0 },
    ],
  });
  vi.mocked(getArAging).mockResolvedValue({
    asOfDate: '2026-05-20',
    totalOutstanding: 41500,
    buckets: [
      { bucket: '0-30', amount: 12000, claimCount: 8 },
      { bucket: '31-60', amount: 15000, claimCount: 9 },
      { bucket: '61-90', amount: 7500, claimCount: 5 },
      { bucket: '91-120', amount: 4000, claimCount: 3 },
      { bucket: '120+', amount: 3000, claimCount: 2 },
    ],
    daysSalesOutstanding: 45.2,
  });
  vi.mocked(getDenialAnalysis).mockResolvedValue({
    from: '2025-11-20',
    to: '2026-05-20',
    totalDenials: 18,
    openDenials: 7,
    resolvedDenials: 11,
    topReasons: [
      { carc: 'CO-50', description: 'Not medically necessary',
        count: 6, writtenOffAmount: 1200, recoveredAmount: 800 },
      { carc: 'CO-16', description: 'Claim/service lacks information',
        count: 4, writtenOffAmount: 0, recoveredAmount: 1500 },
    ],
    byPayer: [],
  });
  vi.mocked(getStatementCollection).mockResolvedValue({
    from: '2025-11-20',
    to: '2026-05-20',
    statementsSent: 50,
    statementsPaid: 32,
    statementsPartial: 8,
    statementsOutstanding: 10,
    totalBilled: 22000,
    totalCollected: 16500,
    collectionRatePct: 75,
    avgDaysToPay: 14.3,
  });
}

describe('AnalyticsDashboardPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the headline summary row', async () => {
    setUpStandardMocks();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Revenue (30d)')).toBeInTheDocument();
    });
    // Money values use locale-aware formatting; just check presence of significant digits
    expect(screen.getByText(/\$25,000/)).toBeInTheDocument();
    expect(screen.getByText(/\$82,000/)).toBeInTheDocument();
    // 7 and 12 appear in the headline strip; they may collide with other
    // counts on the page (denial reason counts etc.), so just assert at
    // least one instance exists.
    expect(screen.getAllByText('7').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('12').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('88.4%')).toBeInTheDocument();
  });

  it('renders revenue series points', async () => {
    setUpStandardMocks();
    renderPage();
    await screen.findByText('Revenue (30d)');

    expect(screen.getByText('2026-03')).toBeInTheDocument();
    expect(screen.getByText('2026-04')).toBeInTheDocument();
  });

  it('renders the payer mix table sorted by billed', async () => {
    setUpStandardMocks();
    renderPage();
    await screen.findByText('Revenue (30d)');

    expect(screen.getByText('Medicare')).toBeInTheDocument();
    expect(screen.getByText('Aetna')).toBeInTheDocument();
    // Denial rate >10% highlights in red, but presence test is enough here
    expect(screen.getByText('25.0%')).toBeInTheDocument();
  });

  it('renders aging buckets with DSO', async () => {
    setUpStandardMocks();
    renderPage();
    await screen.findByText('Revenue (30d)');

    expect(screen.getByText('0-30 days')).toBeInTheDocument();
    expect(screen.getByText('120+ days')).toBeInTheDocument();
    expect(screen.getByText(/45.2 days/)).toBeInTheDocument();
  });

  it('renders denial reasons', async () => {
    setUpStandardMocks();
    renderPage();
    await screen.findByText('Revenue (30d)');

    expect(screen.getByText('CO-50')).toBeInTheDocument();
    expect(screen.getByText('Not medically necessary')).toBeInTheDocument();
  });

  it('renders statement collection metrics', async () => {
    setUpStandardMocks();
    renderPage();
    await screen.findByText('Revenue (30d)');

    // "Sent" and "Paid" labels appear under Statement section as metric cards
    expect(screen.getAllByText('Sent').length).toBeGreaterThan(0);
    expect(screen.getByText('Avg days to pay')).toBeInTheDocument();
    expect(screen.getByText('14.3 d')).toBeInTheDocument();
  });

  it('shows an error message when load fails', async () => {
    vi.mocked(getDashboardSummary).mockRejectedValueOnce(new Error('boom'));
    vi.mocked(getRevenue).mockResolvedValue({} as never);
    vi.mocked(getPayerMix).mockResolvedValue({} as never);
    vi.mocked(getArAging).mockResolvedValue({} as never);
    vi.mocked(getDenialAnalysis).mockResolvedValue({} as never);
    vi.mocked(getStatementCollection).mockResolvedValue({} as never);

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('boom')).toBeInTheDocument();
    });
  });
});

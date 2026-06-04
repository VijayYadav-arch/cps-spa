import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BillingAnalyticsPage } from '@/pages/Billing/BillingAnalyticsPage';

vi.mock('@/api/analytics', () => ({
  getDashboardSummary: vi.fn(),
  getRevenue: vi.fn(),
  getDenialAnalysis: vi.fn(),
}));

import { getDashboardSummary, getDenialAnalysis, getRevenue } from '@/api/analytics';

const SUMMARY = {
  asOfDate: '2026-06-04',
  revenueLast30: 100000,
  revenueLast90: 300000,
  outstandingAr: 50000,
  openDenials: 7,
  openStatements: 12,
  overallCollectionRatePct: 94.5,
};

const REVENUE = {
  from: '2026-01-01',
  to: '2026-06-01',
  points: [
    { month: '2026-04-01', billedAmount: 30000, collectedAmount: 28000, claimCount: 100 },
    { month: '2026-05-01', billedAmount: 35000, collectedAmount: 33000, claimCount: 110 },
  ],
  totalBilled: 65000,
  totalCollected: 61000,
  collectionRatePct: 93.8,
};

const DENIALS = {
  from: '2026-01-01',
  to: '2026-06-01',
  totalDenials: 25,
  openDenials: 7,
  resolvedDenials: 18,
  topReasons: [
    {
      carc: 'CO-50',
      description: 'Not medically necessary',
      count: 8,
      writtenOffAmount: 2000,
      recoveredAmount: 1000,
    },
  ],
  byPayer: [],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <BillingAnalyticsPage />
    </MemoryRouter>
  );
}

describe('BillingAnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDashboardSummary).mockResolvedValue(SUMMARY);
    vi.mocked(getRevenue).mockResolvedValue(REVENUE);
    vi.mocked(getDenialAnalysis).mockResolvedValue(DENIALS);
  });

  it('renders heading + KPI cards from summary', async () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /billing analytics/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('$100,000')).toBeInTheDocument(); // revenueLast30
      expect(screen.getByText('94.5%')).toBeInTheDocument(); // collection rate
      expect(screen.getByText('7')).toBeInTheDocument(); // open denials
    });
  });

  it('renders revenue trend bars + totals', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/revenue trend/i)).toBeInTheDocument();
      expect(screen.getByText('$65,000')).toBeInTheDocument(); // totalBilled
    });
  });

  it('renders top denial reasons table', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/top denial reasons/i)).toBeInTheDocument();
      expect(screen.getByText('CO-50')).toBeInTheDocument();
    });
  });

  it('shows error on fetch failure', async () => {
    vi.mocked(getDashboardSummary).mockRejectedValueOnce(new Error('500'));
    renderPage();
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});

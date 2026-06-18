import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QapiDashboardPage } from '@/pages/Quality/QapiDashboardPage';
import * as qapiApi from '@/api/qapi';

vi.mock('@/api/qapi');

function makePip(overrides: Partial<qapiApi.HospiceQapiPip> = {}): qapiApi.HospiceQapiPip {
  return {
    id: 1,
    organizationId: 1,
    title: 'Reduce Fall Rate',
    description: 'Improve fall prevention protocols',
    category: 'PatientSafety',
    status: 'Active',
    baselineMeasurement: 10,
    baselineMeasurementDate: '2026-01-01',
    targetMeasurement: 5,
    targetDate: '2026-06-01',
    currentMeasurement: 8,
    currentMeasurementDate: '2026-03-01',
    interventionPlan: 'Implement hourly rounding',
    outcomeSummary: null,
    ownerUserId: 1,
    leadingHqrpMetric: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    ...overrides,
  };
}

function makeDashboard(overrides: Partial<qapiApi.QapiDashboard> = {}): qapiApi.QapiDashboard {
  return {
    planStatus: { currentVersion: 2, status: 'Approved', effectiveDate: '2026-01-01' },
    activePipCount: 3,
    topActivePips: [],
    adverseEventCountByCategory90d: { PatientFall: 4, MedicationError: 2 },
    weekOverWeekTrend: { currentWeekCount: 5, previousWeekCount: 3, delta: 2 },
    daysSinceLastReview: 14,
    reviewOverdue: false,
    hqrpSummary: null,
    cahpsSummary: null,
    ...overrides,
  };
}

describe('QapiDashboardPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('RendersKpiTiles — shows all KPI labels', async () => {
    vi.mocked(qapiApi.getQapiDashboard).mockResolvedValueOnce(makeDashboard());

    render(<MemoryRouter><QapiDashboardPage /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText('Active PIPs')).toBeInTheDocument());
    expect(screen.getByText('Adverse Events (90d)')).toBeInTheDocument();
    expect(screen.getByText('Days Since Last Review')).toBeInTheDocument();
    expect(screen.getByText('QAPI Plan')).toBeInTheDocument();
  });

  it('TopActivePipsAsScorecards — renders pip titles', async () => {
    vi.mocked(qapiApi.getQapiDashboard).mockResolvedValueOnce(
      makeDashboard({
        topActivePips: [
          makePip({ id: 1, title: 'Reduce Fall Rate' }),
          makePip({ id: 2, title: 'Improve Medication Adherence' }),
        ],
      }),
    );

    render(<MemoryRouter><QapiDashboardPage /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText('Reduce Fall Rate')).toBeInTheDocument());
    expect(screen.getByText('Improve Medication Adherence')).toBeInTheDocument();
  });

  it('EmptyState_ShowsStartOnePrompt — no active PIPs shows link', async () => {
    vi.mocked(qapiApi.getQapiDashboard).mockResolvedValueOnce(
      makeDashboard({ topActivePips: [] }),
    );

    render(<MemoryRouter><QapiDashboardPage /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText(/No active PIPs/i)).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /Start one/i })).toBeInTheDocument();
  });

  it('HqrpAndCahpsSections_RenderWhenPresent — shows both headings and KPIs', async () => {
    vi.mocked(qapiApi.getQapiDashboard).mockResolvedValueOnce(
      makeDashboard({
        hqrpSummary: {
          from: '2026-03-01',
          to: '2026-05-30',
          totalAssessments: 10,
          onTimeCount: 9,
          lateCount: 1,
          notYetSubmittedCount: 0,
          rejectedCount: 0,
          timelinessPercentage: 90,
          meetsThreshold: true,
          thresholdPercentage: 90,
        },
        cahpsSummary: {
          calendarYear: 2026,
          quarter: 2,
          quarterFrom: '2026-04-01',
          quarterTo: '2026-06-30',
          totalDecedents: 8,
          eligibleCount: 6,
          ineligibleCount: 1,
          excludedCount: 1,
          submittedCount: 4,
          pendingCount: 0,
          notYetSubmittedCount: 2,
          submissionRatePercentage: 66.67,
        },
      }),
    );

    render(<MemoryRouter><QapiDashboardPage /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText(/HQRP Timeliness/i)).toBeInTheDocument());
    expect(screen.getByText(/CAHPS Survey/i)).toBeInTheDocument();
    expect(screen.getByText('On-time submission')).toBeInTheDocument();
    expect(screen.getByText('Submission rate')).toBeInTheDocument();
  });

  it('ErrorState_OnRejection — shows alert on fetch failure', async () => {
    vi.mocked(qapiApi.getQapiDashboard).mockRejectedValueOnce(new Error('network error'));

    render(<MemoryRouter><QapiDashboardPage /></MemoryRouter>);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText('Failed to load dashboard data.')).toBeInTheDocument();
  });
});

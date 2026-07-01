import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HomeHealthDashboardPage } from '@/pages/HomeHealth/HomeHealthDashboardPage';

vi.mock('@/api/homehealth', () => ({
  getHomeHealthDashboard: vi.fn(),
  listHomeHealthEpisodes: vi.fn(),
  listHomeHealthBillingWorklist: vi.fn(),
}));
import { getHomeHealthDashboard, listHomeHealthEpisodes, listHomeHealthBillingWorklist } from '@/api/homehealth';

const DASH = {
  activeCount: 2, dischargedCount: 1, communityCount: 1, institutionalCount: 1,
  recertDueSoonCount: 1, startedLast30Count: 1, noaOverdueCount: 1, oasisIncompleteCount: 1,
};
function ep(id: number, name: string, over: Partial<Record<string, unknown>> = {}) {
  return {
    id, patientId: id, patientName: name, status: 'active', admissionSource: 'community',
    periodNumber: 1, startOfCareDate: '2026-05-01', certFromDate: '2026-05-01', certToDate: '2026-06-29',
    recertDueSoon: false, noaSubmitted: false, noaDueDate: '2026-05-06', noaOverdue: false, oasisComplete: true,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getHomeHealthDashboard).mockResolvedValue(DASH as never);
  vi.mocked(listHomeHealthEpisodes).mockResolvedValue([
    ep(101, 'Doe, Jo', { recertDueSoon: true, noaOverdue: true, noaSubmitted: false, oasisComplete: false }),
    ep(102, 'Smith, Al', { noaSubmitted: true, oasisComplete: true }),
  ] as never);
  vi.mocked(listHomeHealthBillingWorklist).mockResolvedValue([
    { periodId: 5, episodeId: 101, patientId: 101, patientName: 'Doe, Jo', periodSequence: 2, hippsCode: '1AA11', status: 'open' },
  ] as never);
});

function renderPage() {
  return render(<MemoryRouter><HomeHealthDashboardPage /></MemoryRouter>);
}

describe('HomeHealthDashboardPage', () => {
  it('renders metrics (incl. NOA-overdue) and the active episodes with NOA/OASIS badges', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('hh-row-101')).toBeInTheDocument());
    expect(screen.getByTestId('hh-metrics')).toBeInTheDocument();
    expect(screen.getByTestId('hh-noa-overdue-101')).toBeInTheDocument();
    expect(screen.getByTestId('hh-oasis-incomplete-101')).toBeInTheDocument();
    // 102 has NOA submitted + OASIS complete → no overdue/incomplete badges
    expect(screen.queryByTestId('hh-noa-overdue-102')).toBeNull();
  });

  it('NOA-overdue worklist filters to overdue episodes only', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('hh-row-101')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('hh-tab-noa'));
    await waitFor(() => expect(screen.getByTestId('hh-row-101')).toBeInTheDocument());
    expect(screen.queryByTestId('hh-row-102')).toBeNull(); // not overdue
  });

  it('recerts worklist filters to recert-due episodes only', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('hh-row-101')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('hh-tab-recerts'));
    await waitFor(() => expect(screen.getByTestId('hh-row-101')).toBeInTheDocument());
    expect(screen.queryByTestId('hh-row-102')).toBeNull();
  });

  it('billing tab loads the billing worklist table', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('hh-row-101')).toBeInTheDocument());
    await userEvent.click(screen.getByTestId('hh-tab-billing'));
    await waitFor(() => expect(screen.getByTestId('hh-billing-table')).toBeInTheDocument());
    expect(vi.mocked(listHomeHealthBillingWorklist)).toHaveBeenCalled();
    expect(screen.getByTestId('hh-billing-5')).toBeInTheDocument();
  });

  it('surfaces an error when the list fails', async () => {
    vi.mocked(getHomeHealthDashboard).mockRejectedValue(new Error('x'));
    vi.mocked(listHomeHealthEpisodes).mockRejectedValue(new Error('boom'));
    renderPage();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/failed to load/i));
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HomeHealthDashboardPage } from '@/pages/HomeHealth/HomeHealthDashboardPage';

vi.mock('@/api/homehealth', () => ({
  getHomeHealthDashboard: vi.fn(),
  listHomeHealthEpisodes: vi.fn(),
}));
import { getHomeHealthDashboard, listHomeHealthEpisodes } from '@/api/homehealth';

const DASH = {
  activeCount: 2, dischargedCount: 1, communityCount: 1, institutionalCount: 1,
  recertDueSoonCount: 1, startedLast30Count: 1,
};
function ep(id: number, name: string, status = 'active', recertDueSoon = false) {
  return {
    id, patientId: id, patientName: name, status, admissionSource: 'community',
    periodNumber: 1, startOfCareDate: '2026-05-01', certFromDate: '2026-05-01',
    certToDate: '2026-06-29', recertDueSoon,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getHomeHealthDashboard).mockResolvedValue(DASH as never);
  vi.mocked(listHomeHealthEpisodes).mockResolvedValue([
    ep(101, 'Doe, Jo', 'active', true),
    ep(102, 'Smith, Al', 'active', false),
  ] as never);
});

function renderPage() {
  return render(<MemoryRouter><HomeHealthDashboardPage /></MemoryRouter>);
}

describe('HomeHealthDashboardPage', () => {
  it('renders dashboard metrics and the episode rows with a recert-due badge', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('hh-row-101')).toBeInTheDocument());

    expect(screen.getByTestId('hh-metrics')).toBeInTheDocument();
    // recert-due badge only on the flagged episode
    expect(screen.getByTestId('hh-recert-101')).toBeInTheDocument();
    expect(screen.queryByTestId('hh-recert-102')).toBeNull();
    // row links into the patient-scoped episode detail
    expect(screen.getByRole('link', { name: 'Doe, Jo' })).toHaveAttribute('href', '/patients/101/home-health/101');
  });

  it('defaults to the active filter and re-queries when a status tab is clicked', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('hh-row-101')).toBeInTheDocument());
    expect(vi.mocked(listHomeHealthEpisodes)).toHaveBeenCalledWith('active');

    await userEvent.click(screen.getByTestId('hh-tab-discharged'));
    await waitFor(() =>
      expect(vi.mocked(listHomeHealthEpisodes)).toHaveBeenCalledWith('discharged'),
    );
  });

  it('shows an empty state when there are no episodes', async () => {
    vi.mocked(listHomeHealthEpisodes).mockResolvedValue([] as never);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('hh-empty')).toBeInTheDocument());
  });

  it('surfaces an error when the list fails (dashboard failure is non-fatal)', async () => {
    vi.mocked(getHomeHealthDashboard).mockRejectedValue(new Error('nope'));
    vi.mocked(listHomeHealthEpisodes).mockRejectedValue(new Error('boom'));
    renderPage();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/failed to load/i));
  });
});

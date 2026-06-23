import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HomeHealthPaymentPeriodsSection } from '@/pages/HomeHealth/HomeHealthPaymentPeriodsSection';
import * as hhApi from '@/api/homehealth';

vi.mock('@/api/homehealth');

const renderSection = () =>
  render(
    <MemoryRouter>
      <HomeHealthPaymentPeriodsSection episodeId={42} canManage />
    </MemoryRouter>,
  );

const period: hhApi.HomeHealthPaymentPeriod = {
  id: 1, episodeId: 42, periodSequence: 1, fromDate: '2026-06-01', toDate: '2026-06-30',
  admissionTiming: 'early', clinicalGroupCode: 'C', functionalLevel: 'high', comorbidityLevel: 'none',
  hippsCode: '1C301', status: 'open', claimId: null,
};

describe('HomeHealthPaymentPeriodsSection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders periods with the HIPPS code', async () => {
    vi.mocked(hhApi.listPaymentPeriods).mockResolvedValue([period]);
    renderSection();
    await waitFor(() => expect(screen.getByText('1C301')).toBeInTheDocument());
    expect(screen.getByText('early')).toBeInTheDocument();
  });

  it('generates the next period', async () => {
    vi.mocked(hhApi.listPaymentPeriods).mockResolvedValue([]);
    vi.mocked(hhApi.createPaymentPeriod).mockResolvedValue(period);
    renderSection();
    await waitFor(() => expect(screen.getByText(/no payment periods yet/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /generate next period/i }));
    await waitFor(() => expect(hhApi.createPaymentPeriod).toHaveBeenCalledWith(42));
  });

  it('builds the 837I claim for an open period (4c)', async () => {
    vi.mocked(hhApi.listPaymentPeriods).mockResolvedValue([period]);
    vi.mocked(hhApi.buildClaimForPeriod).mockResolvedValue({
      claimId: 9, claimNumber: 'HH-42-20260601', periodId: 1, hippsCode: '1C301',
      visitCount: 5, isLupa: false, amount: 2000, warnings: [],
    });
    renderSection();
    await waitFor(() => expect(screen.getByText('1C301')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /build claim/i }));
    await waitFor(() => expect(hhApi.buildClaimForPeriod).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.getByText(/built claim HH-42-20260601/i)).toBeInTheDocument());
  });
});

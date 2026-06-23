import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HomeHealthPaymentPeriodsSection } from '@/pages/HomeHealth/HomeHealthPaymentPeriodsSection';
import * as hhApi from '@/api/homehealth';

vi.mock('@/api/homehealth');

const period: hhApi.HomeHealthPaymentPeriod = {
  id: 1, episodeId: 42, periodSequence: 1, fromDate: '2026-06-01', toDate: '2026-06-30',
  admissionTiming: 'early', clinicalGroupCode: 'C', functionalLevel: 'high', comorbidityLevel: 'none',
  hippsCode: '1C301', status: 'open', claimId: null,
};

describe('HomeHealthPaymentPeriodsSection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders periods with the HIPPS code', async () => {
    vi.mocked(hhApi.listPaymentPeriods).mockResolvedValue([period]);
    render(<HomeHealthPaymentPeriodsSection episodeId={42} canManage />);
    await waitFor(() => expect(screen.getByText('1C301')).toBeInTheDocument());
    expect(screen.getByText('early')).toBeInTheDocument();
  });

  it('generates the next period', async () => {
    vi.mocked(hhApi.listPaymentPeriods).mockResolvedValue([]);
    vi.mocked(hhApi.createPaymentPeriod).mockResolvedValue(period);
    render(<HomeHealthPaymentPeriodsSection episodeId={42} canManage />);
    await waitFor(() => expect(screen.getByText(/no payment periods yet/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /generate next period/i }));
    await waitFor(() => expect(hhApi.createPaymentPeriod).toHaveBeenCalledWith(42));
  });
});

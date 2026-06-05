import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { OnboardingPage } from '@/pages/Admin/Onboarding/OnboardingPage';

vi.mock('@/api/client', () => ({
  apiClient: { get: vi.fn() },
}));

vi.mock('@/api/onboardingStatus', () => ({
  getOrgsStatus: vi.fn(),
}));

import { apiClient } from '@/api/client';
import { getOrgsStatus } from '@/api/onboardingStatus';

function renderPage() {
  return render(
    <MemoryRouter>
      <OnboardingPage />
    </MemoryRouter>
  );
}

const HOSPICE_FLOW = {
  data: {
    careType: 'hospice',
    totalSteps: 2,
    steps: [
      { number: 1, title: 'Add patient', description: 'Onboard first patient.', required: true },
      { number: 2, title: 'Submit claim', description: 'Submit first claim.', required: false },
    ],
  },
};

const STATUS_RESPONSE = {
  data: [
    {
      orgId: 1,
      orgName: 'Acme Hospice',
      slug: 'acme',
      signupDate: '2026-04-01T00:00:00Z',
      onboardingPercent: 100,
      currentStep: 6,
      totalSteps: 6,
      completedSteps: [1, 2, 3, 4, 5, 6],
      completedAt: '2026-05-15T00:00:00Z',
      status: 'completed',
      claimsCount: 42,
      patientsCount: 18,
    },
    {
      orgId: 2,
      orgName: 'Bravo Home Health',
      slug: 'bravo',
      signupDate: '2026-05-01T00:00:00Z',
      onboardingPercent: 33,
      currentStep: 3,
      totalSteps: 6,
      completedSteps: [1, 2],
      completedAt: null,
      status: 'in-progress',
      claimsCount: 4,
      patientsCount: 7,
    },
  ],
  rollup: {
    totalOrgs: 2,
    completed: 1,
    inProgress: 1,
    atRisk: 0,
    notStarted: 0,
    activationRate: 50,
  },
};

describe('OnboardingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOrgsStatus).mockResolvedValue(STATUS_RESPONSE as never);
  });

  it('renders heading + emails link', () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: HOSPICE_FLOW } as never);
    renderPage();
    expect(screen.getByRole('heading', { name: /^onboarding$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /email-template sequence/i })).toHaveAttribute(
      'href',
      '/admin/onboarding/emails'
    );
  });

  it('renders KPI rollup from /orgs-status', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: HOSPICE_FLOW } as never);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('50%')).toBeInTheDocument(); // activation rate
      expect(screen.getByText('Acme Hospice')).toBeInTheDocument();
      expect(screen.getByText('Bravo Home Health')).toBeInTheDocument();
    });
  });

  it('filters per-org rows by status', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: HOSPICE_FLOW } as never);
    vi.mocked(getOrgsStatus).mockResolvedValueOnce(STATUS_RESPONSE as never).mockResolvedValueOnce({
      data: [STATUS_RESPONSE.data[0]],
      rollup: STATUS_RESPONSE.rollup,
    } as never);
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText('Acme Hospice')).toBeInTheDocument());

    await user.click(screen.getByRole('tab', { name: /^completed$/i }));

    await waitFor(() => {
      expect(getOrgsStatus).toHaveBeenLastCalledWith({ statusFilter: 'completed' });
    });
  });

  it('loads + renders hospice flow steps', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: HOSPICE_FLOW } as never);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Add patient')).toBeInTheDocument();
      expect(screen.getByText('Submit claim')).toBeInTheDocument();
    });
  });

  it('switches care type and refetches', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: HOSPICE_FLOW } as never);
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { data: { ...HOSPICE_FLOW.data, careType: 'palliative' } },
    } as never);
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('tab', { name: /palliative/i }));

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenLastCalledWith('/onboarding/flow/palliative');
    });
  });

  it('shows error when /orgs-status fetch fails', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: HOSPICE_FLOW } as never);
    vi.mocked(getOrgsStatus).mockRejectedValueOnce(new Error('500 onboarding'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/500 onboarding/);
    });
  });
});

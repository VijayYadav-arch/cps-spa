import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { OnboardingPage } from '@/pages/Admin/Onboarding/OnboardingPage';

vi.mock('@/api/client', () => ({
  apiClient: { get: vi.fn() },
}));

import { apiClient } from '@/api/client';

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

describe('OnboardingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders heading + emails link', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: HOSPICE_FLOW } as never);
    renderPage();
    expect(screen.getByRole('heading', { name: /^onboarding$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /email-template sequence/i })).toHaveAttribute(
      'href',
      '/admin/onboarding/emails'
    );
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

  it('shows error on fetch failure', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('500'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/500/);
    });
  });
});

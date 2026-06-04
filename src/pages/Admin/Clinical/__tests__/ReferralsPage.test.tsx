import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ReferralsPage } from '@/pages/Admin/Clinical/ReferralsPage';

vi.mock('@/api/client', () => ({
  apiClient: { get: vi.fn() },
}));

import { apiClient } from '@/api/client';

function ref(id: number, status = 'new', urgency = 'routine') {
  return {
    id,
    referralDate: '2026-06-01T00:00:00Z',
    patientName: `Patient ${id}`,
    sourceName: 'Memorial Hospital',
    sourceType: 'hospital',
    primaryDiagnosis: 'I50.9',
    urgency,
    status,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ReferralsPage />
    </MemoryRouter>
  );
}

describe('ReferralsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders heading + pipeline summary cards', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { data: [ref(1, 'new'), ref(2, 'accepted'), ref(3, 'accepted')] },
    } as never);
    renderPage();
    expect(screen.getByRole('heading', { name: /referrals/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Patient 1')).toBeInTheDocument();
    });
  });

  it('shows empty state', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: [] } } as never);
    renderPage();
    await waitFor(() => expect(screen.getByText(/no referrals yet/i)).toBeInTheDocument());
  });

  it('shows error on fetch failure', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('500'));
    renderPage();
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});

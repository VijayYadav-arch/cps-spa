import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MedicationsPage } from '@/pages/Admin/Clinical/MedicationsPage';

vi.mock('@/api/client', () => ({
  apiClient: { get: vi.fn() },
}));

// usePermission pulls from a TanStack Query hook needing a provider; stub it here.
vi.mock('@/permissions/usePermission', () => ({ usePermission: () => false }));

import { apiClient } from '@/api/client';

function med(id: number, overrides: Partial<{ isActive: boolean; isHospiceRelated: boolean }> = {}) {
  return {
    id,
    name: `Med-${id}`,
    genericName: null,
    dosage: '10mg',
    route: 'oral',
    frequency: 'daily',
    purpose: 'pain',
    isHospiceRelated: overrides.isHospiceRelated ?? false,
    isActive: overrides.isActive ?? true,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <MedicationsPage />
    </MemoryRouter>
  );
}

describe('MedicationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default for the secondary patient-list fetch (the page also loads patients for
    // the add-form picker); per-test mockResolvedValueOnce still wins for the meds call.
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: [] } } as never);
  });

  it('renders heading + summary cards from data', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { data: [med(1, { isActive: true, isHospiceRelated: true }), med(2, { isActive: false })] },
    } as never);
    renderPage();
    expect(screen.getByRole('heading', { name: /medications/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Med-1')).toBeInTheDocument();
      expect(screen.getAllByText('1').length).toBeGreaterThan(0); // active + hospice counts
    });
  });

  it('shows empty state', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: [] } } as never);
    renderPage();
    await waitFor(() => expect(screen.getByText(/no medications recorded/i)).toBeInTheDocument());
  });

  it('shows error on fetch failure', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('500'));
    renderPage();
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});

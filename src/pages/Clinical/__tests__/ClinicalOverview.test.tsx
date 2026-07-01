import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ClinicalOverview } from '@/pages/Clinical/ClinicalOverview';

vi.mock('@/api/clinical', () => ({
  getCarePlans: vi.fn(),
  getPriorAuths: vi.fn(),
}));
import { getCarePlans, getPriorAuths } from '@/api/clinical';

vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue({ data: { permissions } } as unknown as ReturnType<typeof useUserRoles>);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCarePlans).mockResolvedValue({ data: [], pagination: { total: 0, page: 1, pageSize: 5, totalPages: 0 } } as never);
  vi.mocked(getPriorAuths).mockResolvedValue({ data: [], pagination: { total: 0, page: 1, pageSize: 5, totalPages: 0 } } as never);
});

function renderPage() {
  return render(<MemoryRouter><ClinicalOverview /></MemoryRouter>);
}

describe('ClinicalOverview hub', () => {
  it('surfaces the clinician workspace + tools the user can access', async () => {
    setPermissions(['clinical:visit_notes', 'clinical:care_plans', 'clinical:medications']);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('clinical-hub')).toBeInTheDocument());

    expect(screen.getByTestId('clinical-hub-my-day')).toHaveAttribute('href', '/clinician/dashboard');
    expect(screen.getByTestId('clinical-hub-my-visits')).toBeInTheDocument();
    expect(screen.getByTestId('clinical-hub-care-plans')).toBeInTheDocument();
    expect(screen.getByTestId('clinical-hub-medications')).toBeInTheDocument();
    // lacks orders/referrals perms → those cards are hidden
    expect(screen.queryByTestId('clinical-hub-orders')).toBeNull();
    expect(screen.queryByTestId('clinical-hub-referrals')).toBeNull();
  });

  it('hides workspace cards when the user has no clinical permissions', async () => {
    setPermissions([]);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('clinical-hub')).toBeInTheDocument());
    expect(screen.queryByTestId('clinical-hub-my-day')).toBeNull();
  });
});

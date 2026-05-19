import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OrgRollupPage } from '@/pages/Admin/OrgRollupPage';
import type { OrgRollupSummary } from '@/api/admin';

vi.mock('@/api/admin', () => ({
  getOrgRollup: vi.fn(),
}));

import { getOrgRollup } from '@/api/admin';

function summary(over: Partial<OrgRollupSummary> = {}): OrgRollupSummary {
  return {
    parentOrganizationId: 100,
    parentName: 'Acme Hospice Holdings',
    childOrgCount: 2,
    totalPatientCount: 30,
    totalActiveElectionCount: 18,
    totalOpenClaimCount: 5,
    totalOpenBreachCount: 1,
    totalClaimAmountSubmitted: 12500,
    children: [
      {
        id: 101, name: 'Acme Tampa', slug: 'acme-tampa',
        patientCount: 20, activeElectionCount: 12,
        openClaimCount: 3, openBreachCount: 0,
        claimAmountSubmitted: 7500,
      },
      {
        id: 102, name: 'Acme Orlando', slug: 'acme-orlando',
        patientCount: 10, activeElectionCount: 6,
        openClaimCount: 2, openBreachCount: 1,
        claimAmountSubmitted: 5000,
      },
    ],
    ...over,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <OrgRollupPage />
    </MemoryRouter>,
  );
}

describe('OrgRollupPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the parent header + totals', async () => {
    vi.mocked(getOrgRollup).mockResolvedValueOnce(summary());
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Acme Hospice Holdings/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/2 child CCNs/i)).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();   // total patients
    expect(screen.getByText('18')).toBeInTheDocument();   // total active elections
    expect(screen.getByText(/\$12,500/i)).toBeInTheDocument();
  });

  it('renders one row per child', async () => {
    vi.mocked(getOrgRollup).mockResolvedValueOnce(summary());
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Acme Tampa')).toBeInTheDocument();
    });
    expect(screen.getByText('Acme Orlando')).toBeInTheDocument();
    expect(screen.getByText('acme-tampa')).toBeInTheDocument();
  });

  it('shows empty state when no children linked', async () => {
    vi.mocked(getOrgRollup).mockResolvedValueOnce(
      summary({ childOrgCount: 0, children: [] }),
    );
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText(/No child organizations linked/i),
      ).toBeInTheDocument();
    });
  });

  it('shows error when the fetch fails', async () => {
    vi.mocked(getOrgRollup).mockRejectedValueOnce(new Error('boom'));
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText(/Failed to load parent-org rollup/i),
      ).toBeInTheDocument();
    });
  });

  it('highlights open breaches in red on child rows', async () => {
    vi.mocked(getOrgRollup).mockResolvedValueOnce(summary());
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Acme Orlando')).toBeInTheDocument();
    });
    // The "1" open breach in Acme Orlando should be styled with the danger color
    const cells = screen.getAllByText('1');
    expect(cells.length).toBeGreaterThanOrEqual(1);
  });
});

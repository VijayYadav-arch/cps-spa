import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SecondaryClaimsPage } from '@/pages/Billing/SecondaryClaimsPage';
import type {
  Secondary837Result,
  SecondaryEligibleClaim,
} from '@/api/billing';

vi.mock('@/api/billing', () => ({
  listEligibleSecondary: vi.fn(),
  buildSecondary837: vi.fn(),
}));

import { buildSecondary837, listEligibleSecondary } from '@/api/billing';

// Mock the /me query seam so usePermission resolves synchronously without a
// QueryClientProvider. Real usePermission logic still runs against this data.
vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

const ALL_PERMS = ['billing:queue', 'billing:scrub'];
function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue({ data: { permissions } } as unknown as ReturnType<typeof useUserRoles>);
}

function eligible(over: Partial<SecondaryEligibleClaim> = {}): SecondaryEligibleClaim {
  return {
    claimId: 1,
    claimNumber: 'HSP-1',
    patientName: 'Doe, Jane',
    primaryPayer: 'MEDICARE',
    secondaryPayer: 'MEDICAID',
    chargeAmount: 1000,
    primaryPaidAmount: 600,
    balanceForSecondary: 400,
    serviceDate: '2026-04-15T00:00:00Z',
    ...over,
  };
}

function buildResult(over: Partial<Secondary837Result> = {}): Secondary837Result {
  return {
    submissionId: 99,
    edi837: 'ISA*00*          *...',
    controlNumber: '000000001',
    primaryPaidAmount: 600,
    secondaryClaimAmount: 400,
    warnings: [],
    ...over,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <SecondaryClaimsPage />
    </MemoryRouter>,
  );
}

describe('SecondaryClaimsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: user holds every permission this page uses so existing
    // behaviour tests see enabled buttons. Permission-gating tests override.
    setPermissions(ALL_PERMS);
  });

  it('lists eligible claims', async () => {
    vi.mocked(listEligibleSecondary).mockResolvedValueOnce({ data: [eligible()] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('HSP-1')).toBeInTheDocument();
    });
    expect(screen.getByText('MEDICARE')).toBeInTheDocument();
    expect(screen.getByText('MEDICAID')).toBeInTheDocument();
    expect(screen.getByText(/\$400/)).toBeInTheDocument();
  });

  it('shows empty state when no eligible claims', async () => {
    vi.mocked(listEligibleSecondary).mockResolvedValueOnce({ data: [] });
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText(/No claims currently eligible for secondary submission/i),
      ).toBeInTheDocument();
    });
  });

  it('builds a secondary 837', async () => {
    const user = userEvent.setup();
    vi.mocked(listEligibleSecondary)
      .mockResolvedValueOnce({ data: [eligible()] })
      .mockResolvedValueOnce({ data: [] });
    vi.mocked(buildSecondary837).mockResolvedValueOnce(buildResult());

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Build 837' }));

    await waitFor(() => {
      expect(buildSecondary837).toHaveBeenCalledWith(1, 'availity');
    });
    expect(screen.getByText(/Generated secondary 837/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Submission #99/i).length).toBeGreaterThanOrEqual(1);
  });

  it('shows warnings in the result panel', async () => {
    const user = userEvent.setup();
    vi.mocked(listEligibleSecondary).mockResolvedValue({ data: [eligible()] });
    vi.mocked(buildSecondary837).mockResolvedValueOnce(
      buildResult({ warnings: ['SecondaryInsuredId is missing; clearinghouse may reject.'] }),
    );

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Build 837' }));

    await waitFor(() => {
      expect(screen.getByText(/SecondaryInsuredId is missing/i)).toBeInTheDocument();
    });
  });

  it('shows backend error when build fails', async () => {
    const user = userEvent.setup();
    vi.mocked(listEligibleSecondary).mockResolvedValue({ data: [eligible()] });
    vi.mocked(buildSecondary837).mockRejectedValueOnce({
      response: { data: { error: 'Claim already has an open secondary submission.' } },
    });

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Build 837' }));

    await waitFor(() => {
      expect(screen.getByText(/already has an open secondary submission/i)).toBeInTheDocument();
    });
  });

  it('disables Build 837 with a permission tooltip when the user lacks billing:scrub', async () => {
    setPermissions(['billing:queue']); // no billing:scrub
    vi.mocked(listEligibleSecondary).mockResolvedValue({ data: [eligible()] });

    renderPage();
    const btn = await screen.findByRole('button', { name: 'Build 837' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
  });

  it('enables Build 837 when the user has billing:scrub', async () => {
    setPermissions(['billing:queue', 'billing:scrub']);
    vi.mocked(listEligibleSecondary).mockResolvedValue({ data: [eligible()] });

    renderPage();
    expect(await screen.findByRole('button', { name: 'Build 837' })).toBeEnabled();
  });

  it('changes clearinghouse selection', async () => {
    const user = userEvent.setup();
    vi.mocked(listEligibleSecondary).mockResolvedValue({ data: [eligible()] });
    vi.mocked(buildSecondary837).mockResolvedValueOnce(buildResult());

    renderPage();
    await screen.findByText('HSP-1');
    await user.selectOptions(
      screen.getByLabelText(/Clearinghouse for outgoing secondary 837/i),
      'waystar',
    );
    await user.click(screen.getByRole('button', { name: 'Build 837' }));

    await waitFor(() => {
      expect(buildSecondary837).toHaveBeenCalledWith(1, 'waystar');
    });
  });
});

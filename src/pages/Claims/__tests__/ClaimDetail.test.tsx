import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ClaimDetail } from '@/pages/Claims/ClaimDetail';
import type { ClaimDetail as ClaimDetailType } from '@/api/claims';

vi.mock('@/api/claims', () => ({
  getClaim: vi.fn(),
  submitClaim: vi.fn(),
  downloadClaimPdf: vi.fn(),
  scrubClaimById: vi.fn(),
  predictClaimDenial: vi.fn(),
}));

import { getClaim, submitClaim, downloadClaimPdf, scrubClaimById, predictClaimDenial } from '@/api/claims';

// Mock the /me query seam so usePermission resolves synchronously without a
// QueryClientProvider. Real usePermission logic still runs against this data.
vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

const ALL_CLAIM_PERMS = ['claims:view', 'claims:submit', 'billing:scrub', 'claims:print'];
function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue({ data: { permissions } } as unknown as ReturnType<typeof useUserRoles>);
}

function claim(over: Partial<ClaimDetailType> = {}): ClaimDetailType {
  return {
    id: 5,
    patientName: 'Margaret Doe',
    status: 'submitted',
    amount: 1081.9,
    submittedDate: '2026-05-10T00:00:00Z',
    organizationId: 1,
    createdAt: '2026-05-10T00:00:00Z',
    paidAmount: null,
    denialReason: null,
    updatedAt: null,
    serviceLines: [],
    ...over,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/claims/5']}>
      <Routes>
        <Route path="/claims/:id" element={<ClaimDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: user holds every claim-related permission so existing
  // behaviour tests see enabled buttons. Permission-gating tests override.
  setPermissions(ALL_CLAIM_PERMS);
  // jsdom doesn't ship a URL.createObjectURL — stub it so the print handler runs cleanly
  Object.assign(URL, {
    createObjectURL: vi.fn(() => 'blob:fake'),
    revokeObjectURL: vi.fn(),
  });
});

describe('ClaimDetail — print button', () => {
  it('triggers a PDF download when clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(getClaim).mockResolvedValue(claim());
    const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    vi.mocked(downloadClaimPdf).mockResolvedValue(blob);

    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Claim #5/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Print Claim Form/i }));

    await waitFor(() => {
      expect(downloadClaimPdf).toHaveBeenCalledWith(5);
    });
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('shows an error if the PDF download fails', async () => {
    const user = userEvent.setup();
    vi.mocked(getClaim).mockResolvedValue(claim());
    vi.mocked(downloadClaimPdf).mockRejectedValue(new Error('boom'));

    renderPage();
    await screen.findByText(/Claim #5/i);
    await user.click(screen.getByRole('button', { name: /Print Claim Form/i }));

    expect(await screen.findByText(/Failed to download claim PDF/i)).toBeInTheDocument();
  });

  it('renders Print Claim Form on every status (including paid)', async () => {
    vi.mocked(getClaim).mockResolvedValue(claim({ status: 'paid' }));
    renderPage();
    await screen.findByText(/Claim #5/i);
    // Submit hidden on paid; Print should still be present
    expect(screen.queryByRole('button', { name: /Submit Claim/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Print Claim Form/i })).toBeInTheDocument();
  });
});

describe('ClaimDetail — Validate (scrub)', () => {
  it('shows passed result with no findings', async () => {
    const user = userEvent.setup();
    vi.mocked(getClaim).mockResolvedValue(claim());
    vi.mocked(scrubClaimById).mockResolvedValue({
      passed: true, findings: [],
    });

    renderPage();
    await screen.findByText(/Claim #5/i);
    await user.click(screen.getByRole('button', { name: /^Validate$/ }));

    expect(await screen.findByText(/Validation passed$/i)).toBeInTheDocument();
  });

  it('renders findings with severity tags when validation fails', async () => {
    const user = userEvent.setup();
    vi.mocked(getClaim).mockResolvedValue(claim());
    vi.mocked(scrubClaimById).mockResolvedValue({
      passed: false,
      findings: [
        { rule: 'NPI_LUHN', field: 'billingNPI', severity: 'error',
          message: 'Billing NPI fails Luhn check digit validation' },
        { rule: 'TIMELY_FILING_WARNING', field: 'serviceDate', severity: 'warning',
          message: 'Approaching timely filing deadline' },
      ],
    });

    renderPage();
    await screen.findByText(/Claim #5/i);
    await user.click(screen.getByRole('button', { name: /^Validate$/ }));

    expect(await screen.findByText(/Validation failed · 1 error/i)).toBeInTheDocument();
    expect(screen.getByText(/Billing NPI fails Luhn/i)).toBeInTheDocument();
    expect(screen.getByText(/Approaching timely filing/i)).toBeInTheDocument();
  });

  it('shows passed-with-warnings count when only warnings present', async () => {
    const user = userEvent.setup();
    vi.mocked(getClaim).mockResolvedValue(claim());
    vi.mocked(scrubClaimById).mockResolvedValue({
      passed: true,
      findings: [
        { rule: 'AMOUNT_HIGH', field: 'totalAmount', severity: 'warning',
          message: 'Total amount is unusually high' },
      ],
    });

    renderPage();
    await screen.findByText(/Claim #5/i);
    await user.click(screen.getByRole('button', { name: /^Validate$/ }));

    expect(await screen.findByText(/Validation passed \(1 warning\)/i))
      .toBeInTheDocument();
  });
});

describe('ClaimDetail — AI denial prediction', () => {
  it('runs prediction and displays risk panel with rationale + fixes', async () => {
    const user = userEvent.setup();
    vi.mocked(getClaim).mockResolvedValue(claim());
    vi.mocked(predictClaimDenial).mockResolvedValueOnce({
      riskLevel: 'high',
      likelyDenialCode: 'CO-50',
      rationale: 'Prior auth missing for procedure code 99205.',
      suggestedFixes: ['Verify prior auth', 'Attach 278 transaction'],
    });

    renderPage();
    await screen.findByText(/Claim #5/i);

    await user.click(screen.getByRole('button', { name: /Predict denial risk/i }));

    expect(await screen.findByText(/Prior auth missing/i)).toBeInTheDocument();
    expect(screen.getByText(/Likely denial:/i)).toBeInTheDocument();
    expect(screen.getByText(/CO-50/)).toBeInTheDocument();
    expect(screen.getByText(/Verify prior auth/)).toBeInTheDocument();
    expect(screen.getByText(/Attach 278/)).toBeInTheDocument();
    expect(screen.getByText(/AI advisory/i)).toBeInTheDocument();
    // Button label flips to Re-run after a prediction has been produced.
    expect(screen.getByRole('button', { name: /Re-run AI prediction/i })).toBeInTheDocument();
  });

  it('renders "unknown" risk panel when AI fallback fires', async () => {
    const user = userEvent.setup();
    vi.mocked(getClaim).mockResolvedValue(claim());
    vi.mocked(predictClaimDenial).mockResolvedValueOnce({
      riskLevel: 'unknown',
      likelyDenialCode: null,
      rationale: 'AI provider returned non-JSON output; manual review required.',
      suggestedFixes: [],
    });

    renderPage();
    await screen.findByText(/Claim #5/i);
    await user.click(screen.getByRole('button', { name: /Predict denial risk/i }));

    expect(await screen.findByText(/unknown risk/i)).toBeInTheDocument();
    expect(screen.queryByText(/Likely denial:/i)).not.toBeInTheDocument();
  });

  it('surfaces error when prediction fails', async () => {
    const user = userEvent.setup();
    vi.mocked(getClaim).mockResolvedValue(claim());
    vi.mocked(predictClaimDenial).mockRejectedValueOnce({
      response: { data: { error: 'AI provider unavailable' } },
    });

    renderPage();
    await screen.findByText(/Claim #5/i);
    await user.click(screen.getByRole('button', { name: /Predict denial risk/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/AI provider unavailable/i);
  });
});

describe('ClaimDetail — submit', () => {
  it('submits the claim and reflects the refreshed status', async () => {
    const user = userEvent.setup();
    vi.mocked(getClaim).mockResolvedValue(claim({ status: 'draft' }));
    vi.mocked(submitClaim).mockResolvedValue(claim({ status: 'submitted' }));

    renderPage();
    await screen.findByText(/Claim #5/i);

    await user.click(screen.getByRole('button', { name: /Submit Claim/i }));

    await waitFor(() => {
      expect(submitClaim).toHaveBeenCalledWith(5);
    });
    // Status flips to submitted, which hides the Submit button.
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Submit Claim/i })).not.toBeInTheDocument();
    });
  });

  it('surfaces an "already being submitted" error on a 409 ALREADY_SUBMITTING', async () => {
    const user = userEvent.setup();
    vi.mocked(getClaim).mockResolvedValue(claim({ status: 'draft' }));
    vi.mocked(submitClaim).mockRejectedValue({
      response: { status: 409, data: { code: 'ALREADY_SUBMITTING' } },
    });

    renderPage();
    await screen.findByText(/Claim #5/i);
    await user.click(screen.getByRole('button', { name: /Submit Claim/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/already being submitted/i);
  });
});

describe('ClaimDetail — permission gating', () => {
  it('disables Submit Claim with a permission tooltip when the user lacks claims:submit', async () => {
    setPermissions(['claims:view', 'billing:scrub', 'claims:print']); // no claims:submit
    vi.mocked(getClaim).mockResolvedValue(claim({ status: 'draft' }));

    renderPage();
    await screen.findByText(/Claim #5/i);

    const btn = screen.getByRole('button', { name: /Submit Claim/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
  });

  it('enables Submit Claim when the user has claims:submit', async () => {
    setPermissions(['claims:view', 'claims:submit']);
    vi.mocked(getClaim).mockResolvedValue(claim({ status: 'draft' }));

    renderPage();
    await screen.findByText(/Claim #5/i);

    expect(screen.getByRole('button', { name: /Submit Claim/i })).toBeEnabled();
  });

  it('disables Validate when the user lacks billing:scrub', async () => {
    setPermissions(['claims:view']); // no billing:scrub
    vi.mocked(getClaim).mockResolvedValue(claim());

    renderPage();
    await screen.findByText(/Claim #5/i);

    expect(screen.getByRole('button', { name: /^Validate$/ })).toBeDisabled();
  });

  it('disables Print Claim Form when the user lacks claims:print', async () => {
    setPermissions(['claims:view']); // no claims:print
    vi.mocked(getClaim).mockResolvedValue(claim());

    renderPage();
    await screen.findByText(/Claim #5/i);

    expect(screen.getByRole('button', { name: /Print Claim Form/i })).toBeDisabled();
  });
});

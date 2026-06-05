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

import { getClaim, downloadClaimPdf, scrubClaimById, predictClaimDenial } from '@/api/claims';

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

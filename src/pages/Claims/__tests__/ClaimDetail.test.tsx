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
}));

import { getClaim, downloadClaimPdf } from '@/api/claims';

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

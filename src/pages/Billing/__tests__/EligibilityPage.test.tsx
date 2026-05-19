import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { EligibilityPage } from '@/pages/Billing/EligibilityPage';
import type { EligibilityCheck } from '@/api/billing';

vi.mock('@/api/billing', () => ({
  verifyEligibility: vi.fn(),
  listRecentEligibility: vi.fn(),
}));

import { listRecentEligibility, verifyEligibility } from '@/api/billing';

function check(over: Partial<EligibilityCheck> = {}): EligibilityCheck {
  return {
    id: 1,
    patientId: 100,
    payerId: '00100',
    payerName: 'Medicare Part A/B',
    memberId: '1EG4-TE5-MK74',
    memberFirstName: 'Margaret',
    memberLastName: 'Doe',
    memberDob: '19400314',
    clearinghouse: 'mock',
    eligible: true,
    planName: 'Medicare A/B',
    coverageStart: '2026-01-01T00:00:00Z',
    coverageEnd: null,
    errorMessage: null,
    checkedAtUtc: '2026-05-19T12:00:00Z',
    checkedByEmail: 'intake@x',
    ...over,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <EligibilityPage />
    </MemoryRouter>,
  );
}

describe('EligibilityPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the form + empty recent list', async () => {
    vi.mocked(listRecentEligibility).mockResolvedValueOnce({ data: [] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Insurance Eligibility/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/New Verification/i)).toBeInTheDocument();
    expect(screen.getByText(/No verifications yet/i)).toBeInTheDocument();
  });

  it('lists recent verifications', async () => {
    vi.mocked(listRecentEligibility).mockResolvedValueOnce({ data: [check()] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Doe, Margaret/i)).toBeInTheDocument();
    });
    expect(screen.getAllByText('Medicare Part A/B').length).toBeGreaterThanOrEqual(1);
  });

  it('submits a verification and shows the result panel', async () => {
    const user = userEvent.setup();
    vi.mocked(listRecentEligibility)
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [check()] });
    vi.mocked(verifyEligibility).mockResolvedValueOnce(check());

    renderPage();
    await screen.findByText(/New Verification/i);
    await user.type(screen.getByLabelText(/Member ID \*/i), '1EG4-TE5-MK74');
    await user.type(screen.getByLabelText(/Member DOB \*/i), '1940-03-14');
    await user.type(screen.getByLabelText(/Member First Name \*/i), 'Margaret');
    await user.type(screen.getByLabelText(/Member Last Name \*/i), 'Doe');
    await user.click(screen.getByRole('button', { name: /Verify Eligibility/i }));

    await waitFor(() => {
      expect(verifyEligibility).toHaveBeenCalledWith(
        expect.objectContaining({
          payerId: '00100',
          memberId: '1EG4-TE5-MK74',
          memberFirstName: 'Margaret',
          memberLastName: 'Doe',
        }),
      );
    });
    expect(screen.getByText(/Verification #1/i)).toBeInTheDocument();
    expect(screen.getAllByText('Eligible').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Not Eligible badge when result is false', async () => {
    const user = userEvent.setup();
    vi.mocked(listRecentEligibility).mockResolvedValue({ data: [] });
    vi.mocked(verifyEligibility).mockResolvedValueOnce(
      check({ eligible: false, planName: null, errorMessage: 'Coverage not found' }),
    );

    renderPage();
    await user.type(screen.getByLabelText(/Member ID \*/i), 'BAD');
    await user.type(screen.getByLabelText(/Member DOB \*/i), '1940-03-14');
    await user.type(screen.getByLabelText(/Member First Name \*/i), 'A');
    await user.type(screen.getByLabelText(/Member Last Name \*/i), 'B');
    await user.click(screen.getByRole('button', { name: /Verify Eligibility/i }));

    await waitFor(() => {
      expect(screen.getByText(/Coverage not found/i)).toBeInTheDocument();
    });
    expect(screen.getAllByText('Not Eligible').length).toBeGreaterThanOrEqual(1);
  });

  it('shows backend error when verification fails', async () => {
    const user = userEvent.setup();
    vi.mocked(listRecentEligibility).mockResolvedValue({ data: [] });
    vi.mocked(verifyEligibility).mockRejectedValueOnce({
      response: { data: { error: 'MemberDob is required.' } },
    });

    renderPage();
    await user.type(screen.getByLabelText(/Member ID \*/i), 'M-1');
    await user.type(screen.getByLabelText(/Member DOB \*/i), '1940-03-14');
    await user.type(screen.getByLabelText(/Member First Name \*/i), 'X');
    await user.type(screen.getByLabelText(/Member Last Name \*/i), 'Y');
    await user.click(screen.getByRole('button', { name: /Verify Eligibility/i }));

    await waitFor(() => {
      expect(screen.getByText(/MemberDob is required/i)).toBeInTheDocument();
    });
  });

  it('switches payer via the select', async () => {
    const user = userEvent.setup();
    vi.mocked(listRecentEligibility).mockResolvedValue({ data: [] });
    vi.mocked(verifyEligibility).mockResolvedValueOnce(
      check({ payerId: 'AETNA', payerName: 'Aetna' }),
    );

    renderPage();
    await user.selectOptions(screen.getByLabelText(/Payer \*/i), 'AETNA');
    await user.type(screen.getByLabelText(/Member ID \*/i), 'AET-1');
    await user.type(screen.getByLabelText(/Member DOB \*/i), '1940-03-14');
    await user.type(screen.getByLabelText(/Member First Name \*/i), 'X');
    await user.type(screen.getByLabelText(/Member Last Name \*/i), 'Y');
    await user.click(screen.getByRole('button', { name: /Verify Eligibility/i }));

    await waitFor(() => {
      expect(verifyEligibility).toHaveBeenCalledWith(
        expect.objectContaining({ payerId: 'AETNA' }),
      );
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ClaimPrintView } from '@/pages/Claims/ClaimPrintView';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/api/claims', async () => {
  const actual = await vi.importActual<typeof import('@/api/claims')>('@/api/claims');
  return {
    ...actual,
    getClaimForPrint: vi.fn(),
    downloadClaimPdf: vi.fn(),
  };
});

import { getClaimForPrint, downloadClaimPdf } from '@/api/claims';

function buildClaim(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 7,
    claimNumber: 'CLM-2026-00007',
    organizationId: 1,
    patientName: 'Jane Doe',
    patientId: 42,
    encounterId: null,
    serviceDate: '2026-05-01',
    submittedDate: null,
    amount: 250.0,
    paidAmount: null,
    status: 'draft',
    payer: 'Medicare',
    denialReason: null,
    createdAt: '2026-06-04T00:00:00Z',
    updatedAt: '2026-06-04T00:00:00Z',
    insuranceType: 'medicare',
    insuredIdNumber: '123-45-6789',
    serviceLines: [],
    patient: {
      id: 42,
      firstName: 'Jane',
      lastName: 'Doe',
      dateOfBirth: '1948-01-15',
      gender: 'F',
    },
    ...overrides,
  };
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/claims/:id/print" element={<ClaimPrintView />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ClaimPrintView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
  });

  it('renders CMS-1500 form when claim loads', async () => {
    vi.mocked(getClaimForPrint).mockResolvedValueOnce(buildClaim());
    renderAt('/claims/7/print');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^print$/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/CMS-1500 claim CLM-2026-00007/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to claim/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download pdf/i })).toBeInTheDocument();
  });

  it('shows error when fetch fails', async () => {
    vi.mocked(getClaimForPrint).mockRejectedValueOnce(new Error('Network failure'));
    renderAt('/claims/7/print');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/network failure/i);
    });
    expect(screen.getByRole('link', { name: /back to claims/i })).toHaveAttribute('href', '/claims');
  });

  it('calls window.print() when Print button clicked', async () => {
    vi.mocked(getClaimForPrint).mockResolvedValueOnce(buildClaim());
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    renderAt('/claims/7/print');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^print$/i })).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /^print$/i }));

    expect(printSpy).toHaveBeenCalledTimes(1);
    printSpy.mockRestore();
  });

  it('navigates back when Back button clicked', async () => {
    vi.mocked(getClaimForPrint).mockResolvedValueOnce(buildClaim());
    renderAt('/claims/7/print');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /back to claim/i })).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /back to claim/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/claims/7');
  });

  it('triggers PDF download on Download button click', async () => {
    vi.mocked(getClaimForPrint).mockResolvedValueOnce(buildClaim());
    const fakeBlob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    vi.mocked(downloadClaimPdf).mockResolvedValueOnce(fakeBlob);

    // jsdom doesn't implement createObjectURL/revokeObjectURL — stub them.
    URL.createObjectURL = vi.fn(() => 'blob:fake-url');
    URL.revokeObjectURL = vi.fn();

    renderAt('/claims/7/print');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /download pdf/i })).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /download pdf/i }));

    await waitFor(() => {
      expect(downloadClaimPdf).toHaveBeenCalledWith(7);
      expect(URL.createObjectURL).toHaveBeenCalledWith(fakeBlob);
    });
  });
});

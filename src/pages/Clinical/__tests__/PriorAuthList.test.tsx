import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PriorAuthList } from '@/pages/Clinical/PriorAuthList';
import * as clinicalApi from '@/api/clinical';

vi.mock('@/permissions/usePermission', () => ({ usePermission: () => true }));
vi.mock('@/api/clinical');

function pa(overrides: Partial<clinicalApi.PriorAuth> = {}): clinicalApi.PriorAuth {
  return {
    id: 1,
    patientId: 5,
    organizationId: 1,
    status: 'pending',
    serviceType: 'hospice',
    requestedDate: '2026-06-01T00:00:00Z',
    approvedDate: null,
    deniedDate: null,
    expirationDate: null,
    payer: 'Medicare',
    payerName: null,
    authNumber: null,
    referenceId: 'REF-123',
    createdAt: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

function renderPage() {
  return render(<MemoryRouter><PriorAuthList /></MemoryRouter>);
}

describe('PriorAuthList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(clinicalApi.getPriorAuths).mockResolvedValue({
      data: [pa()],
      pagination: { total: 1, page: 1, pageSize: 25 },
    });
    vi.mocked(clinicalApi.updatePriorAuthStatus).mockResolvedValue(pa({ status: 'approved' }));
  });

  it('renders the reference id from referenceId (not the stale referenceNumber) (M7)', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('REF-123')).toBeInTheDocument());
    expect(screen.getByText('Medicare')).toBeInTheDocument();
  });

  it('records an approve decision for a pending auth (M7)', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() =>
      expect(clinicalApi.updatePriorAuthStatus).toHaveBeenCalledWith(1, 'approved'),
    );
  });

  it('creates a prior auth from the form (M7)', async () => {
    vi.mocked(clinicalApi.createPriorAuth).mockResolvedValue(pa({ id: 2 }));
    renderPage();
    await waitFor(() => expect(screen.getByText('REF-123')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /new prior auth/i }));
    fireEvent.change(screen.getByLabelText(/patient id/i), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(/payer/i), { target: { value: 'Aetna' } });
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() =>
      expect(clinicalApi.createPriorAuth).toHaveBeenCalledWith(
        expect.objectContaining({ patientId: 5, payer: 'Aetna', serviceType: 'hospice' }),
      ),
    );
  });
});

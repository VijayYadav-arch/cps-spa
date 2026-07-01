import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ClinicalWorklistPage } from '@/pages/Clinical/ClinicalWorklistPage';

vi.mock('@/api/clinical', () => ({
  getVisits: vi.fn(),
  getOrders: vi.fn(),
  getCarePlans: vi.fn(),
}));
import { getVisits, getOrders, getCarePlans } from '@/api/clinical';

const order = (id: number, signedBy: string | null) => ({
  id, patientId: 1, orderDate: '2026-06-20', orderType: 'Lab', orderText: 'CBC',
  orderedBy: 'Dr X', frequency: null, isVerbal: false, signedBy, status: signedBy ? 'signed' : 'pending',
});
const plan = (id: number, status: string, reviewDate: string | null) => ({
  id, patientId: 1, organizationId: 1, admissionId: null, version: 1, status,
  effectiveDate: '2026-05-01', reviewDate, goals: '[]', interventions: '[]', frequency: null, signedBy: null, signedAt: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getVisits).mockResolvedValue([{ id: 3, patientId: 1, patientName: 'Doe, Jo', visitDate: '2026-06-20', status: 'draft', visitType: 'Nursing' }] as never);
  vi.mocked(getOrders).mockResolvedValue({ data: [order(10, null), order(11, 'Dr X')] } as never);
  vi.mocked(getCarePlans).mockResolvedValue({ data: [plan(20, 'draft', null), plan(21, 'active', '2020-01-01')] } as never);
});

function renderPage() {
  return render(<MemoryRouter><ClinicalWorklistPage /></MemoryRouter>);
}

describe('ClinicalWorklistPage', () => {
  it('shows draft documentation, unsigned orders, and reviewable care plans', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('worklist-documentation')).toBeInTheDocument());
    // documentation-due: the draft visit
    expect(screen.getByTestId('worklist-documentation-row-3')).toBeInTheDocument();
    // orders: only the unsigned one (10), not the signed (11)
    expect(screen.getByTestId('worklist-orders-row-10')).toBeInTheDocument();
    expect(screen.queryByTestId('worklist-orders-row-11')).toBeNull();
    // care plans: draft (20) + overdue-review (21)
    expect(screen.getByTestId('worklist-care-plans-row-20')).toBeInTheDocument();
    expect(screen.getByTestId('worklist-care-plans-row-21')).toBeInTheDocument();
  });

  it('requests draft visit notes', async () => {
    renderPage();
    await waitFor(() => expect(vi.mocked(getVisits)).toHaveBeenCalledWith({ status: 'draft' }));
  });

  it('shows an all-caught-up state when there is no work', async () => {
    vi.mocked(getVisits).mockResolvedValue([] as never);
    vi.mocked(getOrders).mockResolvedValue({ data: [] } as never);
    vi.mocked(getCarePlans).mockResolvedValue({ data: [] } as never);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('worklist-empty')).toBeInTheDocument());
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ChargeEntryPage } from '@/pages/Billing/ChargeEntryPage';
import type { ChargeRecord } from '@/api/billing';

vi.mock('@/api/billing', () => ({
  listCharges: vi.fn(),
  createCharge: vi.fn(),
  markChargeReviewed: vi.fn(),
  voidCharge: vi.fn(),
  attachChargesToClaim: vi.fn(),
  getPendingChargesSummary: vi.fn(),
}));

import {
  listCharges,
  createCharge,
  markChargeReviewed,
  voidCharge,
  attachChargesToClaim,
  getPendingChargesSummary,
} from '@/api/billing';

function charge(over: Partial<ChargeRecord> = {}): ChargeRecord {
  return {
    id: 1,
    patientId: 100,
    admissionId: null,
    encounterId: 200,
    chargeDate: '2026-05-19T00:00:00Z',
    chargeType: 'per-diem',
    revenueCode: '0651',
    procedureCode: null,
    units: 5,
    amount: 216.38,
    totalAmount: 1081.90,
    status: 'pending',
    claimId: null,
    notes: null,
    createdAt: '2026-05-19T12:00:00Z',
    updatedAt: '2026-05-19T12:00:00Z',
    ...over,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ChargeEntryPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default to confirm = true so void tests work
  vi.stubGlobal('confirm', vi.fn(() => true));
});

describe('ChargeEntryPage', () => {
  it('renders the charges list', async () => {
    vi.mocked(listCharges).mockResolvedValue({ data: [charge()] });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('per-diem')).toBeInTheDocument();
    });
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('$1,081.90')).toBeInTheDocument();
  });

  it('shows an empty state when there are no charges', async () => {
    vi.mocked(listCharges).mockResolvedValue({ data: [] });
    renderPage();
    expect(await screen.findByText(/No charges in this view/i)).toBeInTheDocument();
  });

  it('creates a new charge via the form', async () => {
    const user = userEvent.setup();
    vi.mocked(listCharges).mockResolvedValue({ data: [] });
    vi.mocked(createCharge).mockResolvedValue({ data: charge({ id: 99 }) });

    renderPage();
    await screen.findByText(/No charges in this view/i);
    await user.click(screen.getByRole('button', { name: /New Charge/i }));

    await user.type(screen.getByLabelText(/Patient ID \*/i), '100');
    await user.clear(screen.getByLabelText(/Amount per unit/i));
    await user.type(screen.getByLabelText(/Amount per unit/i), '216.38');
    await user.click(screen.getByRole('button', { name: /Save Charge/i }));

    await waitFor(() => {
      expect(createCharge).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 100,
          chargeType: 'per-diem',
          units: 1,
          amount: 216.38,
        }),
      );
    });
    expect(await screen.findByText(/Created charge #99/i)).toBeInTheDocument();
  });

  it('rejects procedure charges with no procedure code client side', async () => {
    const user = userEvent.setup();
    vi.mocked(listCharges).mockResolvedValue({ data: [] });
    renderPage();
    await screen.findByText(/No charges in this view/i);
    await user.click(screen.getByRole('button', { name: /New Charge/i }));

    await user.type(screen.getByLabelText(/Patient ID \*/i), '100');
    await user.selectOptions(screen.getByLabelText(/Charge Type/i), 'procedure');
    await user.clear(screen.getByLabelText(/Amount per unit/i));
    await user.type(screen.getByLabelText(/Amount per unit/i), '50');
    await user.click(screen.getByRole('button', { name: /Save Charge/i }));

    expect(await screen.findByText(/Procedure code is required/i)).toBeInTheDocument();
    expect(createCharge).not.toHaveBeenCalled();
  });

  it('marks a pending charge reviewed', async () => {
    const user = userEvent.setup();
    vi.mocked(listCharges).mockResolvedValue({ data: [charge({ id: 7, status: 'pending' })] });
    vi.mocked(markChargeReviewed).mockResolvedValue(undefined);

    renderPage();
    await screen.findByText('#7');
    await user.click(screen.getByRole('button', { name: /Mark reviewed/i }));

    await waitFor(() => {
      expect(markChargeReviewed).toHaveBeenCalledWith(7);
    });
  });

  it('voids a pending charge after confirmation', async () => {
    const user = userEvent.setup();
    vi.mocked(listCharges).mockResolvedValue({ data: [charge({ id: 8, status: 'pending' })] });
    vi.mocked(voidCharge).mockResolvedValue(undefined);

    renderPage();
    await screen.findByText('#8');
    await user.click(screen.getByRole('button', { name: 'Void' }));

    await waitFor(() => {
      expect(voidCharge).toHaveBeenCalledWith(8);
    });
  });

  it('hides actions on billed charges and shows claim link', async () => {
    vi.mocked(listCharges).mockResolvedValue({
      data: [charge({ id: 9, status: 'billed', claimId: 42 })],
    });
    renderPage();
    await screen.findByText('#9');
    expect(screen.getByText('on claim #42')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mark reviewed/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Void' })).not.toBeInTheDocument();
  });

  it('shows the attach-to-claim strip after selection and submits', async () => {
    const user = userEvent.setup();
    vi.mocked(listCharges).mockResolvedValue({
      data: [
        charge({ id: 1, status: 'pending', patientId: 100 }),
        charge({ id: 2, status: 'reviewed', patientId: 100 }),
      ],
    });
    vi.mocked(attachChargesToClaim).mockResolvedValue(undefined);
    renderPage();
    await screen.findByText('#1');

    await user.click(screen.getByLabelText('Select charge 1'));
    await user.click(screen.getByLabelText('Select charge 2'));
    await user.type(screen.getByPlaceholderText('Claim ID'), '77');
    await user.click(screen.getByRole('button', { name: /Attach to claim/i }));

    await waitFor(() => {
      expect(attachChargesToClaim).toHaveBeenCalledWith([1, 2], 77);
    });
    expect(await screen.findByText(/Attached 2 charge\(s\) to claim #77/i)).toBeInTheDocument();
  });

  it('filters the list by status', async () => {
    const user = userEvent.setup();
    vi.mocked(listCharges)
      .mockResolvedValueOnce({ data: [charge({ status: 'pending' })] })
      .mockResolvedValueOnce({ data: [charge({ status: 'billed' })] });

    renderPage();
    await screen.findByText('per-diem');

    // Pick the status filter "billed" button (the per-row badge is a span, not a button)
    await user.click(screen.getByRole('button', { name: 'billed' }));
    await waitFor(() => {
      expect(listCharges).toHaveBeenLastCalledWith({ status: 'billed' });
    });
  });

  it('loads pending summary when a patient filter is provided', async () => {
    const user = userEvent.setup();
    vi.mocked(listCharges).mockResolvedValue({ data: [] });
    vi.mocked(getPendingChargesSummary).mockResolvedValue({
      data: {
        patientId: 100,
        chargeCount: 3,
        totalAmount: 2500,
        earliestServiceDate: '2026-05-01T00:00:00Z',
        latestServiceDate: '2026-05-19T00:00:00Z',
      },
    });
    renderPage();
    await user.type(screen.getByLabelText(/Patient ID filter/i), '100');

    await waitFor(() => {
      expect(getPendingChargesSummary).toHaveBeenCalledWith(100);
    });
    expect(await screen.findByText(/3 pending/i)).toBeInTheDocument();
    const summaryBlock = screen.getByText(/3 pending/i).closest('div')!;
    expect(within(summaryBlock).getByText('$2,500.00')).toBeInTheDocument();
  });
});

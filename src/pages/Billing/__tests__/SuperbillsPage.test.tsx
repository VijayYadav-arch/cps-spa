import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SuperbillsPage } from '@/pages/Billing/SuperbillsPage';
import type { Superbill } from '@/api/billing';

vi.mock('@/api/billing', () => ({
  listSuperbills: vi.fn(),
  createSuperbill: vi.fn(),
  finalizeSuperbill: vi.fn(),
  downloadSuperbillPdf: vi.fn(),
}));
vi.mock('@/api/claims', () => ({
  searchBillingCodes: vi.fn(() => Promise.resolve({ data: [], count: 0 })),
}));

import {
  listSuperbills,
  createSuperbill,
  finalizeSuperbill,
  downloadSuperbillPdf,
} from '@/api/billing';

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom doesn't ship URL.createObjectURL — stub it for PDF download
  Object.assign(URL, {
    createObjectURL: vi.fn(() => 'blob:fake'),
    revokeObjectURL: vi.fn(),
  });
});

function sb(over: Partial<Superbill> = {}): Superbill {
  return {
    id: 1,
    organizationId: 7,
    patientId: 99,
    providerId: 'NPI-X',
    serviceDate: '2026-05-20T00:00:00Z',
    diagnosisCodes: JSON.stringify(['J18.9', 'I10']),
    procedureCodes: JSON.stringify([
      { code: '99214', modifier: null, units: 1, charge: 175 },
    ]),
    totalCharge: 175,
    status: 'draft',
    notes: null,
    createdAt: '2026-05-20T10:00:00Z',
    updatedAt: null,
    ...over,
  };
}

function renderPage() {
  return render(<MemoryRouter><SuperbillsPage /></MemoryRouter>);
}

describe('SuperbillsPage', () => {
  it('loads and renders the list', async () => {
    vi.mocked(listSuperbills).mockResolvedValue({
      data: [sb(), sb({ id: 2, status: 'finalized', totalCharge: 50 })],
      pagination: { total: 2, page: 1, pageSize: 25 },
    });
    renderPage();
    expect(await screen.findByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('finalized')).toBeInTheDocument();
    expect(screen.getByText('$175.00')).toBeInTheDocument();
  });

  it('opens the form, validates required fields, and creates a draft', async () => {
    const user = userEvent.setup();
    vi.mocked(listSuperbills).mockResolvedValue({
      data: [], pagination: { total: 0, page: 1, pageSize: 25 },
    });
    vi.mocked(createSuperbill).mockResolvedValue(sb());

    renderPage();
    await waitFor(() => expect(listSuperbills).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: /New superbill/i }));
    // Try to save with nothing filled — should set error
    await user.click(screen.getByRole('button', { name: /Save draft/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Patient ID, Provider, and at least one procedure are required/,
    );
    expect(createSuperbill).not.toHaveBeenCalled();

    // Fill required fields
    await user.type(screen.getByLabelText(/Patient ID/i), '99');
    await user.type(screen.getByLabelText(/Provider ID/i), 'NPI-X');
    // Procedure code via the first autocomplete (we type into the input,
    // skipping the dropdown — free-text fallback)
    const cptInputs = screen.getAllByRole('textbox');
    // The 1st autocomplete input is "Code" in the procedures table — find by its placeholder being unset; safer to find by id
    const cptInput = document.getElementById('sb-cpt-0') as HTMLInputElement;
    expect(cptInput).toBeTruthy();
    await user.type(cptInput, '99214');
    // Provide a charge (Charge row input)
    const chargeInputs = cptInputs.filter(() => true); // ignore; numeric inputs aren't textboxes
    void chargeInputs;
    const numericInputs = screen.getAllByRole('spinbutton');
    // numericInputs in order: patient id, units, charge → patient was already typed, so [0] is patient (filled), [1] is units, [2] is charge
    // Actually patient was typed in textbox-role number input — let's just clear and set the charge directly
    // Simpler: find by display value of "1" (units default) and set charge to 200
    const chargeField = numericInputs[numericInputs.length - 1];
    await user.clear(chargeField);
    await user.type(chargeField, '200');

    await user.click(screen.getByRole('button', { name: /Save draft/i }));

    await waitFor(() => {
      expect(createSuperbill).toHaveBeenCalledWith(expect.objectContaining({
        patientId: 99,
        providerId: 'NPI-X',
        procedureCodes: expect.arrayContaining([
          expect.objectContaining({ code: '99214', charge: 200, units: 1 }),
        ]),
      }));
    });
    expect(await screen.findByText(/Created superbill #1/)).toBeInTheDocument();
  });

  it('finalizes a draft', async () => {
    const user = userEvent.setup();
    vi.mocked(listSuperbills).mockResolvedValue({
      data: [sb()],
      pagination: { total: 1, page: 1, pageSize: 25 },
    });
    vi.mocked(finalizeSuperbill).mockResolvedValue(sb({ status: 'finalized' }));

    renderPage();
    await screen.findByText('#1');
    await user.click(screen.getByRole('button', { name: /^Finalize$/ }));

    await waitFor(() => expect(finalizeSuperbill).toHaveBeenCalledWith(1));
    expect(await screen.findByText(/Finalized superbill #1/)).toBeInTheDocument();
  });

  it('downloads PDF', async () => {
    const user = userEvent.setup();
    vi.mocked(listSuperbills).mockResolvedValue({
      data: [sb({ status: 'finalized' })],
      pagination: { total: 1, page: 1, pageSize: 25 },
    });
    vi.mocked(downloadSuperbillPdf).mockResolvedValue(new Blob(['x'], { type: 'application/pdf' }));

    renderPage();
    await screen.findByText('#1');
    await user.click(screen.getByRole('button', { name: /^PDF$/ }));

    await waitFor(() => expect(downloadSuperbillPdf).toHaveBeenCalledWith(1));
  });

  it('expands the detail panel on View', async () => {
    const user = userEvent.setup();
    vi.mocked(listSuperbills).mockResolvedValue({
      data: [sb()],
      pagination: { total: 1, page: 1, pageSize: 25 },
    });

    renderPage();
    await screen.findByText('#1');
    await user.click(screen.getByRole('button', { name: /^View$/ }));

    expect(await screen.findByText(/Superbill #1 detail/i)).toBeInTheDocument();
    expect(screen.getByText('99214')).toBeInTheDocument();
  });

  it('shows the empty state when there are no superbills', async () => {
    vi.mocked(listSuperbills).mockResolvedValue({
      data: [], pagination: { total: 0, page: 1, pageSize: 25 },
    });
    renderPage();
    expect(await screen.findByText(/No superbills yet/i)).toBeInTheDocument();
  });

  it('shows an error banner when load fails', async () => {
    vi.mocked(listSuperbills).mockRejectedValueOnce({
      response: { data: { error: 'forbidden' } },
    });
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('forbidden');
  });
});

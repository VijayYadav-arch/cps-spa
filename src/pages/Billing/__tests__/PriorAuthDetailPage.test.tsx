import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PriorAuthDetailPage } from '@/pages/Billing/PriorAuthDetailPage';
import type { PriorAuth, PriorAuthStatus } from '@/api/billing';

vi.mock('@/api/billing', () => ({
  getPriorAuth: vi.fn(),
  recordPriorAuthDecision: vi.fn(),
  refreshPriorAuthStatusNow: vi.fn(),
}));

import {
  getPriorAuth,
  recordPriorAuthDecision,
  refreshPriorAuthStatusNow,
} from '@/api/billing';

beforeEach(() => vi.clearAllMocks());

function pa(over: Partial<PriorAuth> = {}): PriorAuth {
  return {
    id: 42,
    patientId: 100,
    encounterId: null,
    payerId: '00100',
    payerName: 'Medicare Part A/B',
    memberId: '1EG4-TE5-MK74',
    memberFirstName: 'Margaret',
    memberLastName: 'Doe',
    memberDob: '19400314',
    providerNpi: '1234567890',
    providerOrganizationName: 'Demo Hospice',
    serviceTypeCode: '42',
    fromDate: '2026-05-20',
    toDate: '2026-08-20',
    requestedUnits: 30,
    diagnosisCodes: ['C50.911'],
    status: 'pending' as PriorAuthStatus,
    referenceId: 'MOCK-PA-001',
    authNumber: null,
    approvedUnits: null,
    authEffectiveDate: null,
    authExpirationDate: null,
    denialReason: null,
    errorMessage: null,
    clearinghouse: 'mock',
    submittedAtUtc: '2026-05-19T12:00:00Z',
    decidedAtUtc: null,
    submittedByEmail: 'intake@x',
    lastStatusCheckedAtUtc: null,
    ...over,
  };
}

function renderAt(id: number) {
  return render(
    <MemoryRouter initialEntries={[`/billing/prior-auth/${id}`]}>
      <Routes>
        <Route path="/billing/prior-auth/:id" element={<PriorAuthDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PriorAuthDetailPage', () => {
  it('renders header, status badge, and submission timeline event', async () => {
    vi.mocked(getPriorAuth).mockResolvedValue(pa());
    renderAt(42);

    expect(await screen.findByText(/Prior auth #42/)).toBeInTheDocument();
    // The h1 contains "Medicare Part A/B" interpolated; check substring
    expect(await screen.findByRole('heading', { name: /Medicare Part A\/B/i }))
      .toBeInTheDocument();
    // Timeline event for submission
    expect(screen.getByText(/Submitted to mock/)).toBeInTheDocument();
  });

  it('renders an approved decision in the timeline with auth number', async () => {
    vi.mocked(getPriorAuth).mockResolvedValue(pa({
      status: 'approved',
      authNumber: 'AUTH-MOCK-001',
      decidedAtUtc: '2026-05-19T13:00:00Z',
    }));
    renderAt(42);
    expect(await screen.findByText(/Approved · auth AUTH-MOCK-001/i)).toBeInTheDocument();
  });

  it('renders a denied decision with reason', async () => {
    vi.mocked(getPriorAuth).mockResolvedValue(pa({
      status: 'denied',
      decidedAtUtc: '2026-05-19T13:00:00Z',
      denialReason: 'Service not medically necessary',
    }));
    renderAt(42);
    expect(await screen.findByText(/Denied · Service not medically necessary/i))
      .toBeInTheDocument();
    // Also rendered in the dedicated panel
    expect(screen.getByText(/Denial reason:/i)).toBeInTheDocument();
  });

  it('refreshes status and reloads when "Refresh status now" clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(getPriorAuth)
      .mockResolvedValueOnce(pa())
      .mockResolvedValueOnce(pa({
        status: 'approved',
        authNumber: 'AUTH-X',
        decidedAtUtc: '2026-05-19T13:00:00Z',
      }));
    vi.mocked(refreshPriorAuthStatusNow).mockResolvedValue(undefined);

    renderAt(42);
    await screen.findByText(/Prior auth #42/);

    await user.click(screen.getByRole('button', { name: /Refresh status now/i }));

    await waitFor(() => expect(refreshPriorAuthStatusNow).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getPriorAuth).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/Approved · auth AUTH-X/i)).toBeInTheDocument();
  });

  it('opens and submits the approval modal', async () => {
    const user = userEvent.setup();
    vi.mocked(getPriorAuth).mockResolvedValue(pa());
    vi.mocked(recordPriorAuthDecision).mockResolvedValue(pa({
      status: 'approved',
      authNumber: 'AUTH-123',
    }));

    renderAt(42);
    await screen.findByText(/Prior auth #42/);

    await user.click(screen.getByRole('button', { name: /Record approval/i }));
    await user.type(screen.getByLabelText(/Auth number/i), 'AUTH-123');
    await user.click(screen.getByRole('button', { name: /^Save$/ }));

    await waitFor(() => {
      expect(recordPriorAuthDecision).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ status: 'approved', authNumber: 'AUTH-123' }),
      );
    });
  });

  it('opens and submits the denial modal with a reason', async () => {
    const user = userEvent.setup();
    vi.mocked(getPriorAuth).mockResolvedValue(pa());
    vi.mocked(recordPriorAuthDecision).mockResolvedValue(pa({
      status: 'denied', denialReason: 'not covered',
    }));

    renderAt(42);
    await screen.findByText(/Prior auth #42/);

    await user.click(screen.getByRole('button', { name: /Record denial/i }));
    await user.type(screen.getByLabelText(/Denial reason/i), 'not covered');
    await user.click(screen.getByRole('button', { name: /^Save$/ }));

    await waitFor(() => {
      expect(recordPriorAuthDecision).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ status: 'denied', denialReason: 'not covered' }),
      );
    });
  });

  it('shows 404 message', async () => {
    vi.mocked(getPriorAuth).mockRejectedValueOnce({ response: { status: 404 } });
    renderAt(99);
    expect(await screen.findByText(/Prior auth not found/i)).toBeInTheDocument();
  });
});

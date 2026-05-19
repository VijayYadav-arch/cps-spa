import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HospiceCahpsDashboard } from '@/pages/Hospice/HospiceCahpsDashboard';
import type {
  CahpsComplianceSummary,
  HospiceCahpsCase,
} from '@/api/hospice';

vi.mock('@/api/hospice', () => ({
  listCahpsCases: vi.fn(),
  getCahpsCompliance: vi.fn(),
  submitCahpsCase: vi.fn(),
  excludeCahpsCase: vi.fn(),
  updateCahpsCaregiver: vi.fn(),
}));

import {
  excludeCahpsCase,
  getCahpsCompliance,
  listCahpsCases,
  submitCahpsCase,
  updateCahpsCaregiver,
} from '@/api/hospice';

function eligibleCase(over: Partial<HospiceCahpsCase> = {}): HospiceCahpsCase {
  return {
    id: 1,
    patientId: 100,
    hospiceElectionId: 5,
    dateOfDeath: '2026-05-10',
    admittedAt: '2026-03-01',
    daysOnHospice: 70,
    ageAtDeath: 75,
    status: 'Eligible',
    ineligibleReason: null,
    exclusionReason: null,
    caregiverName: null,
    caregiverAddress: null,
    caregiverPhone: null,
    caregiverIsFamilial: null,
    submittedToVendorAt: null,
    vendorName: null,
    vendorConfirmation: null,
    notes: null,
    createdAt: '2026-05-11T00:00:00Z',
    ...over,
  };
}

function summary(over: Partial<CahpsComplianceSummary> = {}): CahpsComplianceSummary {
  return {
    calendarYear: 2026,
    quarter: 2,
    quarterFrom: '2026-04-01',
    quarterTo: '2026-06-30',
    totalDecedents: 1,
    eligibleCount: 1,
    ineligibleCount: 0,
    excludedCount: 0,
    submittedCount: 0,
    pendingCount: 0,
    notYetSubmittedCount: 1,
    submissionRatePercentage: 0,
    ...over,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <HospiceCahpsDashboard />
    </MemoryRouter>,
  );
}

describe('HospiceCahpsDashboard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders compliance summary metrics', async () => {
    vi.mocked(listCahpsCases).mockResolvedValue({ data: [eligibleCase()] });
    vi.mocked(getCahpsCompliance).mockResolvedValue(summary());

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Submission Rate/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Total Decedents/i)).toBeInTheDocument();
    expect(
      screen.getByText(/1 eligible case still need vendor submission/i),
    ).toBeInTheDocument();
  });

  it('shows status badge for each case', async () => {
    vi.mocked(listCahpsCases).mockResolvedValue({
      data: [
        eligibleCase({ id: 1, status: 'Eligible' }),
        eligibleCase({ id: 2, status: 'SubmittedToVendor', vendorName: 'V' }),
        eligibleCase({
          id: 3,
          status: 'Ineligible',
          ineligibleReason: 'Age below 18',
        }),
      ],
    });
    vi.mocked(getCahpsCompliance).mockResolvedValue(
      summary({ totalDecedents: 3, eligibleCount: 2, submittedCount: 1, ineligibleCount: 1, notYetSubmittedCount: 1 }),
    );

    renderPage();

    // 'Eligible' appears in both metric card and badge — scope to table cell
    await waitFor(() => {
      const table = screen.getByRole('table');
      expect(table.textContent).toContain('Eligible');
      expect(table.textContent).toContain('SubmittedToVendor');
      expect(table.textContent).toContain('Ineligible');
    });
  });

  it('submits an eligible case to vendor', async () => {
    const user = userEvent.setup();
    vi.mocked(listCahpsCases).mockResolvedValue({ data: [eligibleCase()] });
    vi.mocked(getCahpsCompliance).mockResolvedValue(summary());
    vi.mocked(submitCahpsCase).mockResolvedValue(
      eligibleCase({ status: 'SubmittedToVendor', vendorName: 'Acme' }),
    );

    const promptSpy = vi
      .spyOn(window, 'prompt')
      .mockReturnValueOnce('Acme')      // vendor name
      .mockReturnValueOnce('CONF-1');   // confirmation

    renderPage();
    const submitBtn = await screen.findByRole('button', { name: 'Submit' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(submitCahpsCase).toHaveBeenCalledWith(1, {
        vendorName: 'Acme',
        vendorConfirmation: 'CONF-1',
        submittedAt: null,
      });
    });
    promptSpy.mockRestore();
  });

  it('excludes a case with reason', async () => {
    const user = userEvent.setup();
    vi.mocked(listCahpsCases).mockResolvedValue({ data: [eligibleCase()] });
    vi.mocked(getCahpsCompliance).mockResolvedValue(summary());
    vi.mocked(excludeCahpsCase).mockResolvedValue(
      eligibleCase({ status: 'Excluded', exclusionReason: 'declined' }),
    );

    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('declined');

    renderPage();
    const excludeBtn = await screen.findByRole('button', { name: 'Exclude' });
    await user.click(excludeBtn);

    await waitFor(() => {
      expect(excludeCahpsCase).toHaveBeenCalledWith(1, { reason: 'declined' });
    });
    promptSpy.mockRestore();
  });

  it('opens detail panel and saves caregiver', async () => {
    const user = userEvent.setup();
    vi.mocked(listCahpsCases).mockResolvedValue({ data: [eligibleCase()] });
    vi.mocked(getCahpsCompliance).mockResolvedValue(summary());
    vi.mocked(updateCahpsCaregiver).mockResolvedValue(
      eligibleCase({ caregiverName: 'Jane', caregiverIsFamilial: true }),
    );

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Details' }));
    await user.type(screen.getByPlaceholderText('Name'), 'Jane');
    await user.click(screen.getByRole('button', { name: /Save Caregiver/i }));

    await waitFor(() => {
      expect(updateCahpsCaregiver).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ caregiverName: 'Jane' }),
      );
    });
  });

  it('hides Submit button for non-eligible cases', async () => {
    vi.mocked(listCahpsCases).mockResolvedValue({
      data: [eligibleCase({ status: 'Ineligible', ineligibleReason: 'short stay' })],
    });
    vi.mocked(getCahpsCompliance).mockResolvedValue(summary({ ineligibleCount: 1, eligibleCount: 0, notYetSubmittedCount: 0 }));

    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('table').textContent).toContain('Ineligible');
    });
    expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument();
  });
});

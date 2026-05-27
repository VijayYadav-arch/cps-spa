import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HospiceDischargeWizard } from '@/pages/Hospice/HospiceDischargeWizard';
import * as hospiceApi from '@/api/hospice';

vi.mock('@/api/hospice');

function renderWizard(electionId = '42') {
  return render(
    <MemoryRouter initialEntries={[`/hospice/elections/${electionId}/discharge/new`]}>
      <Routes>
        <Route path="/hospice/elections/:electionId/discharge/new" element={<HospiceDischargeWizard />} />
        <Route path="/hospice/discharges/:dischargeId" element={<div>Detail page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('HospiceDischargeWizard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Step 1 reason selector renders 5 options', () => {
    renderWizard();
    expect(screen.getByLabelText(/transfer to another hospice/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/out of service area/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/no longer terminal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/for cause/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/agency closure/i)).toBeInTheDocument();
  });

  it('Step 2 shows Transfer-specific field when reason=Transfer', async () => {
    const user = userEvent.setup();
    renderWizard();
    await user.click(screen.getByLabelText(/transfer to another hospice/i));
    await user.type(screen.getByLabelText(/effective date/i), '2026-02-01');
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByLabelText(/receiving agency/i)).toBeInTheDocument();
  });

  it('Step 2 shows for-cause fields when reason=ForCause', async () => {
    const user = userEvent.setup();
    renderWizard();
    await user.click(screen.getByLabelText(/for cause/i));
    await user.type(screen.getByLabelText(/effective date/i), '2026-02-01');
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByLabelText(/advance notice date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/idg approval/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/alternative arrangements/i)).toBeInTheDocument();
  });

  it('Step 3 submit calls createDischarge with payload', async () => {
    const user = userEvent.setup();
    vi.mocked(hospiceApi.createDischarge).mockResolvedValueOnce({ id: 99 } as any);
    renderWizard();
    await user.click(screen.getByLabelText(/transfer to another hospice/i));
    await user.type(screen.getByLabelText(/effective date/i), '2026-02-01');
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.type(screen.getByLabelText(/receiving agency/i), 'Sunrise');
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() => {
      expect(hospiceApi.createDischarge).toHaveBeenCalledWith(42, expect.objectContaining({
        reason: 'Transfer',
        effectiveDate: '2026-02-01',
        receivingAgencyName: 'Sunrise',
      }));
    });
  });

  it('409 INVALID_STATE renders full-page error with Return to Election link', async () => {
    const user = userEvent.setup();
    vi.mocked(hospiceApi.createDischarge).mockRejectedValueOnce({
      response: { status: 409, data: { code: 'INVALID_STATE', currentStatus: 'Discharged', userMessage: 'Already terminal.' } },
    });
    renderWizard();
    await user.click(screen.getByLabelText(/transfer to another hospice/i));
    await user.type(screen.getByLabelText(/effective date/i), '2026-02-01');
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.type(screen.getByLabelText(/receiving agency/i), 'Sunrise');
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() => {
      expect(screen.getByText(/already terminal/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /return to election/i })).toBeInTheDocument();
    });
  });

  it('Next button disabled until reason + date filled (Step 1)', () => {
    renderWizard();
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });
});

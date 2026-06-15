import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ArTicklerPage } from '@/pages/Billing/ArTicklerPage';
import type { ArTicklerRow } from '@/api/billing';

vi.mock('@/api/billing', () => ({
  getArTicklers: vi.fn(),
  bulkLogArCalls: vi.fn(),
}));

import { getArTicklers, bulkLogArCalls } from '@/api/billing';

// Mock the /me query seam so usePermission resolves synchronously without a
// QueryClientProvider. Real usePermission logic still runs against this data.
vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

const ALL_PERMS = ['billing:ar-followup'];
function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue({ data: { permissions } } as unknown as ReturnType<typeof useUserRoles>);
}

beforeEach(() => {
  vi.clearAllMocks();
  setPermissions(ALL_PERMS);
});

function row(over: Partial<ArTicklerRow> = {}): ArTicklerRow {
  return {
    claimId: 1,
    claimNumber: 'CLM-001',
    patientName: 'Doe',
    payer: 'Medicare',
    amount: 1200,
    submittedDate: '2026-04-01T00:00:00Z',
    daysAged: 45,
    nextFollowUpDate: '2026-05-15T00:00:00Z',
    daysUntilFollowUp: -3,
    lastContactedAt: '2026-05-10T00:00:00Z',
    ...over,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ArTicklerPage />
    </MemoryRouter>,
  );
}

describe('ArTicklerPage', () => {
  it('loads overdue ticklers on first render', async () => {
    vi.mocked(getArTicklers).mockResolvedValue({
      data: [row(), row({ claimId: 2, claimNumber: 'CLM-002', daysUntilFollowUp: -10 })],
    });
    renderPage();

    expect(await screen.findByText('CLM-001')).toBeInTheDocument();
    expect(screen.getByText('CLM-002')).toBeInTheDocument();
    expect(getArTicklers).toHaveBeenCalledWith('overdue', 100);
  });

  it('switches tabs and re-fetches', async () => {
    const user = userEvent.setup();
    vi.mocked(getArTicklers).mockResolvedValue({ data: [] });
    renderPage();
    await waitFor(() => expect(getArTicklers).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: /Upcoming/i }));
    await waitFor(() =>
      expect(getArTicklers).toHaveBeenLastCalledWith('upcoming', 100),
    );
  });

  it('select-all checkbox toggles all rows', async () => {
    const user = userEvent.setup();
    vi.mocked(getArTicklers).mockResolvedValue({
      data: [row(), row({ claimId: 2, claimNumber: 'CLM-002' })],
    });
    renderPage();
    await screen.findByText('CLM-001');

    await user.click(screen.getByLabelText(/Select all rows/i));
    // Bulk button should reflect selection count
    expect(screen.getByRole('button', { name: /Bulk log call \(2\)/i })).toBeEnabled();

    await user.click(screen.getByLabelText(/Select all rows/i));
    expect(screen.getByRole('button', { name: /Bulk log call \(0\)/i })).toBeDisabled();
  });

  it('opens the bulk modal and posts the selected claims', async () => {
    const user = userEvent.setup();
    vi.mocked(getArTicklers).mockResolvedValue({
      data: [row(), row({ claimId: 2, claimNumber: 'CLM-002' })],
    });
    vi.mocked(bulkLogArCalls).mockResolvedValue({
      data: [
        { claimId: 1, ok: true, noteId: 11, error: null },
        { claimId: 2, ok: true, noteId: 12, error: null },
      ],
      summary: { requested: 2, applied: 2, failed: 0 },
    });

    renderPage();
    await screen.findByText('CLM-001');

    await user.click(screen.getByLabelText(/Select claim CLM-001/i));
    await user.click(screen.getByLabelText(/Select claim CLM-002/i));
    await user.click(screen.getByRole('button', { name: /Bulk log call \(2\)/i }));

    await user.type(screen.getByLabelText(/Contact name/i), 'Payer Rep');
    await user.type(screen.getByLabelText(/Note/i), 'Promised by Friday');
    await user.click(screen.getByRole('button', { name: /Apply to 2/i }));

    await waitFor(() => {
      expect(bulkLogArCalls).toHaveBeenCalledWith(
        expect.objectContaining({
          claimIds: [1, 2],
          contactName: 'Payer Rep',
          outcome: 'promised-payment',
          note: 'Promised by Friday',
        }),
      );
    });
    // Success banner appears
    expect(await screen.findByText(/Logged 2\/2/)).toBeInTheDocument();
  });

  it('shows partial-success summary when some claims fail', async () => {
    const user = userEvent.setup();
    vi.mocked(getArTicklers).mockResolvedValue({ data: [row()] });
    vi.mocked(bulkLogArCalls).mockResolvedValue({
      data: [{ claimId: 1, ok: false, noteId: null, error: 'not-found' }],
      summary: { requested: 1, applied: 0, failed: 1 },
    });

    renderPage();
    await screen.findByText('CLM-001');
    await user.click(screen.getByLabelText(/Select claim CLM-001/i));
    await user.click(screen.getByRole('button', { name: /Bulk log call \(1\)/i }));
    await user.click(screen.getByRole('button', { name: /Apply to 1/i }));

    expect(await screen.findByText(/Logged 0\/1.*1 failed/)).toBeInTheDocument();
  });

  it('shows empty state when no rows', async () => {
    vi.mocked(getArTicklers).mockResolvedValue({ data: [] });
    renderPage();
    expect(await screen.findByText(/No claims match this view/i)).toBeInTheDocument();
  });

  it('shows error banner when load fails', async () => {
    vi.mocked(getArTicklers).mockRejectedValueOnce(new Error('boom'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(/Failed to load/i);
  });

  describe('permission gating', () => {
    it('disables Bulk log call with a permission tooltip when the user lacks billing:ar-followup', async () => {
      setPermissions([]); // no billing:ar-followup
      const user = userEvent.setup();
      vi.mocked(getArTicklers).mockResolvedValue({ data: [row()] });
      renderPage();
      await screen.findByText('CLM-001');
      // Select a row so the disabled state isn't just the empty-selection guard
      await user.click(screen.getByLabelText(/Select claim CLM-001/i));

      const btn = screen.getByRole('button', { name: /Bulk log call \(1\)/i });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
    });

    it('enables Bulk log call when the user has billing:ar-followup and rows are selected', async () => {
      setPermissions(['billing:ar-followup']);
      const user = userEvent.setup();
      vi.mocked(getArTicklers).mockResolvedValue({ data: [row()] });
      renderPage();
      await screen.findByText('CLM-001');
      await user.click(screen.getByLabelText(/Select claim CLM-001/i));

      expect(screen.getByRole('button', { name: /Bulk log call \(1\)/i })).toBeEnabled();
    });

    it('enables the modal Apply button when the user has billing:ar-followup', async () => {
      setPermissions(['billing:ar-followup']);
      const user = userEvent.setup();
      vi.mocked(getArTicklers).mockResolvedValue({ data: [row()] });
      renderPage();
      await screen.findByText('CLM-001');
      await user.click(screen.getByLabelText(/Select claim CLM-001/i));
      await user.click(screen.getByRole('button', { name: /Bulk log call \(1\)/i }));

      expect(screen.getByRole('button', { name: /Apply to 1/i })).toBeEnabled();
    });
  });
});

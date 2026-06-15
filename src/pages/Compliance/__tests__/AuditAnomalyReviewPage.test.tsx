import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditAnomalyReviewPage } from '@/pages/Compliance/AuditAnomalyReviewPage';
import type { AnomalyType, AnomalyStatus } from '@/api/compliance';

vi.mock('@/api/compliance', async (orig) => ({
  ...(await orig<object>()),
  listAnomalies: vi.fn(),
  updateAnomalyStatus: vi.fn(),
  scanAnomaliesNow: vi.fn(),
  narrateAnomaliesNow: vi.fn(),
}));

import {
  listAnomalies,
  updateAnomalyStatus,
  scanAnomaliesNow,
  narrateAnomaliesNow,
} from '@/api/compliance';

// Mock the /me query seam so usePermission resolves synchronously without a
// QueryClientProvider. Real usePermission logic still runs against this data.
vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

const ALL_PERMS = ['compliance:phi_review'];
function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue({ data: { permissions } } as unknown as ReturnType<typeof useUserRoles>);
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: user holds compliance:phi_review so existing behaviour tests
  // see enabled action buttons. Gating tests override.
  setPermissions(ALL_PERMS);
});

function alert(over: Partial<{
  id: number; status: AnomalyStatus; anomalyType: AnomalyType;
  userEmail: string | null; evidence: string;
  narrativeText: string | null; narrativeGeneratedAtUtc: string | null;
}> = {}) {
  return {
    id: 1, organizationId: 1,
    userId: 5, userEmail: 'biller@x', ipAddress: null,
    anomalyType: 'bulk-read' as const,
    detectedAtUtc: '2026-05-20T10:30:00Z',
    windowStartUtc: '2026-05-20T10:00:00Z',
    windowEndUtc: '2026-05-20T11:00:00Z',
    evidence: '52 distinct patients accessed in 1 hour',
    status: 'open' as const,
    reviewedByUserId: null, reviewedAtUtc: null, notes: null,
    narrativeText: null as string | null,
    narrativeGeneratedAtUtc: null as string | null,
    ...over,
  };
}

describe('AuditAnomalyReviewPage', () => {
  it('loads open anomalies on first render', async () => {
    vi.mocked(listAnomalies).mockResolvedValue({
      data: [alert(), alert({ id: 2, anomalyType: 'off-hours', evidence: '14 events overnight' })],
      total: 2,
    });

    render(<AuditAnomalyReviewPage />);

    expect(await screen.findByText(/52 distinct patients/)).toBeInTheDocument();
    expect(screen.getByText(/14 events overnight/)).toBeInTheDocument();
    expect(listAnomalies).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'open' }),
    );
  });

  it('switches filter and re-fetches', async () => {
    const user = userEvent.setup();
    vi.mocked(listAnomalies).mockResolvedValue({ data: [], total: 0 });
    render(<AuditAnomalyReviewPage />);
    await waitFor(() => expect(listAnomalies).toHaveBeenCalledTimes(1));

    await user.selectOptions(
      screen.getByLabelText(/Filter by status/i), 'dismissed',
    );
    await waitFor(() => {
      expect(listAnomalies).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'dismissed' }),
      );
    });
  });

  it('dismisses an alert via the action modal', async () => {
    const user = userEvent.setup();
    vi.mocked(listAnomalies).mockResolvedValue({ data: [alert()], total: 1 });
    vi.mocked(updateAnomalyStatus).mockResolvedValue({ data: alert({ status: 'dismissed' }) });

    render(<AuditAnomalyReviewPage />);
    await screen.findByText(/52 distinct patients/);

    await user.click(screen.getByRole('button', { name: /Dismiss/i }));
    await user.type(screen.getByLabelText(/Notes/i), 'spot check, normal');
    await user.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(updateAnomalyStatus).toHaveBeenCalledWith(1, 'dismissed', 'spot check, normal');
    });
  });

  it('escalates an alert', async () => {
    const user = userEvent.setup();
    vi.mocked(listAnomalies).mockResolvedValue({ data: [alert()], total: 1 });
    vi.mocked(updateAnomalyStatus).mockResolvedValue({ data: alert({ status: 'escalated' }) });

    render(<AuditAnomalyReviewPage />);
    await screen.findByText(/52 distinct patients/);

    await user.click(screen.getByRole('button', { name: /Escalate/i }));
    await user.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => {
      expect(updateAnomalyStatus).toHaveBeenCalledWith(1, 'escalated', null);
    });
  });

  it('runs an on-demand scan', async () => {
    const user = userEvent.setup();
    vi.mocked(listAnomalies).mockResolvedValue({ data: [], total: 0 });
    vi.mocked(scanAnomaliesNow).mockResolvedValue({ data: { inserted: 3 } });

    render(<AuditAnomalyReviewPage />);
    await waitFor(() => expect(listAnomalies).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: /Scan now/i }));
    expect(await screen.findByText(/3 new alert/i)).toBeInTheDocument();
  });

  it('shows API error when load fails', async () => {
    vi.mocked(listAnomalies).mockRejectedValueOnce({
      response: { data: { error: 'forbidden' } },
    });
    render(<AuditAnomalyReviewPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('forbidden');
  });

  it('expands the AI narrative when the toggle is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(listAnomalies).mockResolvedValue({
      data: [alert({
        narrativeText: 'A user reviewed 52 patient records in one hour. Investigate after-hours patterns.',
        narrativeGeneratedAtUtc: '2026-05-20T10:35:00Z',
      })],
      total: 1,
    });

    render(<AuditAnomalyReviewPage />);
    await screen.findByText(/52 distinct patients/);

    // Narrative starts collapsed
    expect(screen.queryByText(/A user reviewed 52/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /show narrative for alert 1/i }));
    expect(await screen.findByText(/A user reviewed 52/)).toBeInTheDocument();

    // Click again to collapse
    await user.click(screen.getByRole('button', { name: /hide narrative for alert 1/i }));
    expect(screen.queryByText(/A user reviewed 52/)).not.toBeInTheDocument();
  });

  it('does not render the AI toggle when narrativeText is null', async () => {
    vi.mocked(listAnomalies).mockResolvedValue({
      data: [alert({ narrativeText: null })],
      total: 1,
    });
    render(<AuditAnomalyReviewPage />);
    await screen.findByText(/52 distinct patients/);
    expect(screen.queryByRole('button', { name: /show narrative/i })).not.toBeInTheDocument();
  });

  it('triggers the narrate-now endpoint and reports the count', async () => {
    const user = userEvent.setup();
    vi.mocked(listAnomalies).mockResolvedValue({ data: [], total: 0 });
    vi.mocked(narrateAnomaliesNow).mockResolvedValue({ data: { written: 4 } });

    render(<AuditAnomalyReviewPage />);
    await waitFor(() => expect(listAnomalies).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: /generate narratives/i }));
    expect(await screen.findByText(/Generated narratives for 4 alert/i)).toBeInTheDocument();
  });

  describe('permission gating', () => {
    it('disables Scan now and Generate narratives with a tooltip when the user lacks compliance:phi_review', async () => {
      setPermissions([]); // no compliance:phi_review
      vi.mocked(listAnomalies).mockResolvedValue({ data: [], total: 0 });
      render(<AuditAnomalyReviewPage />);
      await waitFor(() => expect(listAnomalies).toHaveBeenCalled());

      const scan = screen.getByRole('button', { name: /Scan now/i });
      const narrate = screen.getByRole('button', { name: /Generate narratives/i });
      expect(scan).toBeDisabled();
      expect(scan).toHaveAttribute('title', expect.stringMatching(/permission/i));
      expect(narrate).toBeDisabled();
    });

    it('disables Dismiss and Escalate row actions when the user lacks compliance:phi_review', async () => {
      setPermissions([]); // no compliance:phi_review
      vi.mocked(listAnomalies).mockResolvedValue({ data: [alert()], total: 1 });
      render(<AuditAnomalyReviewPage />);
      await screen.findByText(/52 distinct patients/);

      expect(screen.getByRole('button', { name: /Dismiss/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Escalate/i })).toBeDisabled();
    });

    it('enables action buttons when the user has compliance:phi_review', async () => {
      setPermissions(['compliance:phi_review']);
      vi.mocked(listAnomalies).mockResolvedValue({ data: [alert()], total: 1 });
      render(<AuditAnomalyReviewPage />);
      await screen.findByText(/52 distinct patients/);

      expect(screen.getByRole('button', { name: /Scan now/i })).toBeEnabled();
      expect(screen.getByRole('button', { name: /Dismiss/i })).toBeEnabled();
    });
  });
});

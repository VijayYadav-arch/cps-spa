import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditLogSearchPage } from '@/pages/Admin/AuditLogSearchPage';

vi.mock('@/api/platform', () => ({
  getAuditEvents: vi.fn(),
  auditExportUrl: vi.fn(() => '/api/v2/audit/export?mock=1'),
}));

import { getAuditEvents, auditExportUrl } from '@/api/platform';

// Mock the /me query seam so usePermission resolves synchronously without a
// QueryClientProvider. Real usePermission logic still runs against this data.
vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue({ data: { permissions } } as unknown as ReturnType<typeof useUserRoles>);
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: user holds the audit-log permission so existing behaviour tests
  // see an enabled export button. Permission-gating tests override.
  setPermissions(['admin:audit_logs']);
});

function evt(over: Partial<{ id: number; description: string; result: string; eventType: string }> = {}) {
  return {
    id: 1, eventType: 'phi-access', description: 'Read patient #99',
    userId: 5, userEmail: 'biller@x',
    resourceType: 'Patient', resourceId: 99, patientId: 99,
    organizationId: 1, result: 'success', ipAddress: '10.0.0.1',
    createdAt: '2026-05-20T10:00:00Z',
    ...over,
  };
}

function pagination(total: number, page = 1, pageSize = 50) {
  return { total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

describe('AuditLogSearchPage', () => {
  it('loads the audit events on first render with no filters', async () => {
    vi.mocked(getAuditEvents).mockResolvedValue({
      data: [evt(), evt({ id: 2, result: 'denied', description: 'Denied access' })],
      pagination: pagination(2),
    });

    render(<AuditLogSearchPage />);

    expect(await screen.findByText('Read patient #99')).toBeInTheDocument();
    expect(screen.getByText('Denied access')).toBeInTheDocument();
    // Initial call sent only the page + pageSize params (everything else empty)
    expect(getAuditEvents).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 50 }),
    );
  });

  it('submits the filter form and re-fetches with new params', async () => {
    const user = userEvent.setup();
    vi.mocked(getAuditEvents).mockResolvedValue({
      data: [], pagination: pagination(0),
    });

    render(<AuditLogSearchPage />);
    await waitFor(() => expect(getAuditEvents).toHaveBeenCalledTimes(1));

    await user.type(screen.getByLabelText(/User email contains/i), 'alice');
    await user.selectOptions(screen.getByLabelText(/Result/i), 'denied');
    await user.click(screen.getByRole('button', { name: /^Search$/ }));

    await waitFor(() => {
      expect(getAuditEvents).toHaveBeenLastCalledWith(expect.objectContaining({
        userEmail: 'alice',
        result: 'denied',
        page: 1,
      }));
    });
  });

  it('paginates next/prev', async () => {
    const user = userEvent.setup();
    vi.mocked(getAuditEvents).mockResolvedValue({
      data: [evt()],
      pagination: pagination(120, 1, 50),  // 3 pages
    });

    render(<AuditLogSearchPage />);
    await screen.findByText('Read patient #99');

    await user.click(screen.getByRole('button', { name: /Next/i }));
    await waitFor(() => {
      expect(getAuditEvents).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
    });
  });

  it('opens the export URL on Download CSV', async () => {
    const user = userEvent.setup();
    vi.mocked(getAuditEvents).mockResolvedValue({
      data: [evt()], pagination: pagination(1),
    });
    // Don't actually navigate in the test
    const original = window.location.href;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, href: original },
    });

    render(<AuditLogSearchPage />);
    await screen.findByText('Read patient #99');

    await user.click(screen.getByRole('button', { name: /Download CSV/i }));
    expect(auditExportUrl).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 50 }),
    );
  });

  it('shows the API error when the load fails', async () => {
    vi.mocked(getAuditEvents).mockRejectedValueOnce({
      response: { data: { error: 'forbidden' } },
    });
    render(<AuditLogSearchPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('forbidden');
  });

  it('clears the filters and re-fetches', async () => {
    const user = userEvent.setup();
    vi.mocked(getAuditEvents).mockResolvedValue({
      data: [], pagination: pagination(0),
    });
    render(<AuditLogSearchPage />);
    await waitFor(() => expect(getAuditEvents).toHaveBeenCalledTimes(1));

    await user.type(screen.getByLabelText(/Description contains/i), 'surveyor');
    await user.click(screen.getByRole('button', { name: /^Search$/ }));
    await waitFor(() => {
      expect(getAuditEvents).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'surveyor' }));
    });

    await user.click(screen.getByRole('button', { name: /^Clear$/ }));
    await waitFor(() => {
      const calls = vi.mocked(getAuditEvents).mock.calls;
      const last = calls[calls.length - 1][0];
      expect(last).not.toHaveProperty('q');
    });
  });

  describe('permission gating', () => {
    it('disables Download CSV with a tooltip when the user lacks admin:audit_logs', async () => {
      setPermissions([]); // no admin:audit_logs
      vi.mocked(getAuditEvents).mockResolvedValue({
        data: [evt()], pagination: pagination(1),
      });
      render(<AuditLogSearchPage />);
      await screen.findByText('Read patient #99');

      const btn = screen.getByRole('button', { name: /Download CSV/i });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
    });

    it('enables Download CSV when the user has admin:audit_logs', async () => {
      setPermissions(['admin:audit_logs']);
      vi.mocked(getAuditEvents).mockResolvedValue({
        data: [evt()], pagination: pagination(1),
      });
      render(<AuditLogSearchPage />);
      await screen.findByText('Read patient #99');

      expect(screen.getByRole('button', { name: /Download CSV/i })).toBeEnabled();
    });
  });
});

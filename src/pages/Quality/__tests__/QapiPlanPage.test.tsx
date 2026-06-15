import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QapiPlanPage } from '@/pages/Quality/QapiPlanPage';
import * as qapiApi from '@/api/qapi';

vi.mock('@/api/qapi');

// Mock the /me query seam so usePermission resolves synchronously without a
// QueryClientProvider. Real usePermission logic still runs against this data.
vi.mock('@/permissions/useUserRoles', () => ({ useUserRoles: vi.fn() }));
import { useUserRoles } from '@/permissions/useUserRoles';

function setPermissions(permissions: string[]) {
  vi.mocked(useUserRoles).mockReturnValue({ data: { permissions } } as unknown as ReturnType<typeof useUserRoles>);
}

function makePlan(overrides: Partial<qapiApi.HospiceQapiPlan> = {}): qapiApi.HospiceQapiPlan {
  return {
    id: 1,
    organizationId: 1,
    title: 'Annual QAPI Plan',
    bodyMarkdown: '## Goals\n- Reduce falls',
    version: 3,
    effectiveDate: '2026-01-01',
    status: 'Approved',
    approvedByUserId: 10,
    approvedAt: '2025-12-15T00:00:00Z',
    createdAt: '2025-11-01T00:00:00Z',
    updatedAt: '2025-12-15T00:00:00Z',
    ...overrides,
  };
}

describe('QapiPlanPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: user holds plan-manage so existing behaviour tests see enabled buttons.
    setPermissions(['hospice:qapi_plan_view', 'hospice:qapi_plan_manage']);
  });

  it('renders the active plan title and version', async () => {
    vi.mocked(qapiApi.getActivePlan).mockResolvedValueOnce(makePlan());
    vi.mocked(qapiApi.listPlanVersions).mockResolvedValueOnce([makePlan()]);

    render(<MemoryRouter><QapiPlanPage /></MemoryRouter>);

    await waitFor(() =>
      expect(screen.getByText(/Annual QAPI Plan \(v3\)/i)).toBeInTheDocument(),
    );
    expect(screen.getByText('2026-01-01')).toBeInTheDocument();
  });

  it('renders empty state when there is no active plan', async () => {
    vi.mocked(qapiApi.getActivePlan).mockResolvedValueOnce(null);
    vi.mocked(qapiApi.listPlanVersions).mockResolvedValueOnce([]);

    render(<MemoryRouter><QapiPlanPage /></MemoryRouter>);

    await waitFor(() =>
      expect(screen.getByText(/No active plan\./i)).toBeInTheDocument(),
    );
  });

  describe('permission gating', () => {
    it('disables Approve with a permission tooltip when the user lacks plan-manage', async () => {
      setPermissions(['hospice:qapi_plan_view']); // no manage
      vi.mocked(qapiApi.getActivePlan).mockResolvedValueOnce(null);
      vi.mocked(qapiApi.listPlanVersions).mockResolvedValueOnce([makePlan({ status: 'Draft' })]);

      render(<MemoryRouter><QapiPlanPage /></MemoryRouter>);

      const btn = await screen.findByRole('button', { name: /Approve/i });
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('title', expect.stringMatching(/permission/i));
    });

    it('enables Approve when the user has plan-manage', async () => {
      setPermissions(['hospice:qapi_plan_view', 'hospice:qapi_plan_manage']);
      vi.mocked(qapiApi.getActivePlan).mockResolvedValueOnce(null);
      vi.mocked(qapiApi.listPlanVersions).mockResolvedValueOnce([makePlan({ status: 'Draft' })]);

      render(<MemoryRouter><QapiPlanPage /></MemoryRouter>);

      expect(await screen.findByRole('button', { name: /Approve/i })).toBeEnabled();
    });
  });
});

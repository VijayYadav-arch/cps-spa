import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QapiPlanPage } from '@/pages/Quality/QapiPlanPage';
import * as qapiApi from '@/api/qapi';

vi.mock('@/api/qapi');

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
  beforeEach(() => vi.clearAllMocks());

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
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('admin API', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('getOrgRollup() GETs /org/rollup', async () => {
    const { apiClient } = await import('@/api/client');
    const { getOrgRollup } = await import('@/api/admin');
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        parentOrganizationId: 100,
        parentName: 'Acme',
        childOrgCount: 0,
        totalPatientCount: 0,
        totalActiveElectionCount: 0,
        totalOpenClaimCount: 0,
        totalOpenBreachCount: 0,
        totalClaimAmountSubmitted: 0,
        children: [],
      },
    });
    await getOrgRollup();
    expect(apiClient.get).toHaveBeenCalledWith('/org/rollup');
  });
});

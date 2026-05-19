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

  // ─── Branches ─────────────────────────────────────────────────────────

  it('listBranches() GETs /branches with activeOnly param', async () => {
    const { apiClient } = await import('@/api/client');
    const { listBranches } = await import('@/api/admin');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: [] } });
    await listBranches(true);
    expect(apiClient.get).toHaveBeenCalledWith('/branches', {
      params: { activeOnly: true },
    });
  });

  it('createBranch() POSTs to /branches', async () => {
    const { apiClient } = await import('@/api/client');
    const { createBranch } = await import('@/api/admin');
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1 } });
    await createBranch({
      name: 'Tampa', code: 'TPA',
      ccnNumber: null, addressLine1: null, addressLine2: null,
      city: null, state: null, zipCode: null, phone: null,
    });
    expect(apiClient.post).toHaveBeenCalledWith('/branches', expect.objectContaining({
      name: 'Tampa',
      code: 'TPA',
    }));
  });

  it('updateBranch() PUTs to /branches/{id}', async () => {
    const { apiClient } = await import('@/api/client');
    const { updateBranch } = await import('@/api/admin');
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { id: 7 } });
    await updateBranch(7, {
      name: 'Tampa Bay',
      ccnNumber: null, addressLine1: null, addressLine2: null,
      city: null, state: null, zipCode: null, phone: null,
      isActive: true,
    });
    expect(apiClient.put).toHaveBeenCalledWith('/branches/7', expect.objectContaining({
      name: 'Tampa Bay',
      isActive: true,
    }));
  });

  it('deleteBranch() DELETEs /branches/{id}', async () => {
    const { apiClient } = await import('@/api/client');
    const { deleteBranch } = await import('@/api/admin');
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: undefined });
    await deleteBranch(7);
    expect(apiClient.delete).toHaveBeenCalledWith('/branches/7');
  });
});

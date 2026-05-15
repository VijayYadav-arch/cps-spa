import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/client', () => ({
  apiClient: { get: vi.fn() },
}));

describe('billing API', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('getWorkQueue() calls GET /billing/work-queue', async () => {
    const { apiClient } = await import('@/api/client');
    const { getWorkQueue } = await import('@/api/billing');
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { data: [], stats: { total: 0, pending: 0, inProgress: 0, completed: 0 } },
    });
    await getWorkQueue();
    expect(apiClient.get).toHaveBeenCalledWith('/billing/work-queue', { params: undefined });
  });

  it('getDenials() calls GET /billing/denials with status filter', async () => {
    const { apiClient } = await import('@/api/client');
    const { getDenials } = await import('@/api/billing');
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { data: [], pagination: { total: 0, page: 1, pageSize: 20 } },
    });
    await getDenials({ status: 'open', page: 1 });
    expect(apiClient.get).toHaveBeenCalledWith('/billing/denials', {
      params: { status: 'open', page: 1 },
    });
  });
});

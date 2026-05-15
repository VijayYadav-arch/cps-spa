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
    const mockBody = { data: [], stats: { total: 0, pending: 0, inProgress: 0, completed: 0 } };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockBody });
    const result = await getWorkQueue();
    expect(apiClient.get).toHaveBeenCalledWith('/billing/work-queue', { params: undefined });
    expect(result).toEqual(mockBody);
  });

  it('getDenials() calls GET /billing/denials with status filter', async () => {
    const { apiClient } = await import('@/api/client');
    const { getDenials } = await import('@/api/billing');
    const mockBody = { data: [], pagination: { total: 0, page: 1, pageSize: 20 } };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockBody });
    const result = await getDenials({ status: 'open', page: 1 });
    expect(apiClient.get).toHaveBeenCalledWith('/billing/denials', {
      params: { status: 'open', page: 1 },
    });
    expect(result).toEqual(mockBody);
  });
});

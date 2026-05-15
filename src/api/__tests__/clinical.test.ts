import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/client', () => ({
  apiClient: { get: vi.fn() },
}));

describe('clinical API', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('getCarePlans() calls GET /clinical/care-plans', async () => {
    const { apiClient } = await import('@/api/client');
    const { getCarePlans } = await import('@/api/clinical');
    const mockBody = { data: [], pagination: { total: 0, page: 1, pageSize: 20 } };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockBody });
    const result = await getCarePlans({ patientId: 5 });
    expect(apiClient.get).toHaveBeenCalledWith('/clinical/care-plans', { params: { patientId: 5 } });
    expect(result).toEqual(mockBody);
  });

  it('getPriorAuths() calls GET /clinical/prior-auth', async () => {
    const { apiClient } = await import('@/api/client');
    const { getPriorAuths } = await import('@/api/clinical');
    const mockBody = { data: [], pagination: { total: 0, page: 1, pageSize: 20 } };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockBody });
    const result = await getPriorAuths({ status: 'pending' });
    expect(apiClient.get).toHaveBeenCalledWith('/clinical/prior-auth', { params: { status: 'pending' } });
    expect(result).toEqual(mockBody);
  });
});

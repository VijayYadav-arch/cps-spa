import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/client', () => ({
  apiClient: { get: vi.fn(), delete: vi.fn() },
}));

describe('platform API', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('getApiKeys() calls GET /api-keys', async () => {
    const { apiClient } = await import('@/api/client');
    const { getApiKeys } = await import('@/api/platform');
    const mockBody = { data: [], pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 } };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockBody });
    const result = await getApiKeys();
    expect(apiClient.get).toHaveBeenCalledWith('/api-keys', { params: undefined });
    expect(result).toEqual(mockBody);
  });

  it('getWebhooks() calls GET /webhooks', async () => {
    const { apiClient } = await import('@/api/client');
    const { getWebhooks } = await import('@/api/platform');
    const mockBody = { data: [], pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 } };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockBody });
    const result = await getWebhooks();
    expect(apiClient.get).toHaveBeenCalledWith('/webhooks', { params: undefined });
    expect(result).toEqual(mockBody);
  });

  it('getAuditEvents() calls GET /audit', async () => {
    const { apiClient } = await import('@/api/client');
    const { getAuditEvents } = await import('@/api/platform');
    const mockBody = { data: [], pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 } };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockBody });
    const result = await getAuditEvents({ eventType: 'login' });
    expect(apiClient.get).toHaveBeenCalledWith('/audit', { params: { eventType: 'login' } });
    expect(result).toEqual(mockBody);
  });

  it('revokeApiKey() calls DELETE /api-keys/{id}', async () => {
    const { apiClient } = await import('@/api/client');
    const { revokeApiKey } = await import('@/api/platform');
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: undefined });
    const result = await revokeApiKey(3);
    expect(apiClient.delete).toHaveBeenCalledWith('/api-keys/3');
    expect(result).toBeUndefined();
  });
});

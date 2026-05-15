import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/client', () => ({
  apiClient: { get: vi.fn() },
}));

describe('patients API', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('getPatients() calls GET /patients', async () => {
    const { apiClient } = await import('@/api/client');
    const { getPatients } = await import('@/api/patients');
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { data: [], pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 } },
    });
    await getPatients();
    expect(apiClient.get).toHaveBeenCalledWith('/patients', { params: undefined });
  });

  it('getPatient() calls GET /patients/{id}', async () => {
    const { apiClient } = await import('@/api/client');
    const { getPatient } = await import('@/api/patients');
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { data: { id: 5, firstName: 'Alice' } },
    });
    const result = await getPatient(5);
    expect(apiClient.get).toHaveBeenCalledWith('/patients/5');
    expect(result).toEqual({ id: 5, firstName: 'Alice' });
  });
});

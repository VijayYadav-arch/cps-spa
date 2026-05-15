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

  it('getPatientHistory() calls GET /patients/{id}/history', async () => {
    const { apiClient } = await import('@/api/client');
    const { getPatientHistory } = await import('@/api/patients');
    const mockBody = {
      data: [],
      pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
      filters: { type: null },
    };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockBody });
    const result = await getPatientHistory(1);
    expect(apiClient.get).toHaveBeenCalledWith('/patients/1/history', { params: undefined });
    expect(result).toEqual(mockBody);
  });

  it('getPatientHistory() passes type filter in params', async () => {
    const { apiClient } = await import('@/api/client');
    const { getPatientHistory } = await import('@/api/patients');
    const mockBody = {
      data: [],
      pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
      filters: { type: 'encounter' },
    };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockBody });
    await getPatientHistory(1, { type: 'encounter' });
    expect(apiClient.get).toHaveBeenCalledWith('/patients/1/history', { params: { type: 'encounter' } });
  });

  it('getPatientAccessLog() calls GET /patients/{id}/access-log', async () => {
    const { apiClient } = await import('@/api/client');
    const { getPatientAccessLog } = await import('@/api/patients');
    const mockBody = {
      data: [],
      pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
    };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockBody });
    const result = await getPatientAccessLog(1);
    expect(apiClient.get).toHaveBeenCalledWith('/patients/1/access-log', { params: undefined });
    expect(result).toEqual(mockBody);
  });
});

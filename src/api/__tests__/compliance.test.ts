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

describe('compliance API', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('getPhiPatientAccess() GETs /compliance/phi-access/by-patient/{id}', async () => {
    const { apiClient } = await import('@/api/client');
    const { getPhiPatientAccess } = await import('@/api/compliance');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { patientId: 1 } });
    await getPhiPatientAccess(1, '2026-05-01T00:00:00Z', '2026-05-31T00:00:00Z');
    expect(apiClient.get).toHaveBeenCalledWith(
      '/compliance/phi-access/by-patient/1',
      { params: { from: '2026-05-01T00:00:00Z', to: '2026-05-31T00:00:00Z' } },
    );
  });

  it('getPhiUserAccess() GETs /compliance/phi-access/by-user/{id}', async () => {
    const { apiClient } = await import('@/api/client');
    const { getPhiUserAccess } = await import('@/api/compliance');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { userId: 7 } });
    await getPhiUserAccess(7);
    expect(apiClient.get).toHaveBeenCalledWith(
      '/compliance/phi-access/by-user/7',
      { params: { from: undefined, to: undefined } },
    );
  });

  it('getPhiAnomalies() GETs /compliance/phi-access/anomalies', async () => {
    const { apiClient } = await import('@/api/client');
    const { getPhiAnomalies } = await import('@/api/compliance');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { totalAnomalies: 0 } });
    await getPhiAnomalies('2026-05-01T00:00:00Z', '2026-05-31T00:00:00Z');
    expect(apiClient.get).toHaveBeenCalledWith('/compliance/phi-access/anomalies', {
      params: { from: '2026-05-01T00:00:00Z', to: '2026-05-31T00:00:00Z' },
    });
  });

  it('recordPhiReview() POSTs to /compliance/phi-access/reviews', async () => {
    const { apiClient } = await import('@/api/client');
    const { recordPhiReview } = await import('@/api/compliance');
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1 } });
    await recordPhiReview({
      subjectType: 'patient',
      subjectId: 100,
      windowFromUtc: '2026-05-01T00:00:00Z',
      windowToUtc: '2026-05-31T00:00:00Z',
      result: 'ok',
      notes: 'looked clean',
      eventCount: 5,
    });
    expect(apiClient.post).toHaveBeenCalledWith('/compliance/phi-access/reviews', {
      subjectType: 'patient',
      subjectId: 100,
      windowFromUtc: '2026-05-01T00:00:00Z',
      windowToUtc: '2026-05-31T00:00:00Z',
      result: 'ok',
      notes: 'looked clean',
      eventCount: 5,
    });
  });

  it('listPhiReviews() includes filters when both supplied', async () => {
    const { apiClient } = await import('@/api/client');
    const { listPhiReviews } = await import('@/api/compliance');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: [] } });
    await listPhiReviews('patient', 100);
    expect(apiClient.get).toHaveBeenCalledWith('/compliance/phi-access/reviews', {
      params: { subjectType: 'patient', subjectId: 100 },
    });
  });

  it('listPhiReviews() omits params when filters absent', async () => {
    const { apiClient } = await import('@/api/client');
    const { listPhiReviews } = await import('@/api/compliance');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: [] } });
    await listPhiReviews();
    expect(apiClient.get).toHaveBeenCalledWith('/compliance/phi-access/reviews', {
      params: undefined,
    });
  });

  it('getPhiRetentionStatus() GETs /compliance/phi-access/retention-status', async () => {
    const { apiClient } = await import('@/api/client');
    const { getPhiRetentionStatus } = await import('@/api/compliance');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { totalEvents: 0 } });
    await getPhiRetentionStatus();
    expect(apiClient.get).toHaveBeenCalledWith('/compliance/phi-access/retention-status');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('claims API', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('getClaims() calls GET /claims with no params by default', async () => {
    const { apiClient } = await import('@/api/client');
    const { getClaims } = await import('@/api/claims');

    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { data: [], pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 } },
    });

    await getClaims();
    expect(apiClient.get).toHaveBeenCalledWith('/claims', { params: undefined });
  });

  it('getClaims() passes status filter as query param', async () => {
    const { apiClient } = await import('@/api/client');
    const { getClaims } = await import('@/api/claims');

    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { data: [], pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 } },
    });

    await getClaims({ status: 'pending', page: 2, pageSize: 10 });
    expect(apiClient.get).toHaveBeenCalledWith('/claims', {
      params: { status: 'pending', page: 2, pageSize: 10 },
    });
  });

  it('getClaim() calls GET /claims/{id}', async () => {
    const { apiClient } = await import('@/api/client');
    const { getClaim } = await import('@/api/claims');

    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { data: { id: 99, status: 'pending' } },
    });

    const result = await getClaim(99);
    expect(apiClient.get).toHaveBeenCalledWith('/claims/99');
    expect(result).toEqual({ id: 99, status: 'pending' });
  });

  it('submitClaim() POSTs to /claims/{id}/submit-to-clearinghouse', async () => {
    const { apiClient } = await import('@/api/client');
    const { submitClaim } = await import('@/api/claims');

    // 200 legacy shape: full ClaimDetail (has id + amount)
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { data: { id: 42, amount: 100, status: 'submitted' } },
    });

    await submitClaim(42);
    expect(apiClient.post).toHaveBeenCalledWith('/claims/42/submit-to-clearinghouse');
  });

  it('submitClaim() returns the full claim directly when the 200 shape is returned', async () => {
    const { apiClient } = await import('@/api/client');
    const { submitClaim } = await import('@/api/claims');

    const full = { id: 42, amount: 100, status: 'submitted' };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { data: full } });

    const result = await submitClaim(42);
    expect(result).toEqual(full);
    // No refetch needed when the full claim is in the response body.
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('submitClaim() refetches via getClaim() when the 202 submitting shape is returned', async () => {
    const { apiClient } = await import('@/api/client');
    const { submitClaim } = await import('@/api/claims');

    // 202 shape: { submissionId, status } — not a full claim
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { data: { submissionId: 7, status: 'submitting' } },
    });
    const refreshed = { id: 42, amount: 100, status: 'submitting' };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: refreshed } });

    const result = await submitClaim(42);
    expect(apiClient.post).toHaveBeenCalledWith('/claims/42/submit-to-clearinghouse');
    expect(apiClient.get).toHaveBeenCalledWith('/claims/42');
    expect(result).toEqual(refreshed);
  });

  it('deleteServiceLine() calls DELETE /claims/{id}/service-lines/{lineId}', async () => {
    const { apiClient } = await import('@/api/client');
    const { deleteServiceLine } = await import('@/api/claims');

    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: undefined });

    await deleteServiceLine(5, 12);
    expect(apiClient.delete).toHaveBeenCalledWith('/claims/5/service-lines/12');
  });
});

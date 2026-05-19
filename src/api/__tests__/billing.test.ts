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

  // ─── Denial Queue ────────────────────────────────────────────────────

  it('getDenialQueue() GETs /billing/denials/queue', async () => {
    const { apiClient } = await import('@/api/client');
    const { getDenialQueue } = await import('@/api/billing');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { totalOpen: 0, items: [] } });
    await getDenialQueue();
    expect(apiClient.get).toHaveBeenCalledWith('/billing/denials/queue');
  });

  it('getDenialSummary() GETs /billing/denials/summary', async () => {
    const { apiClient } = await import('@/api/client');
    const { getDenialSummary } = await import('@/api/billing');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { totalOpen: 0 } });
    await getDenialSummary();
    expect(apiClient.get).toHaveBeenCalledWith('/billing/denials/summary');
  });

  it('getAppealLetterDraft() GETs /billing/denials/{id}/appeal-letter', async () => {
    const { apiClient } = await import('@/api/client');
    const { getAppealLetterDraft } = await import('@/api/billing');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { denialWorkItemId: 5 } });
    await getAppealLetterDraft(5);
    expect(apiClient.get).toHaveBeenCalledWith('/billing/denials/5/appeal-letter');
  });

  it('resolveDenial() PUTs to /resolve', async () => {
    const { apiClient } = await import('@/api/client');
    const { resolveDenial } = await import('@/api/billing');
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { data: {} } });
    await resolveDenial(5, 'Paid in full after appeal');
    expect(apiClient.put).toHaveBeenCalledWith('/billing/denials/5/resolve', {
      resolution: 'Paid in full after appeal',
    });
  });
});

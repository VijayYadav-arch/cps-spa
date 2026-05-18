import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('hospice API', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('createElection() POSTs to /hospice/elections', async () => {
    const { apiClient } = await import('@/api/client');
    const { createElection } = await import('@/api/hospice');
    const mockBody = { id: 1, patientId: 1, electionDate: '2026-05-15', status: 'Active' };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockBody });
    const result = await createElection({
      patientId: 1,
      admissionId: null,
      electionDate: '2026-05-15',
      payerCode: 'MEDICARE_A',
    });
    expect(apiClient.post).toHaveBeenCalledWith('/hospice/elections', {
      patientId: 1,
      admissionId: null,
      electionDate: '2026-05-15',
      payerCode: 'MEDICARE_A',
    });
    expect(result).toEqual(mockBody);
  });

  it('getElection() GETs /hospice/elections/{id}', async () => {
    const { apiClient } = await import('@/api/client');
    const { getElection } = await import('@/api/hospice');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { id: 1 } });
    await getElection(1);
    expect(apiClient.get).toHaveBeenCalledWith('/hospice/elections/1');
  });

  it('getPatientElections() GETs /hospice/patients/{id}/elections', async () => {
    const { apiClient } = await import('@/api/client');
    const { getPatientElections } = await import('@/api/hospice');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: [] } });
    await getPatientElections(1);
    expect(apiClient.get).toHaveBeenCalledWith('/hospice/patients/1/elections');
  });

  it('getActiveElections() GETs /hospice/elections/active', async () => {
    const { apiClient } = await import('@/api/client');
    const { getActiveElections } = await import('@/api/hospice');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: [] } });
    await getActiveElections();
    expect(apiClient.get).toHaveBeenCalledWith('/hospice/elections/active');
  });

  it('revokeElection() POSTs to /hospice/elections/{id}/revoke', async () => {
    const { apiClient } = await import('@/api/client');
    const { revokeElection } = await import('@/api/hospice');
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1 } });
    await revokeElection(1, { revocationDate: '2026-06-01', reason: 'curative' });
    expect(apiClient.post).toHaveBeenCalledWith('/hospice/elections/1/revoke', {
      revocationDate: '2026-06-01',
      reason: 'curative',
    });
  });

  it('submitNoe() POSTs to /hospice/elections/{id}/noe/submit', async () => {
    const { apiClient } = await import('@/api/client');
    const { submitNoe } = await import('@/api/hospice');
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1, status: 'Submitted' } });
    await submitNoe(1, { mode: 'Manual', manualDocumentUrl: 'url' });
    expect(apiClient.post).toHaveBeenCalledWith('/hospice/elections/1/noe/submit', {
      mode: 'Manual',
      manualDocumentUrl: 'url',
    });
  });

  it('getNoe() GETs /hospice/elections/{id}/noe', async () => {
    const { apiClient } = await import('@/api/client');
    const { getNoe } = await import('@/api/hospice');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { id: 1 } });
    await getNoe(1);
    expect(apiClient.get).toHaveBeenCalledWith('/hospice/elections/1/noe');
  });

  it('getWorkQueue() GETs /hospice/work-queue', async () => {
    const { apiClient } = await import('@/api/client');
    const { getWorkQueue } = await import('@/api/hospice');
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { recertsDue: [], noeOverdue: [] },
    });
    await getWorkQueue();
    expect(apiClient.get).toHaveBeenCalledWith('/hospice/work-queue');
  });
});

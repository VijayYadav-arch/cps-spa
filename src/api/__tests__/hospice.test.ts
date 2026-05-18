import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
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

  // ─── Sub-system B: Per-Diem Billing ──────────────────────────────────────

  it('recordAttendance() POSTs to /hospice/elections/{id}/attendance', async () => {
    const { apiClient } = await import('@/api/client');
    const { recordAttendance } = await import('@/api/hospice');
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1 } });
    await recordAttendance(7, {
      serviceDate: '2026-05-10',
      levelOfCare: 'RoutineHomeCare',
      chcHoursOfCare: null,
      primaryNurseUserId: 42,
      facilityName: null,
      notes: null,
    });
    expect(apiClient.post).toHaveBeenCalledWith('/hospice/elections/7/attendance', {
      serviceDate: '2026-05-10',
      levelOfCare: 'RoutineHomeCare',
      chcHoursOfCare: null,
      primaryNurseUserId: 42,
      facilityName: null,
      notes: null,
    });
  });

  it('getAttendance() GETs /hospice/elections/{id}/attendance with params', async () => {
    const { apiClient } = await import('@/api/client');
    const { getAttendance } = await import('@/api/hospice');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: [], total: 0 } });
    await getAttendance(7, { from: '2026-05-01', to: '2026-05-31', page: 1, pageSize: 50 });
    expect(apiClient.get).toHaveBeenCalledWith('/hospice/elections/7/attendance', {
      params: { from: '2026-05-01', to: '2026-05-31', page: 1, pageSize: 50 },
    });
  });

  it('updateAttendance() PUTs to /hospice/attendance/{id}', async () => {
    const { apiClient } = await import('@/api/client');
    const { updateAttendance } = await import('@/api/hospice');
    vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { id: 5 } });
    await updateAttendance(5, {
      levelOfCare: 'GeneralInpatient',
      chcHoursOfCare: null,
      primaryNurseUserId: null,
      facilityName: 'St Mary',
      notes: null,
    });
    expect(apiClient.put).toHaveBeenCalledWith('/hospice/attendance/5', expect.objectContaining({
      levelOfCare: 'GeneralInpatient',
      facilityName: 'St Mary',
    }));
  });

  it('deleteAttendance() DELETEs /hospice/attendance/{id}', async () => {
    const { apiClient } = await import('@/api/client');
    const { deleteAttendance } = await import('@/api/hospice');
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ data: undefined });
    await deleteAttendance(5);
    expect(apiClient.delete).toHaveBeenCalledWith('/hospice/attendance/5');
  });

  it('buildPerDiemClaim() POSTs to /hospice/elections/{id}/per-diem-claim', async () => {
    const { apiClient } = await import('@/api/client');
    const { buildPerDiemClaim } = await import('@/api/hospice');
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        claimId: 100,
        claimNumber: 'HSP-7-20260501',
        totalCharges: 6000,
        lines: [],
        attendanceDayIds: [],
        warnings: [],
      },
    });
    await buildPerDiemClaim(7, { from: '2026-05-01', to: '2026-05-31' });
    expect(apiClient.post).toHaveBeenCalledWith('/hospice/elections/7/per-diem-claim', {
      from: '2026-05-01',
      to: '2026-05-31',
    });
  });

  it('getPerDiemRates() GETs /hospice/per-diem-rates with optional as_of', async () => {
    const { apiClient } = await import('@/api/client');
    const { getPerDiemRates } = await import('@/api/hospice');

    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: [], asOf: '2026-05-18' } });
    await getPerDiemRates();
    expect(apiClient.get).toHaveBeenCalledWith('/hospice/per-diem-rates', { params: undefined });

    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: [], asOf: '2026-01-01' } });
    await getPerDiemRates('2026-01-01');
    expect(apiClient.get).toHaveBeenCalledWith('/hospice/per-diem-rates', {
      params: { as_of: '2026-01-01' },
    });
  });
});

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

  // ─── Surveyor evidence bundle ────────────────────────────────────────

  it('getSurveyorBundleManifest() GETs /compliance/surveyor-bundle/{id}/manifest', async () => {
    const { apiClient } = await import('@/api/client');
    const { getSurveyorBundleManifest } = await import('@/api/compliance');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { patientId: 100 } });
    await getSurveyorBundleManifest(100, '2026-01-01', '2026-05-19');
    expect(apiClient.get).toHaveBeenCalledWith(
      '/compliance/surveyor-bundle/100/manifest',
      { params: { from: '2026-01-01', to: '2026-05-19' } },
    );
  });

  // ─── Breach workflow ─────────────────────────────────────────────────

  it('listBreachesWorkflow() GETs /compliance/breaches/workflow', async () => {
    const { apiClient } = await import('@/api/client');
    const { listBreachesWorkflow } = await import('@/api/compliance');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: [] } });
    await listBreachesWorkflow();
    expect(apiClient.get).toHaveBeenCalledWith('/compliance/breaches/workflow');
  });

  it('assessBreachRisk() POSTs to /assess-risk', async () => {
    const { apiClient } = await import('@/api/client');
    const { assessBreachRisk } = await import('@/api/compliance');
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1 } });
    await assessBreachRisk(1, {
      riskLevel: 'Moderate',
      notes: 'Limited exposure',
      affectedPatientCount: 100,
      mediaNoticeRequired: false,
    });
    expect(apiClient.post).toHaveBeenCalledWith(
      '/compliance/breaches/workflow/1/assess-risk',
      {
        riskLevel: 'Moderate',
        notes: 'Limited exposure',
        affectedPatientCount: 100,
        mediaNoticeRequired: false,
      },
    );
  });

  it('closeBreach() POSTs to /close', async () => {
    const { apiClient } = await import('@/api/client');
    const { closeBreach } = await import('@/api/compliance');
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1 } });
    await closeBreach(1, 'all done');
    expect(apiClient.post).toHaveBeenCalledWith(
      '/compliance/breaches/workflow/1/close',
      { notes: 'all done' },
    );
  });

  it('getBreachActivity() GETs /activity', async () => {
    const { apiClient } = await import('@/api/client');
    const { getBreachActivity } = await import('@/api/compliance');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: [] } });
    await getBreachActivity(1);
    expect(apiClient.get).toHaveBeenCalledWith(
      '/compliance/breaches/workflow/1/activity',
    );
  });

  it('downloadSurveyorBundle() requests the ZIP as a blob', async () => {
    const { apiClient } = await import('@/api/client');
    const { downloadSurveyorBundle } = await import('@/api/compliance');

    // jsdom: stub URL.createObjectURL + click side-effects
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:zzz');
    URL.revokeObjectURL = vi.fn();
    const click = vi.fn();
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreate(tag);
      if (tag === 'a') (el as HTMLAnchorElement).click = click;
      return el;
    });

    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: new Blob(['zip-bytes']),
      headers: { 'content-disposition': 'attachment; filename="bundle.zip"' },
    } as never);

    const name = await downloadSurveyorBundle(100, '2026-01-01', '2026-05-19');
    expect(apiClient.get).toHaveBeenCalledWith(
      '/compliance/surveyor-bundle/100',
      expect.objectContaining({
        params: { from: '2026-01-01', to: '2026-05-19' },
        responseType: 'blob',
      }),
    );
    expect(name).toBe('bundle.zip');
    expect(click).toHaveBeenCalled();

    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    vi.restoreAllMocks();
  });
});

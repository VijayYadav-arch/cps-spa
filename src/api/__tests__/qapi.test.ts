import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('qapi API', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  // ============ Plan ============

  it('getActivePlan() GETs /hospice/qapi/plan/active and returns data', async () => {
    const { apiClient } = await import('@/api/client');
    const { getActivePlan } = await import('@/api/qapi');
    const mockPlan = { id: 1, title: 'QAPI Plan 2026', status: 'Approved', version: 2 };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockPlan });
    const result = await getActivePlan();
    expect(apiClient.get).toHaveBeenCalledWith('/hospice/qapi/plan/active');
    expect(result).toEqual(mockPlan);
  });

  it('getActivePlan() returns null when response is empty string', async () => {
    const { apiClient } = await import('@/api/client');
    const { getActivePlan } = await import('@/api/qapi');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: '' });
    const result = await getActivePlan();
    expect(result).toBeNull();
  });

  it('listPlanVersions() GETs /hospice/qapi/plan/versions', async () => {
    const { apiClient } = await import('@/api/client');
    const { listPlanVersions } = await import('@/api/qapi');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });
    await listPlanVersions();
    expect(apiClient.get).toHaveBeenCalledWith('/hospice/qapi/plan/versions');
  });

  it('createPlanDraft() POSTs to /hospice/qapi/plan/draft with body', async () => {
    const { apiClient } = await import('@/api/client');
    const { createPlanDraft } = await import('@/api/qapi');
    const mockPlan = { id: 3, title: 'Draft Plan', status: 'Draft', version: 1 };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockPlan });
    const body = { title: 'Draft Plan', bodyMarkdown: '## QAPI', effectiveDate: '2026-01-01' };
    const result = await createPlanDraft(body);
    expect(apiClient.post).toHaveBeenCalledWith('/hospice/qapi/plan/draft', body);
    expect(result).toEqual(mockPlan);
  });

  it('approvePlan() POSTs to /hospice/qapi/plan/{id}/approve', async () => {
    const { apiClient } = await import('@/api/client');
    const { approvePlan } = await import('@/api/qapi');
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 3, status: 'Approved' } });
    await approvePlan(3);
    expect(apiClient.post).toHaveBeenCalledWith('/hospice/qapi/plan/3/approve');
  });

  // ============ PIPs ============

  it('listPips() GETs /hospice/qapi/pips without filters', async () => {
    const { apiClient } = await import('@/api/client');
    const { listPips } = await import('@/api/qapi');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });
    await listPips();
    expect(apiClient.get).toHaveBeenCalledWith('/hospice/qapi/pips');
  });

  it('listPips() GETs /hospice/qapi/pips?status=Active&category=PatientSafety with filters', async () => {
    const { apiClient } = await import('@/api/client');
    const { listPips } = await import('@/api/qapi');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });
    await listPips({ status: 'Active', category: 'PatientSafety' });
    expect(apiClient.get).toHaveBeenCalledWith(
      '/hospice/qapi/pips?status=Active&category=PatientSafety',
    );
  });

  it('createPip() POSTs to /hospice/qapi/pips with body', async () => {
    const { apiClient } = await import('@/api/client');
    const { createPip } = await import('@/api/qapi');
    const mockPip = { id: 10, title: 'Fall Prevention PIP', status: 'Planning' };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockPip });
    const body = {
      title: 'Fall Prevention PIP',
      description: 'Reduce fall rate',
      category: 'PatientSafety' as const,
      interventionPlan: 'Bed alarms, gait training',
      ownerUserId: 7,
      leadingHqrpMetric: null,
    };
    const result = await createPip(body);
    expect(apiClient.post).toHaveBeenCalledWith('/hospice/qapi/pips', body);
    expect(result).toEqual(mockPip);
  });

  it('updatePipMeasurement() PATCHes /hospice/qapi/pips/{id}/measurement', async () => {
    const { apiClient } = await import('@/api/client');
    const { updatePipMeasurement } = await import('@/api/qapi');
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { id: 10 } });
    const body = { baseline: 12, baselineDate: '2026-01-01', target: 6, targetDateValue: '2026-06-01' };
    await updatePipMeasurement(10, body);
    expect(apiClient.patch).toHaveBeenCalledWith('/hospice/qapi/pips/10/measurement', body);
  });

  it('activatePip() POSTs to /hospice/qapi/pips/{id}/activate', async () => {
    const { apiClient } = await import('@/api/client');
    const { activatePip } = await import('@/api/qapi');
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 10, status: 'Active' } });
    await activatePip(10);
    expect(apiClient.post).toHaveBeenCalledWith('/hospice/qapi/pips/10/activate');
  });

  it('completePip() POSTs to /hospice/qapi/pips/{id}/complete with outcomeSummary', async () => {
    const { apiClient } = await import('@/api/client');
    const { completePip } = await import('@/api/qapi');
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 10, status: 'Completed' } });
    await completePip(10, 'Fall rate reduced by 50%');
    expect(apiClient.post).toHaveBeenCalledWith('/hospice/qapi/pips/10/complete', {
      outcomeSummary: 'Fall rate reduced by 50%',
    });
  });

  // ============ Adverse Events ============

  it('listAdverseEvents() GETs /hospice/qapi/adverse-events without filters', async () => {
    const { apiClient } = await import('@/api/client');
    const { listAdverseEvents } = await import('@/api/qapi');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });
    await listAdverseEvents();
    expect(apiClient.get).toHaveBeenCalledWith('/hospice/qapi/adverse-events');
  });

  it('listDraftAdverseEvents() GETs /hospice/qapi/adverse-events/drafts', async () => {
    const { apiClient } = await import('@/api/client');
    const { listDraftAdverseEvents } = await import('@/api/qapi');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });
    await listDraftAdverseEvents();
    expect(apiClient.get).toHaveBeenCalledWith('/hospice/qapi/adverse-events/drafts');
  });

  it('getAdverseEvent() GETs /hospice/qapi/adverse-events/{id}', async () => {
    const { apiClient } = await import('@/api/client');
    const { getAdverseEvent } = await import('@/api/qapi');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { id: 5 } });
    await getAdverseEvent(5);
    expect(apiClient.get).toHaveBeenCalledWith('/hospice/qapi/adverse-events/5');
  });

  it('createAdverseEvent() POSTs to /hospice/qapi/adverse-events with body', async () => {
    const { apiClient } = await import('@/api/client');
    const { createAdverseEvent } = await import('@/api/qapi');
    const mockEvent = { id: 20, category: 'PatientFall', severity: 'Minor', status: 'Draft' };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockEvent });
    const body = {
      category: 'PatientFall' as const,
      severity: 'Minor' as const,
      eventDate: '2026-05-20',
      patientId: 101,
      summary: 'Patient fell in bathroom',
      immediateActionTaken: 'Assessed for injury',
    };
    const result = await createAdverseEvent(body);
    expect(apiClient.post).toHaveBeenCalledWith('/hospice/qapi/adverse-events', body);
    expect(result).toEqual(mockEvent);
  });

  it('updateAdverseEventStatus() PATCHes /hospice/qapi/adverse-events/{id}', async () => {
    const { apiClient } = await import('@/api/client');
    const { updateAdverseEventStatus } = await import('@/api/qapi');
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { id: 20, status: 'Closed' } });
    const body = { status: 'Closed' as const, notes: 'No further action needed' };
    await updateAdverseEventStatus(20, body);
    expect(apiClient.patch).toHaveBeenCalledWith('/hospice/qapi/adverse-events/20', body);
  });

  it('createRca() POSTs to /hospice/qapi/adverse-events/{id}/rca with body', async () => {
    const { apiClient } = await import('@/api/client');
    const { createRca } = await import('@/api/qapi');
    const mockRca = { id: 3, eventId: 20, rcaMethod: 'FiveWhys' };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockRca });
    const body = {
      method: 'FiveWhys' as const,
      contributingFactors: 'Slippery floor, no grip socks',
      rootCauseSummary: 'Inadequate slip prevention protocol',
      linkedPipId: 10,
    };
    const result = await createRca(20, body);
    expect(apiClient.post).toHaveBeenCalledWith('/hospice/qapi/adverse-events/20/rca', body);
    expect(result).toEqual(mockRca);
  });

  // ============ Reviews ============

  it('listReviews() GETs /hospice/qapi/reviews?skip=0&take=50', async () => {
    const { apiClient } = await import('@/api/client');
    const { listReviews } = await import('@/api/qapi');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });
    await listReviews();
    expect(apiClient.get).toHaveBeenCalledWith('/hospice/qapi/reviews?skip=0&take=50');
  });

  it('getMostRecentReview() GETs /hospice/qapi/reviews/most-recent and returns data', async () => {
    const { apiClient } = await import('@/api/client');
    const { getMostRecentReview } = await import('@/api/qapi');
    const mockReview = { id: 8, reviewDate: '2026-05-01', attendeeNames: 'Dr Smith, RN Jones' };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockReview });
    const result = await getMostRecentReview();
    expect(apiClient.get).toHaveBeenCalledWith('/hospice/qapi/reviews/most-recent');
    expect(result).toEqual(mockReview);
  });

  it('getMostRecentReview() returns null when response is empty string', async () => {
    const { apiClient } = await import('@/api/client');
    const { getMostRecentReview } = await import('@/api/qapi');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: '' });
    const result = await getMostRecentReview();
    expect(result).toBeNull();
  });

  it('logReview() POSTs to /hospice/qapi/reviews with body', async () => {
    const { apiClient } = await import('@/api/client');
    const { logReview } = await import('@/api/qapi');
    const mockReview = { id: 9, reviewDate: '2026-05-28' };
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockReview });
    const body = {
      reviewDate: '2026-05-28',
      attendeeNames: 'Dr Smith, RN Jones, SW Brown',
      topicsReviewed: 'Adverse events Q1, PIP status',
      decisionsMade: 'Activate fall prevention PIP',
      nextReviewTargetDate: '2026-08-28',
    };
    const result = await logReview(body);
    expect(apiClient.post).toHaveBeenCalledWith('/hospice/qapi/reviews', body);
    expect(result).toEqual(mockReview);
  });

  // ============ Dashboard ============

  it('getQapiDashboard() GETs /hospice/qapi/dashboard', async () => {
    const { apiClient } = await import('@/api/client');
    const { getQapiDashboard } = await import('@/api/qapi');
    const mockDashboard = {
      planStatus: { currentVersion: 2, status: 'Approved', effectiveDate: '2026-01-01' },
      activePipCount: 3,
      topActivePips: [],
      adverseEventCountByCategory90d: { PatientFall: 2 },
      weekOverWeekTrend: { currentWeekCount: 1, previousWeekCount: 2, delta: -1 },
      daysSinceLastReview: 27,
      reviewOverdue: false,
      hqrpSummary: null,
      cahpsSummary: null,
    };
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockDashboard });
    const result = await getQapiDashboard();
    expect(apiClient.get).toHaveBeenCalledWith('/hospice/qapi/dashboard');
    expect(result).toEqual(mockDashboard);
  });
});

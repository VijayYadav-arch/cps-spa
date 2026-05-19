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

  // ─── AR Dashboard ────────────────────────────────────────────────────

  it('getArDashboard() GETs /billing/ar-followup/dashboard', async () => {
    const { apiClient } = await import('@/api/client');
    const { getArDashboard } = await import('@/api/billing');
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { totalFollowUpClaims: 0, totalAmount: 0, actionQueue: [], byPayer: [] },
    });
    await getArDashboard();
    expect(apiClient.get).toHaveBeenCalledWith('/billing/ar-followup/dashboard');
  });

  it('logArCall() POSTs to /billing/ar-followup/claims/{id}/notes', async () => {
    const { apiClient } = await import('@/api/client');
    const { logArCall } = await import('@/api/billing');
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { data: {} } });
    await logArCall(7, {
      contactName: 'Acme',
      outcome: 'pending',
      note: 'x',
      nextFollowUpDate: null,
    });
    expect(apiClient.post).toHaveBeenCalledWith(
      '/billing/ar-followup/claims/7/notes',
      expect.objectContaining({ contactName: 'Acme', outcome: 'pending' }),
    );
  });

  // ─── Secondary payer ────────────────────────────────────────────────

  it('listEligibleSecondary() GETs /billing/secondary-claims/eligible', async () => {
    const { apiClient } = await import('@/api/client');
    const { listEligibleSecondary } = await import('@/api/billing');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: [] } });
    await listEligibleSecondary();
    expect(apiClient.get).toHaveBeenCalledWith('/billing/secondary-claims/eligible');
  });

  it('buildSecondary837() POSTs with clearinghouse', async () => {
    const { apiClient } = await import('@/api/client');
    const { buildSecondary837 } = await import('@/api/billing');
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { submissionId: 1 } });
    await buildSecondary837(7, 'availity');
    expect(apiClient.post).toHaveBeenCalledWith('/billing/secondary-claims/7/build', {
      clearinghouse: 'availity',
    });
  });

  // ─── Patient statements ─────────────────────────────────────────────

  it('listStatementRuns() GETs /billing/statements/runs with status filter', async () => {
    const { apiClient } = await import('@/api/client');
    const { listStatementRuns } = await import('@/api/billing');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: [] } });
    await listStatementRuns('sent');
    expect(apiClient.get).toHaveBeenCalledWith('/billing/statements/runs', {
      params: { status: 'sent' },
    });
  });

  it('generateStatementRun() POSTs with patientId', async () => {
    const { apiClient } = await import('@/api/client');
    const { generateStatementRun } = await import('@/api/billing');
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1 } });
    await generateStatementRun(100);
    expect(apiClient.post).toHaveBeenCalledWith('/billing/statements/runs/generate', {
      patientId: 100,
    });
  });

  it('recordStatementPayment() POSTs with amount', async () => {
    const { apiClient } = await import('@/api/client');
    const { recordStatementPayment } = await import('@/api/billing');
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1 } });
    await recordStatementPayment(5, 75);
    expect(apiClient.post).toHaveBeenCalledWith(
      '/billing/statements/runs/5/record-payment',
      { amount: 75 },
    );
  });

  it('escalateStatement() POSTs to /escalate', async () => {
    const { apiClient } = await import('@/api/client');
    const { escalateStatement } = await import('@/api/billing');
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 2, dunningCycle: 2 } });
    await escalateStatement(1);
    expect(apiClient.post).toHaveBeenCalledWith('/billing/statements/runs/1/escalate', {});
  });

  it('getStatementDunningQueue() GETs /dunning-queue', async () => {
    const { apiClient } = await import('@/api/client');
    const { getStatementDunningQueue } = await import('@/api/billing');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { entries: [] } });
    await getStatementDunningQueue();
    expect(apiClient.get).toHaveBeenCalledWith('/billing/statements/runs/dunning-queue');
  });

  // ─── Eligibility ────────────────────────────────────────────────────

  it('verifyEligibility() POSTs to /billing/eligibility/verify', async () => {
    const { apiClient } = await import('@/api/client');
    const { verifyEligibility } = await import('@/api/billing');
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1 } });
    await verifyEligibility({
      patientId: 100,
      payerId: '00100',
      memberId: 'M-1',
      memberFirstName: 'A',
      memberLastName: 'B',
      memberDob: '1940-03-14',
      providerNpi: null,
      serviceTypeCode: '30',
      clearinghouse: 'mock',
    });
    expect(apiClient.post).toHaveBeenCalledWith(
      '/billing/eligibility/verify',
      expect.objectContaining({ payerId: '00100', memberId: 'M-1' }),
    );
  });

  it('listRecentEligibility() GETs /billing/eligibility/recent', async () => {
    const { apiClient } = await import('@/api/client');
    const { listRecentEligibility } = await import('@/api/billing');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: [] } });
    await listRecentEligibility(25);
    expect(apiClient.get).toHaveBeenCalledWith('/billing/eligibility/recent', {
      params: { limit: 25 },
    });
  });

  it('listEligibilityForPatient() GETs by-patient', async () => {
    const { apiClient } = await import('@/api/client');
    const { listEligibilityForPatient } = await import('@/api/billing');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: [] } });
    await listEligibilityForPatient(100);
    expect(apiClient.get).toHaveBeenCalledWith('/billing/eligibility/by-patient/100');
  });
});

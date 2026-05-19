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

  // ─── Sub-system C ────────────────────────────────────────────────────────

  it('startHopeAssessment() POSTs to /hospice/elections/{id}/hope', async () => {
    const { apiClient } = await import('@/api/client');
    const { startHopeAssessment } = await import('@/api/hospice');
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1 } });
    await startHopeAssessment(7, {
      submissionType: 'Admission',
      targetDate: '2026-05-01',
      initialPayload: null,
    });
    expect(apiClient.post).toHaveBeenCalledWith('/hospice/elections/7/hope', expect.objectContaining({
      submissionType: 'Admission',
    }));
  });

  it('signHopeAssessment() POSTs to /hospice/hope/{id}/sign', async () => {
    const { apiClient } = await import('@/api/client');
    const { signHopeAssessment } = await import('@/api/hospice');
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1, status: 'Signed' } });
    await signHopeAssessment(11);
    expect(apiClient.post).toHaveBeenCalledWith('/hospice/hope/11/sign', {});
  });

  it('submitHopeAssessment() POSTs to /hospice/hope/{id}/submit', async () => {
    const { apiClient } = await import('@/api/client');
    const { submitHopeAssessment } = await import('@/api/hospice');
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 11, status: 'Submitted' } });
    await submitHopeAssessment(11);
    expect(apiClient.post).toHaveBeenCalledWith('/hospice/hope/11/submit', {});
  });

  it('listHopeOverdue() GETs /hospice/hope/overdue', async () => {
    const { apiClient } = await import('@/api/client');
    const { listHopeOverdue } = await import('@/api/hospice');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: [] } });
    await listHopeOverdue();
    expect(apiClient.get).toHaveBeenCalledWith('/hospice/hope/overdue');
  });

  it('scheduleIdgMeeting() POSTs to /hospice/idg-meetings', async () => {
    const { apiClient } = await import('@/api/client');
    const { scheduleIdgMeeting } = await import('@/api/hospice');
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1 } });
    await scheduleIdgMeeting({
      meetingDate: '2026-05-20T09:00:00Z',
      hospiceElectionId: 7,
      facilitatorUserId: 1,
      attendees: [
        { userId: 1, role: 'physician' },
        { userId: 2, role: 'rn' },
        { userId: 3, role: 'social_worker' },
        { userId: 4, role: 'chaplain' },
      ],
      patientsReviewed: [10],
      notes: null,
    });
    expect(apiClient.post).toHaveBeenCalledWith('/hospice/idg-meetings', expect.objectContaining({
      hospiceElectionId: 7,
    }));
  });

  it('completeIdgMeeting() POSTs to /hospice/idg-meetings/{id}/complete', async () => {
    const { apiClient } = await import('@/api/client');
    const { completeIdgMeeting } = await import('@/api/hospice');
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 5 } });
    await completeIdgMeeting(5, {
      patientsReviewed: [10, 11],
      notes: 'Done',
      actionItems: null,
      nextMeetingDate: null,
    });
    expect(apiClient.post).toHaveBeenCalledWith('/hospice/idg-meetings/5/complete', expect.objectContaining({
      patientsReviewed: [10, 11],
    }));
  });

  it('cancelIdgMeeting() POSTs to /hospice/idg-meetings/{id}/cancel with reason', async () => {
    const { apiClient } = await import('@/api/client');
    const { cancelIdgMeeting } = await import('@/api/hospice');
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 5 } });
    await cancelIdgMeeting(5, 'no-show');
    expect(apiClient.post).toHaveBeenCalledWith('/hospice/idg-meetings/5/cancel', {
      reason: 'no-show',
    });
  });

  it('recordCarePlanReview() POSTs to /hospice/care-plans/{id}/reviews', async () => {
    const { apiClient } = await import('@/api/client');
    const { recordCarePlanReview } = await import('@/api/hospice');
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1 } });
    await recordCarePlanReview(20, {
      reviewDate: '2026-05-10',
      idgMeetingId: 5,
      outcome: 'NoChange',
      changesSummary: null,
    });
    expect(apiClient.post).toHaveBeenCalledWith('/hospice/care-plans/20/reviews', expect.objectContaining({
      outcome: 'NoChange',
    }));
  });

  it('countersignCertification() POSTs with physician id', async () => {
    const { apiClient } = await import('@/api/client');
    const { countersignCertification } = await import('@/api/hospice');
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 9, status: 'Countersigned' } });
    await countersignCertification(9, 200);
    expect(apiClient.post).toHaveBeenCalledWith('/hospice/certifications/9/countersign', {
      countersigningPhysicianId: 200,
    });
  });

  it('previewSia() GETs /hospice/elections/{id}/sia-preview', async () => {
    const { apiClient } = await import('@/api/client');
    const { previewSia } = await import('@/api/hospice');
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        electionId: 7,
        deathDate: '2026-05-14',
        windowFrom: '2026-05-08',
        windowTo: '2026-05-14',
        qualifyingDayCount: 2,
        units: 2,
        perVisitRate: 100,
        charges: 200,
        qualifyingVisitNoteIds: [1, 2],
      },
    });
    const result = await previewSia(7);
    expect(apiClient.get).toHaveBeenCalledWith('/hospice/elections/7/sia-preview');
    expect(result?.units).toBe(2);
  });

  it('previewSia() returns null on 204', async () => {
    const { apiClient } = await import('@/api/client');
    const { previewSia } = await import('@/api/hospice');
    vi.mocked(apiClient.get).mockRejectedValueOnce({ response: { status: 204 } });
    const result = await previewSia(7);
    expect(result).toBeNull();
  });

  // ─── CAHPS Hospice Survey ────────────────────────────────────────────────

  it('listCahpsCases() GETs /hospice/cahps with optional date range', async () => {
    const { apiClient } = await import('@/api/client');
    const { listCahpsCases } = await import('@/api/hospice');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: [] } });
    await listCahpsCases('2026-04-01', '2026-06-30');
    expect(apiClient.get).toHaveBeenCalledWith('/hospice/cahps', {
      params: { from: '2026-04-01', to: '2026-06-30' },
    });
  });

  it('listCahpsCases() omits params when no range given', async () => {
    const { apiClient } = await import('@/api/client');
    const { listCahpsCases } = await import('@/api/hospice');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: [] } });
    await listCahpsCases();
    expect(apiClient.get).toHaveBeenCalledWith('/hospice/cahps', {
      params: undefined,
    });
  });

  it('ensureCahpsCase() POSTs to /hospice/cahps', async () => {
    const { apiClient } = await import('@/api/client');
    const { ensureCahpsCase } = await import('@/api/hospice');
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1 } });
    await ensureCahpsCase({
      patientId: 1,
      hospiceElectionId: 5,
      dateOfDeath: '2026-04-20',
      admittedAt: '2026-03-01',
      ageAtDeath: 75,
    });
    expect(apiClient.post).toHaveBeenCalledWith('/hospice/cahps', {
      patientId: 1,
      hospiceElectionId: 5,
      dateOfDeath: '2026-04-20',
      admittedAt: '2026-03-01',
      ageAtDeath: 75,
    });
  });

  it('updateCahpsCaregiver() PATCHes /hospice/cahps/{id}/caregiver', async () => {
    const { apiClient } = await import('@/api/client');
    const { updateCahpsCaregiver } = await import('@/api/hospice');
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { id: 7 } });
    await updateCahpsCaregiver(7, {
      caregiverName: 'Jane Doe',
      caregiverAddress: null,
      caregiverPhone: null,
      caregiverIsFamilial: true,
      notes: null,
    });
    expect(apiClient.patch).toHaveBeenCalledWith('/hospice/cahps/7/caregiver', {
      caregiverName: 'Jane Doe',
      caregiverAddress: null,
      caregiverPhone: null,
      caregiverIsFamilial: true,
      notes: null,
    });
  });

  it('submitCahpsCase() POSTs to /hospice/cahps/{id}/submit', async () => {
    const { apiClient } = await import('@/api/client');
    const { submitCahpsCase } = await import('@/api/hospice');
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 7 } });
    await submitCahpsCase(7, {
      vendorName: 'V',
      vendorConfirmation: 'C1',
      submittedAt: null,
    });
    expect(apiClient.post).toHaveBeenCalledWith('/hospice/cahps/7/submit', {
      vendorName: 'V',
      vendorConfirmation: 'C1',
      submittedAt: null,
    });
  });

  it('excludeCahpsCase() POSTs to /hospice/cahps/{id}/exclude', async () => {
    const { apiClient } = await import('@/api/client');
    const { excludeCahpsCase } = await import('@/api/hospice');
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 7 } });
    await excludeCahpsCase(7, { reason: 'declined' });
    expect(apiClient.post).toHaveBeenCalledWith('/hospice/cahps/7/exclude', {
      reason: 'declined',
    });
  });

  it('getCahpsCompliance() GETs /hospice/cahps/compliance/{year}/q/{quarter}', async () => {
    const { apiClient } = await import('@/api/client');
    const { getCahpsCompliance } = await import('@/api/hospice');
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { calendarYear: 2026, quarter: 2 },
    });
    await getCahpsCompliance(2026, 2);
    expect(apiClient.get).toHaveBeenCalledWith(
      '/hospice/cahps/compliance/2026/q/2',
    );
  });

  // ─── 837I Hospice Claim Export ────────────────────────────────────────

  it('exportHospice837I() POSTs to /hospice/claims/{id}/export-837i', async () => {
    const { apiClient } = await import('@/api/client');
    const { exportHospice837I } = await import('@/api/hospice');
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: { submissionId: 1, edi837: 'ISA*...', controlNumber: '000000001', typeOfBill: '0811', lineCount: 1, totalCharges: 720, warnings: [] },
    });
    await exportHospice837I(7, {
      clearinghouse: 'availity',
      priorAuthorizationNumber: null,
      claimNote: null,
    });
    expect(apiClient.post).toHaveBeenCalledWith('/hospice/claims/7/export-837i', {
      clearinghouse: 'availity',
      priorAuthorizationNumber: null,
      claimNote: null,
    });
  });

  it('listClaimSubmissions() GETs /hospice/claims/{id}/submissions', async () => {
    const { apiClient } = await import('@/api/client');
    const { listClaimSubmissions } = await import('@/api/hospice');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { data: [] } });
    await listClaimSubmissions(7);
    expect(apiClient.get).toHaveBeenCalledWith('/hospice/claims/7/submissions');
  });

  it('getClaimSubmission() GETs /hospice/claim-submissions/{id}', async () => {
    const { apiClient } = await import('@/api/client');
    const { getClaimSubmission } = await import('@/api/hospice');
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: { id: 1 } });
    await getClaimSubmission(1);
    expect(apiClient.get).toHaveBeenCalledWith('/hospice/claim-submissions/1');
  });

  it('markClaimSubmissionSubmitted() POSTs to /mark-submitted', async () => {
    const { apiClient } = await import('@/api/client');
    const { markClaimSubmissionSubmitted } = await import('@/api/hospice');
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 1, status: 'submitted' } });
    await markClaimSubmissionSubmitted(1, 'TRACK-123');
    expect(apiClient.post).toHaveBeenCalledWith(
      '/hospice/claim-submissions/1/mark-submitted',
      { clearinghouseTrackingId: 'TRACK-123' },
    );
  });
});

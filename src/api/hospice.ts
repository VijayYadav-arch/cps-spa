import { apiClient } from '@/api/client';

export type HospiceElectionStatus = 'Active' | 'Revoked' | 'Expired';
export type HospiceElectionType = 'InitialElection' | 'ReElection';
export type HospicePeriodStatus = 'Active' | 'Certified' | 'Completed' | 'Revoked';
export type NoeStatus = 'Pending' | 'Submitted' | 'ManualOverride' | 'Late';
export type NoeSubmissionMode = 'Clearinghouse' | 'Manual';

export interface HospiceElectionPeriod {
  id: number;
  periodNumber: number;
  startDate: string;
  endDate: string;
  status: HospicePeriodStatus;
  recertDueDate: string;
  daysUntilRecertDue: number;
  certificationId: number | null;
}

export interface NoticeOfElection {
  id: number;
  status: NoeStatus;
  deadlineDate: string;
  daysUntilDeadline: number;
  submittedAt: string | null;
  documentUrl: string | null;
  clearinghouseConfirmation: string | null;
  payerCode: string;
}

export interface HospiceElection {
  id: number;
  patientId: number;
  admissionId: number | null;
  electionDate: string;
  electionType: HospiceElectionType;
  lifetimeDaysAtElection: number;
  status: HospiceElectionStatus;
  revokedAt: string | null;
  currentPeriod: HospiceElectionPeriod | null;
  noe: NoticeOfElection | null;
}

export interface HospiceRevocation {
  id: number;
  electionId: number;
  revocationDate: string;
  reason: string | null;
  filedWithCms: boolean;
  filedAt: string | null;
}

export interface WorkQueueItem {
  type: 'RecertDue' | 'NoeOverdue';
  electionId: number;
  patientId: number;
  patientName: string;
  dueDate: string;
  daysUntilDue: number | null;
  daysOverdue: number | null;
  periodNumber: number | null;
}

export interface CreateElectionRequest {
  patientId: number;
  admissionId: number | null;
  electionDate: string;
  payerCode: string;
}

export interface RevokeRequest {
  revocationDate: string;
  reason: string | null;
}

export interface SubmitNoeRequest {
  mode: NoeSubmissionMode;
  manualDocumentUrl: string | null;
}

export interface WorkQueueResponse {
  recertsDue: WorkQueueItem[];
  noeOverdue: WorkQueueItem[];
  hopeOverdue: WorkQueueItem[];
  idgOverdue: WorkQueueItem[];
  carePlanReviewsDue: WorkQueueItem[];
}

export const createElection = (req: CreateElectionRequest): Promise<HospiceElection> =>
  apiClient.post<HospiceElection>('/hospice/elections', req).then((r) => r.data);

export const getElection = (id: number): Promise<HospiceElection> =>
  apiClient.get<HospiceElection>(`/hospice/elections/${id}`).then((r) => r.data);

export const getPatientElections = (
  patientId: number,
): Promise<{ data: HospiceElection[] }> =>
  apiClient
    .get<{ data: HospiceElection[] }>(`/hospice/patients/${patientId}/elections`)
    .then((r) => r.data);

export const getActiveElections = (): Promise<{ data: HospiceElection[] }> =>
  apiClient
    .get<{ data: HospiceElection[] }>('/hospice/elections/active')
    .then((r) => r.data);

export const revokeElection = (
  id: number,
  req: RevokeRequest,
): Promise<HospiceRevocation> =>
  apiClient
    .post<HospiceRevocation>(`/hospice/elections/${id}/revoke`, req)
    .then((r) => r.data);

export const getRevocation = (id: number): Promise<HospiceRevocation> =>
  apiClient
    .get<HospiceRevocation>(`/hospice/elections/${id}/revocation`)
    .then((r) => r.data);

export const submitNoe = (
  id: number,
  req: SubmitNoeRequest,
): Promise<NoticeOfElection> =>
  apiClient
    .post<NoticeOfElection>(`/hospice/elections/${id}/noe/submit`, req)
    .then((r) => r.data);

export const getNoe = (id: number): Promise<NoticeOfElection> =>
  apiClient.get<NoticeOfElection>(`/hospice/elections/${id}/noe`).then((r) => r.data);

export const getWorkQueue = (): Promise<WorkQueueResponse> =>
  apiClient.get<WorkQueueResponse>('/hospice/work-queue').then((r) => r.data);

// ─── Sub-system B: Per-Diem Billing ────────────────────────────────────────

export type HospiceLevelOfCare =
  | 'RoutineHomeCare'
  | 'ContinuousHomeCare'
  | 'InpatientRespiteCare'
  | 'GeneralInpatient';

export type HospicePerDiemRateTier =
  | 'NotApplicable'
  | 'RoutineTier1Days1To60'
  | 'RoutineTier2Days61Plus';

export type HospicePerDiemRateUnit = 'Day' | 'Hour';

export interface HospiceAttendanceDay {
  id: number;
  hospiceElectionId: number;
  serviceDate: string;
  levelOfCare: HospiceLevelOfCare;
  chcHoursOfCare: number | null;
  primaryNurseUserId: number | null;
  facilityName: string | null;
  notes: string | null;
  claimId: number | null;
  recordedAt: string;
  recordedByUserId: number;
}

export interface HospicePerDiemRate {
  id: number;
  organizationId: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  levelOfCare: HospiceLevelOfCare;
  tier: HospicePerDiemRateTier;
  rateUnit: HospicePerDiemRateUnit;
  perDiemAmount: number;
  source: string;
}

export interface HospicePerDiemClaimLine {
  levelOfCare: HospiceLevelOfCare;
  tier: HospicePerDiemRateTier;
  revenueCode: string;
  units: number;
  unitAmount: number;
  lineCharges: number;
  serviceDateFrom: string;
  serviceDateTo: string;
}

export interface HospicePerDiemClaimDraft {
  claimId: number;
  claimNumber: string;
  totalCharges: number;
  lines: HospicePerDiemClaimLine[];
  attendanceDayIds: number[];
  warnings: string[];
}

export interface RecordAttendanceRequest {
  serviceDate: string;
  levelOfCare: HospiceLevelOfCare;
  chcHoursOfCare: number | null;
  primaryNurseUserId: number | null;
  facilityName: string | null;
  notes: string | null;
}

export interface UpdateAttendanceRequest {
  levelOfCare: HospiceLevelOfCare;
  chcHoursOfCare: number | null;
  primaryNurseUserId: number | null;
  facilityName: string | null;
  notes: string | null;
}

export interface BuildPerDiemClaimRequest {
  from: string;
  to: string;
}

export const recordAttendance = (
  electionId: number,
  req: RecordAttendanceRequest,
): Promise<HospiceAttendanceDay> =>
  apiClient
    .post<HospiceAttendanceDay>(`/hospice/elections/${electionId}/attendance`, req)
    .then((r) => r.data);

export const getAttendance = (
  electionId: number,
  params?: { from?: string; to?: string; page?: number; pageSize?: number },
): Promise<{ data: HospiceAttendanceDay[]; total: number }> =>
  apiClient
    .get<{ data: HospiceAttendanceDay[]; total: number }>(
      `/hospice/elections/${electionId}/attendance`,
      { params },
    )
    .then((r) => r.data);

export const updateAttendance = (
  id: number,
  req: UpdateAttendanceRequest,
): Promise<HospiceAttendanceDay> =>
  apiClient
    .put<HospiceAttendanceDay>(`/hospice/attendance/${id}`, req)
    .then((r) => r.data);

export const deleteAttendance = (id: number): Promise<void> =>
  apiClient.delete<void>(`/hospice/attendance/${id}`).then((r) => r.data);

export const buildPerDiemClaim = (
  electionId: number,
  req: BuildPerDiemClaimRequest,
): Promise<HospicePerDiemClaimDraft> =>
  apiClient
    .post<HospicePerDiemClaimDraft>(`/hospice/elections/${electionId}/per-diem-claim`, req)
    .then((r) => r.data);

export const getPerDiemRates = (
  asOf?: string,
): Promise<{ data: HospicePerDiemRate[]; asOf: string }> =>
  apiClient
    .get<{ data: HospicePerDiemRate[]; asOf: string }>(`/hospice/per-diem-rates`, {
      params: asOf ? { as_of: asOf } : undefined,
    })
    .then((r) => r.data);

// ─── Sub-system C: Clinical Operations ─────────────────────────────────────

export type HopeSubmissionType =
  | 'Admission'
  | 'Update'
  | 'Recertification'
  | 'Discharge';

export type HopeAssessmentStatus =
  | 'Draft'
  | 'Signed'
  | 'Submitted'
  | 'Accepted'
  | 'Rejected';

export type CarePlanReviewOutcome =
  | 'NoChange'
  | 'MinorRevision'
  | 'MajorRevision'
  | 'Discontinued';

export type IdgMeetingStatus = 'Scheduled' | 'Completed' | 'Cancelled';

export type HospiceCertificationStatus = 'Draft' | 'Signed' | 'Countersigned';

export interface HopeAssessment {
  id: number;
  hospiceElectionId: number;
  submissionType: HopeSubmissionType;
  targetDate: string;
  status: HopeAssessmentStatus;
  payload: string;
  schemaVersion: string;
  signedByUserId: number | null;
  signedAt: string | null;
  submittedAt: string | null;
  cmsConfirmation: string | null;
  rejectionReason: string | null;
  deadlineDate: string;
  daysUntilDeadline: number;
  createdAt: string;
}

export interface IdgAttendee {
  userId: number;
  role: string;
}

export interface IdgMeeting {
  id: number;
  meetingDate: string;
  hospiceElectionId: number | null;
  facilitatorUserId: number | null;
  status: IdgMeetingStatus;
  attendees: string;
  patientsReviewed: string;
  notes: string | null;
  actionItems: string | null;
  nextMeetingDate: string | null;
}

export interface CarePlanReview {
  id: number;
  carePlanId: number;
  idgMeetingId: number | null;
  reviewDate: string;
  reviewedByUserId: number;
  outcome: CarePlanReviewOutcome;
  changesSummary: string | null;
  nextReviewDate: string;
  createdAt: string;
}

export interface HospiceCertification {
  id: number;
  electionId: number;
  periodId: number;
  certifyingPhysicianId: number;
  status: HospiceCertificationStatus;
  signedAt: string | null;
  narrativeText: string | null;
  createdAt: string;
}

export interface SiaResult {
  electionId: number;
  deathDate: string;
  windowFrom: string;
  windowTo: string;
  qualifyingDayCount: number;
  units: number;
  perVisitRate: number;
  charges: number;
  qualifyingVisitNoteIds: number[];
}

export interface StartHopeRequest {
  submissionType: HopeSubmissionType;
  targetDate: string;
  initialPayload: string | null;
}

export interface UpdateHopePayloadRequest {
  payload: string;
}

export interface ScheduleIdgRequest {
  meetingDate: string;
  hospiceElectionId: number | null;
  facilitatorUserId: number | null;
  attendees: IdgAttendee[];
  patientsReviewed: number[] | null;
  notes: string | null;
}

export interface CompleteIdgRequest {
  patientsReviewed: number[] | null;
  notes: string | null;
  actionItems: string | null;
  nextMeetingDate: string | null;
}

export interface RecordCarePlanReviewRequest {
  reviewDate: string;
  idgMeetingId: number | null;
  outcome: CarePlanReviewOutcome;
  changesSummary: string | null;
}

export interface StartCertRequest {
  certifyingPhysicianId: number;
  narrativeText: string | null;
}

// HOPE
export const startHopeAssessment = (
  electionId: number,
  req: StartHopeRequest,
): Promise<HopeAssessment> =>
  apiClient
    .post<HopeAssessment>(`/hospice/elections/${electionId}/hope`, req)
    .then((r) => r.data);

export const listHopeByElection = (
  electionId: number,
): Promise<{ data: HopeAssessment[] }> =>
  apiClient
    .get<{ data: HopeAssessment[] }>(`/hospice/elections/${electionId}/hope`)
    .then((r) => r.data);

export const getHopeAssessment = (assessmentId: number): Promise<HopeAssessment> =>
  apiClient.get<HopeAssessment>(`/hospice/hope/${assessmentId}`).then((r) => r.data);

export const updateHopePayload = (
  assessmentId: number,
  req: UpdateHopePayloadRequest,
): Promise<HopeAssessment> =>
  apiClient
    .put<HopeAssessment>(`/hospice/hope/${assessmentId}/payload`, req)
    .then((r) => r.data);

export const signHopeAssessment = (assessmentId: number): Promise<HopeAssessment> =>
  apiClient
    .post<HopeAssessment>(`/hospice/hope/${assessmentId}/sign`, {})
    .then((r) => r.data);

export const submitHopeAssessment = (assessmentId: number): Promise<HopeAssessment> =>
  apiClient
    .post<HopeAssessment>(`/hospice/hope/${assessmentId}/submit`, {})
    .then((r) => r.data);

export const listHopeOverdue = (): Promise<{ data: HopeAssessment[] }> =>
  apiClient
    .get<{ data: HopeAssessment[] }>(`/hospice/hope/overdue`)
    .then((r) => r.data);

// IDG
export const scheduleIdgMeeting = (req: ScheduleIdgRequest): Promise<IdgMeeting> =>
  apiClient.post<IdgMeeting>(`/hospice/idg-meetings`, req).then((r) => r.data);

export const listUpcomingIdg = (params?: {
  electionId?: number;
  upTo?: string;
}): Promise<{ data: IdgMeeting[] }> =>
  apiClient
    .get<{ data: IdgMeeting[] }>(`/hospice/idg-meetings/upcoming`, { params })
    .then((r) => r.data);

export const getIdgMeeting = (meetingId: number): Promise<IdgMeeting> =>
  apiClient.get<IdgMeeting>(`/hospice/idg-meetings/${meetingId}`).then((r) => r.data);

export const completeIdgMeeting = (
  meetingId: number,
  req: CompleteIdgRequest,
): Promise<IdgMeeting> =>
  apiClient
    .post<IdgMeeting>(`/hospice/idg-meetings/${meetingId}/complete`, req)
    .then((r) => r.data);

export const cancelIdgMeeting = (
  meetingId: number,
  reason: string,
): Promise<IdgMeeting> =>
  apiClient
    .post<IdgMeeting>(`/hospice/idg-meetings/${meetingId}/cancel`, { reason })
    .then((r) => r.data);

// CarePlan reviews
export const recordCarePlanReview = (
  carePlanId: number,
  req: RecordCarePlanReviewRequest,
): Promise<CarePlanReview> =>
  apiClient
    .post<CarePlanReview>(`/hospice/care-plans/${carePlanId}/reviews`, req)
    .then((r) => r.data);

export const listCarePlanReviews = (
  carePlanId: number,
): Promise<{ data: CarePlanReview[] }> =>
  apiClient
    .get<{ data: CarePlanReview[] }>(`/hospice/care-plans/${carePlanId}/reviews`)
    .then((r) => r.data);

// Certifications
export const startCertification = (
  electionId: number,
  periodId: number,
  req: StartCertRequest,
): Promise<HospiceCertification> =>
  apiClient
    .post<HospiceCertification>(
      `/hospice/elections/${electionId}/periods/${periodId}/certifications`,
      req,
    )
    .then((r) => r.data);

export const signCertification = (certId: number): Promise<HospiceCertification> =>
  apiClient
    .post<HospiceCertification>(`/hospice/certifications/${certId}/sign`, {})
    .then((r) => r.data);

export const countersignCertification = (
  certId: number,
  countersigningPhysicianId: number,
): Promise<HospiceCertification> =>
  apiClient
    .post<HospiceCertification>(`/hospice/certifications/${certId}/countersign`, {
      countersigningPhysicianId,
    })
    .then((r) => r.data);

export const listCertificationsByElection = (
  electionId: number,
): Promise<{ data: HospiceCertification[] }> =>
  apiClient
    .get<{ data: HospiceCertification[] }>(
      `/hospice/elections/${electionId}/certifications`,
    )
    .then((r) => r.data);

// SIA preview
export const previewSia = (electionId: number): Promise<SiaResult | null> =>
  apiClient
    .get<SiaResult>(`/hospice/elections/${electionId}/sia-preview`)
    .then((r) => r.data)
    .catch((err) => {
      // 204 No Content → no qualifying visits → null
      if (err?.response?.status === 204) return null;
      throw err;
    });

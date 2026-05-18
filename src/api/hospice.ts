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
  type:
    | 'RecertDue'
    | 'NoeOverdue'
    | 'HopeOverdue'
    | 'IdgOverdue'
    | 'CarePlanReviewDue';
  electionId: number;
  patientId: number;
  patientName: string;
  dueDate: string;
  daysUntilDue: number | null;
  daysOverdue: number | null;
  periodNumber: number | null;
}

export interface BereavementQueueItem {
  type: 'BereavementFollowUp' | 'BereavementOverdueContact';
  programId: number;
  patientId: number;
  patientName: string;
  dueDate: string;
  daysUntilDue: number | null;
  daysOverdue: number | null;
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
  bereavementFollowUps: BereavementQueueItem[];
  bereavementOverdueContact: BereavementQueueItem[];
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

// ─── Sub-system D: Bereavement ─────────────────────────────────────────────

export type BereavementProgramStatus = 'Active' | 'Completed' | 'Closed';
export type BereavementContactRelationship =
  | 'Spouse'
  | 'Child'
  | 'Parent'
  | 'Sibling'
  | 'Friend'
  | 'Other';
export type BereavementContactPreference = 'Phone' | 'Email' | 'Mail' | 'InPerson';
export type BereavementEncounterType =
  | 'Phone'
  | 'Visit'
  | 'GroupSession'
  | 'Letter'
  | 'Card'
  | 'Email'
  | 'Other';
export type BereavementRiskLevel = 'Low' | 'Moderate' | 'High';

export interface BereavementProgram {
  id: number;
  patientId: number;
  dateOfDeath: string;
  programEndDate: string;
  daysUntilProgramEnd: number;
  status: BereavementProgramStatus;
  coordinatorUserId: number | null;
  initialAssessmentDate: string | null;
  initialRiskLevel: string | null;
  riskHistory: string;
  closureReason: string | null;
  createdAt: string;
}

export interface BereavementContact {
  id: number;
  bereavementProgramId: number;
  firstName: string;
  lastName: string;
  relationship: string;
  contactPreference: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  isPrimaryContact: boolean;
  optedOut: boolean;
  optedOutAt: string | null;
  notes: string | null;
}

export interface BereavementEncounter {
  id: number;
  bereavementProgramId: number;
  contactId: number | null;
  encounterDate: string;
  encounterType: string;
  durationMinutes: number | null;
  clinicianUserId: number;
  notes: string;
  followUpRequired: boolean;
  followUpByDate: string | null;
  createdAt: string;
}

export interface StartBereavementProgramRequest {
  dateOfDeath: string;
  coordinatorUserId: number | null;
}

export interface AddRiskAssessmentRequest {
  riskLevel: BereavementRiskLevel;
  factors: string[] | null;
  notes: string | null;
}

export interface AddContactRequest {
  firstName: string;
  lastName: string;
  relationship: BereavementContactRelationship;
  contactPreference: BereavementContactPreference;
  phone: string | null;
  email: string | null;
  address: string | null;
  isPrimaryContact: boolean;
  notes: string | null;
}

export interface UpdateContactRequest {
  firstName: string;
  lastName: string;
  relationship: BereavementContactRelationship;
  contactPreference: BereavementContactPreference;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
}

export interface RecordEncounterRequest {
  contactId: number | null;
  encounterDate: string;
  encounterType: BereavementEncounterType;
  durationMinutes: number | null;
  notes: string;
  followUpRequired: boolean;
  followUpByDate: string | null;
}

export interface UpdateEncounterRequest {
  contactId: number | null;
  encounterType: BereavementEncounterType;
  durationMinutes: number | null;
  notes: string;
  followUpRequired: boolean;
  followUpByDate: string | null;
}

// Programs
export const startBereavementProgram = (
  patientId: number,
  req: StartBereavementProgramRequest,
): Promise<BereavementProgram> =>
  apiClient
    .post<BereavementProgram>('/hospice/bereavement/programs', req, {
      params: { patientId },
    })
    .then((r) => r.data);

export const listBereavementPrograms = (
  status?: BereavementProgramStatus,
): Promise<{ data: BereavementProgram[] }> =>
  apiClient
    .get<{ data: BereavementProgram[] }>('/hospice/bereavement/programs', {
      params: status ? { status } : undefined,
    })
    .then((r) => r.data);

export const getBereavementProgram = (id: number): Promise<BereavementProgram> =>
  apiClient
    .get<BereavementProgram>(`/hospice/bereavement/programs/${id}`)
    .then((r) => r.data);

export const completeBereavementProgram = (
  id: number,
): Promise<BereavementProgram> =>
  apiClient
    .post<BereavementProgram>(`/hospice/bereavement/programs/${id}/complete`, {})
    .then((r) => r.data);

export const closeBereavementProgram = (
  id: number,
  reason: string,
): Promise<BereavementProgram> =>
  apiClient
    .post<BereavementProgram>(`/hospice/bereavement/programs/${id}/close`, { reason })
    .then((r) => r.data);

export const addRiskAssessment = (
  programId: number,
  req: AddRiskAssessmentRequest,
): Promise<BereavementProgram> =>
  apiClient
    .post<BereavementProgram>(
      `/hospice/bereavement/programs/${programId}/risk-assessments`,
      req,
    )
    .then((r) => r.data);

export const listEligibleForCompletion = (): Promise<{ data: BereavementProgram[] }> =>
  apiClient
    .get<{ data: BereavementProgram[] }>(
      '/hospice/bereavement/programs/eligible-for-completion',
    )
    .then((r) => r.data);

// Contacts
export const createBereavementContact = (
  programId: number,
  req: AddContactRequest,
): Promise<BereavementContact> =>
  apiClient
    .post<BereavementContact>(
      `/hospice/bereavement/programs/${programId}/contacts`,
      req,
    )
    .then((r) => r.data);

export const listBereavementContacts = (
  programId: number,
): Promise<{ data: BereavementContact[] }> =>
  apiClient
    .get<{ data: BereavementContact[] }>(
      `/hospice/bereavement/programs/${programId}/contacts`,
    )
    .then((r) => r.data);

export const updateBereavementContact = (
  contactId: number,
  req: UpdateContactRequest,
): Promise<BereavementContact> =>
  apiClient
    .put<BereavementContact>(`/hospice/bereavement/contacts/${contactId}`, req)
    .then((r) => r.data);

export const setPrimaryContact = (
  contactId: number,
): Promise<BereavementContact> =>
  apiClient
    .post<BereavementContact>(
      `/hospice/bereavement/contacts/${contactId}/set-primary`,
      {},
    )
    .then((r) => r.data);

export const optOutContact = (
  contactId: number,
  reason: string | null,
): Promise<BereavementContact> =>
  apiClient
    .post<BereavementContact>(
      `/hospice/bereavement/contacts/${contactId}/opt-out`,
      { reason },
    )
    .then((r) => r.data);

export const deleteBereavementContact = (contactId: number): Promise<void> =>
  apiClient.delete<void>(`/hospice/bereavement/contacts/${contactId}`).then((r) => r.data);

// Encounters
export const recordBereavementEncounter = (
  programId: number,
  req: RecordEncounterRequest,
): Promise<BereavementEncounter> =>
  apiClient
    .post<BereavementEncounter>(
      `/hospice/bereavement/programs/${programId}/encounters`,
      req,
    )
    .then((r) => r.data);

export const listBereavementEncounters = (
  programId: number,
  type?: BereavementEncounterType,
): Promise<{ data: BereavementEncounter[] }> =>
  apiClient
    .get<{ data: BereavementEncounter[] }>(
      `/hospice/bereavement/programs/${programId}/encounters`,
      { params: type ? { type } : undefined },
    )
    .then((r) => r.data);

export const updateBereavementEncounter = (
  encounterId: number,
  req: UpdateEncounterRequest,
): Promise<BereavementEncounter> =>
  apiClient
    .put<BereavementEncounter>(`/hospice/bereavement/encounters/${encounterId}`, req)
    .then((r) => r.data);

export const deleteBereavementEncounter = (encounterId: number): Promise<void> =>
  apiClient
    .delete<void>(`/hospice/bereavement/encounters/${encounterId}`)
    .then((r) => r.data);

export const listBereavementFollowUpsDue = (): Promise<{ data: BereavementEncounter[] }> =>
  apiClient
    .get<{ data: BereavementEncounter[] }>('/hospice/bereavement/follow-ups/due')
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

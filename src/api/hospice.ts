import { apiClient } from '@/api/client';

export type HospiceElectionStatus = 'Active' | 'Revoked' | 'Expired' | 'Discharged';
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
    | 'CarePlanReviewDue'
    | 'AddendumDue'
    | 'NotrOverdue'
    | 'FtfDue';
  electionId: number;
  patientId: number;
  patientName: string;
  dueDate: string;
  daysUntilDue: number | null;
  daysOverdue: number | null;
  periodNumber: number | null;
}

export interface DischargeTaskQueueItem {
  type: 'DischargeTaskDue';
  dischargeId: number;
  electionId: number;
  patientId: number;
  patientName: string;
  taskType: string;
  taskTitle: string;
  dueDate: string;
  daysUntilDue: number | null;
}

export interface SurveyRiskDischargeQueueItem {
  type: 'SurveyRiskDischarge';
  dischargeId: number;
  electionId: number;
  patientId: number;
  patientName: string;
  reason: string;
  effectiveDate: string;
  surveyRiskFlags: string[];
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
  addendumDue: WorkQueueItem[];
  notrOverdue: WorkQueueItem[];
  ftfDue: WorkQueueItem[];
  dischargeTasksDue?: DischargeTaskQueueItem[];
  surveyRiskDischarges?: SurveyRiskDischargeQueueItem[];
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
  prepBriefText?: string | null;
  prepBriefGeneratedAtUtc?: string | null;
}

export interface IdgPrepBriefResult {
  id: number;
  prepBriefText: string;
  prepBriefGeneratedAtUtc: string;
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

export const generateIdgPrepBrief = (meetingId: number): Promise<IdgPrepBriefResult> =>
  apiClient
    .post<{ data: IdgPrepBriefResult }>(`/hospice/idg-meetings/${meetingId}/prep-brief`)
    .then((r) => r.data.data);

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

// ─── Regulatory: Election Statement Addendum (42 CFR 418.24(c)) ─────────────

export type HospiceElectionAddendumStatus =
  | 'Draft'
  | 'Issued'
  | 'Acknowledged'
  | 'RefusedToSign'
  | 'Superseded';

export interface HospiceElectionAddendumItem {
  category: string;
  description: string;
  clinicalExplanation: string;
  relatedCondition: string | null;
}

export interface HospiceElectionAddendum {
  id: number;
  electionId: number;
  version: number;
  status: HospiceElectionAddendumStatus;
  issuedDate: string | null;
  issuedByUserId: number | null;
  supersededByAddendumId: number | null;
  items: HospiceElectionAddendumItem[];
  acknowledgedBySignerName: string | null;
  acknowledgedBySignerRelationship: string | null;
  acknowledgedAt: string | null;
  refusalReason: string | null;
  hospiceContactInfo: string | null;
  createdAt: string;
}

export interface DraftAddendumRequest {
  items: HospiceElectionAddendumItem[];
  hospiceContactInfo: string | null;
}

export interface IssueAddendumRequest {
  issuedDate: string;
  hospiceContactInfo: string | null;
}

export interface AcknowledgeAddendumRequest {
  signerName: string;
  signerRelationship: string | null;
  acknowledgedAt: string;
}

export interface RefuseAddendumRequest {
  reason: string;
  refusedAt: string;
}

export interface ReviseAddendumRequest {
  items: HospiceElectionAddendumItem[];
  hospiceContactInfo: string | null;
  issuedDate: string;
}

export const listAddenda = (
  electionId: number,
): Promise<{ data: HospiceElectionAddendum[] }> =>
  apiClient
    .get<{ data: HospiceElectionAddendum[] }>(`/hospice/elections/${electionId}/addenda`)
    .then((r) => r.data);

export const getCurrentAddendum = (
  electionId: number,
): Promise<HospiceElectionAddendum | null> =>
  apiClient
    .get<HospiceElectionAddendum>(`/hospice/elections/${electionId}/addenda/current`)
    .then((r) => r.data)
    .catch((err) => {
      // 204 No Content → no addendum yet → null
      if (err?.response?.status === 204) return null;
      throw err;
    });

export const getAddendum = (addendumId: number): Promise<HospiceElectionAddendum> =>
  apiClient
    .get<HospiceElectionAddendum>(`/hospice/addenda/${addendumId}`)
    .then((r) => r.data);

export const draftAddendum = (
  electionId: number,
  req: DraftAddendumRequest,
): Promise<HospiceElectionAddendum> =>
  apiClient
    .post<HospiceElectionAddendum>(`/hospice/elections/${electionId}/addenda`, req)
    .then((r) => r.data);

export const issueAddendum = (
  addendumId: number,
  req: IssueAddendumRequest,
): Promise<HospiceElectionAddendum> =>
  apiClient
    .post<HospiceElectionAddendum>(`/hospice/addenda/${addendumId}/issue`, req)
    .then((r) => r.data);

export const acknowledgeAddendum = (
  addendumId: number,
  req: AcknowledgeAddendumRequest,
): Promise<HospiceElectionAddendum> =>
  apiClient
    .post<HospiceElectionAddendum>(`/hospice/addenda/${addendumId}/acknowledge`, req)
    .then((r) => r.data);

export const refuseAddendum = (
  addendumId: number,
  req: RefuseAddendumRequest,
): Promise<HospiceElectionAddendum> =>
  apiClient
    .post<HospiceElectionAddendum>(`/hospice/addenda/${addendumId}/refuse`, req)
    .then((r) => r.data);

export const reviseAddendum = (
  electionId: number,
  req: ReviseAddendumRequest,
): Promise<HospiceElectionAddendum> =>
  apiClient
    .post<HospiceElectionAddendum>(`/hospice/elections/${electionId}/addenda/revise`, req)
    .then((r) => r.data);

// ─── Regulatory: Notice of Termination/Revocation (NOTR) ────────────────────

export type NotrTerminationReason = 'Revocation' | 'Transfer' | 'Discharge' | 'Death';
export type NotrStatus = 'Pending' | 'Submitted' | 'ManualOverride' | 'Late';

export interface NoticeOfTerminationOrRevocation {
  id: number;
  electionId: number;
  reason: NotrTerminationReason;
  eventDate: string;
  deadlineDate: string;
  daysUntilDeadline: number;
  status: NotrStatus;
  submittedAt: string | null;
  clearinghouseConfirmation: string | null;
  documentUrl: string | null;
  payerCode: string;
  notes: string | null;
  createdAt: string;
}

export interface CreateNotrCommand {
  reason: NotrTerminationReason;
  eventDate: string;
  payerCode: string;
  notes: string | null;
}

export interface SubmitNotrCommand {
  mode: NoeSubmissionMode;
  manualDocumentUrl: string | null;
}

export const getNotrForElection = (
  electionId: number,
): Promise<NoticeOfTerminationOrRevocation | null> =>
  apiClient
    .get<NoticeOfTerminationOrRevocation>(`/hospice/elections/${electionId}/notr`)
    .then((r) => r.data)
    .catch((err) => {
      if (err?.response?.status === 204) return null;
      throw err;
    });

export const createNotr = (
  electionId: number,
  cmd: CreateNotrCommand,
): Promise<NoticeOfTerminationOrRevocation> =>
  apiClient
    .post<NoticeOfTerminationOrRevocation>(`/hospice/elections/${electionId}/notr`, cmd)
    .then((r) => r.data);

export const submitNotr = (
  notrId: number,
  cmd: SubmitNotrCommand,
): Promise<NoticeOfTerminationOrRevocation> =>
  apiClient
    .post<NoticeOfTerminationOrRevocation>(`/hospice/notr/${notrId}/submit`, cmd)
    .then((r) => r.data);

// ─── Regulatory: Face-to-Face recert encounter (42 CFR 418.22(a)(4)) ────────

export type FtfClinicianType = 'Physician' | 'NursePractitioner';

export interface HospiceFaceToFaceEncounter {
  id: number;
  electionId: number;
  periodId: number;
  periodNumber: number;
  encounterDate: string;
  clinicianUserId: number;
  clinicianType: FtfClinicianType;
  attestationText: string;
  createdAt: string;
}

export interface RecordFtfRequest {
  periodId: number;
  encounterDate: string;
  clinicianUserId: number;
  clinicianType: FtfClinicianType;
  attestationText: string;
}

export const recordFtf = (
  electionId: number,
  req: RecordFtfRequest,
): Promise<HospiceFaceToFaceEncounter> =>
  apiClient
    .post<HospiceFaceToFaceEncounter>(`/hospice/elections/${electionId}/ftf`, req)
    .then((r) => r.data);

export const getFtfForPeriod = (
  periodId: number,
): Promise<HospiceFaceToFaceEncounter | null> =>
  apiClient
    .get<HospiceFaceToFaceEncounter>(`/hospice/periods/${periodId}/ftf`)
    .then((r) => r.data)
    .catch((err) => {
      if (err?.response?.status === 204) return null;
      throw err;
    });

export const listFtfForElection = (
  electionId: number,
): Promise<{ data: HospiceFaceToFaceEncounter[] }> =>
  apiClient
    .get<{ data: HospiceFaceToFaceEncounter[] }>(`/hospice/elections/${electionId}/ftf`)
    .then((r) => r.data);

// ─── Regulatory: HQRP timeliness (90% HOPE within 30 days) ──────────────────

export interface HqrpTimelinessSummary {
  from: string;
  to: string;
  totalAssessments: number;
  onTimeCount: number;
  lateCount: number;
  notYetSubmittedCount: number;
  rejectedCount: number;
  timelinessPercentage: number;
  meetsThreshold: boolean;
  thresholdPercentage: number;
}

export interface HqrpLateAssessment {
  id: number;
  hospiceElectionId: number;
  patientId: number;
  patientName: string;
  submissionType: string;
  targetDate: string;
  deadlineDate: string;
  submittedAt: string | null;
  daysLate: number;
  status: string;
}

export interface HqrpTimelinessReport {
  summary: HqrpTimelinessSummary;
  lateOrPending: HqrpLateAssessment[];
}

export const getHqrpTimeliness = (
  from: string,
  to: string,
): Promise<HqrpTimelinessReport> =>
  apiClient
    .get<HqrpTimelinessReport>(`/hospice/hqrp/timeliness`, { params: { from, to } })
    .then((r) => r.data);

// ─── Regulatory: Medicare hospice cap reconciliation (42 CFR 418.309) ───────

export interface MedicareCapBeneficiary {
  patientId: number;
  patientName: string;
  electionDaysInCapYear: number;
  paidInCapYear: number;
  capAllowance: number;
  excessLiability: number;
}

export interface MedicareCapReconciliation {
  capYear: number;
  capYearFrom: string;
  capYearTo: string;
  capAmountPerBeneficiary: number;
  methodology: string;
  beneficiaryCount: number;
  totalPaidInCapYear: number;
  totalCapAllowance: number;
  totalExcessLiability: number;
  beneficiaries: MedicareCapBeneficiary[];
  caveats: string[];
}

export const getMedicareCapReconciliation = (
  capYear: number,
): Promise<MedicareCapReconciliation> =>
  apiClient
    .get<MedicareCapReconciliation>(
      `/hospice/medicare-cap/reconciliation/${capYear}`,
    )
    .then((r) => r.data);

// ─── Hospice volunteers (42 CFR 418.78 — 5% rule) ──────────────────────────

export type VolunteerActivityType =
  | 'DirectPatientCare'
  | 'Administrative'
  | 'Excluded';

export interface HospiceVolunteer {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  orientationCompletedDate: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
}

export interface HospiceVolunteerHoursLog {
  id: number;
  volunteerId: number;
  volunteerName: string;
  serviceDate: string;
  hours: number;
  activityType: string;
  description: string | null;
  patientId: number | null;
  createdAt: string;
}

export interface CreateVolunteerRequest {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  orientationCompletedDate: string | null;
  notes: string | null;
}

export interface UpdateVolunteerRequest {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  orientationCompletedDate: string | null;
  isActive: boolean;
  notes: string | null;
}

export interface LogVolunteerHoursRequest {
  volunteerId: number;
  serviceDate: string;
  hours: number;
  activityType: VolunteerActivityType;
  description: string | null;
  patientId: number | null;
}

export interface VolunteerComplianceReport {
  from: string;
  to: string;
  totalQualifyingVolunteerHours: number;
  excludedVolunteerHours: number;
  paidPatientCareHours: number;
  compliancePercentage: number;
  meetsThreshold: boolean;
  thresholdPercentage: number;
  volunteerCount: number;
  caveats: string[];
}

export const listVolunteers = (
  activeOnly: boolean,
): Promise<{ data: HospiceVolunteer[] }> =>
  apiClient
    .get<{ data: HospiceVolunteer[] }>('/hospice/volunteers', {
      params: { activeOnly },
    })
    .then((r) => r.data);

export const createVolunteer = (
  req: CreateVolunteerRequest,
): Promise<HospiceVolunteer> =>
  apiClient
    .post<HospiceVolunteer>('/hospice/volunteers', req)
    .then((r) => r.data);

export const updateVolunteer = (
  id: number,
  req: UpdateVolunteerRequest,
): Promise<HospiceVolunteer> =>
  apiClient
    .put<HospiceVolunteer>(`/hospice/volunteers/${id}`, req)
    .then((r) => r.data);

export const logVolunteerHours = (
  req: LogVolunteerHoursRequest,
): Promise<HospiceVolunteerHoursLog> =>
  apiClient
    .post<HospiceVolunteerHoursLog>('/hospice/volunteers/hours', req)
    .then((r) => r.data);

export const listVolunteerHours = (
  from: string,
  to: string,
): Promise<{ data: HospiceVolunteerHoursLog[] }> =>
  apiClient
    .get<{ data: HospiceVolunteerHoursLog[] }>('/hospice/volunteers/hours', {
      params: { from, to },
    })
    .then((r) => r.data);

/**
 * Get the volunteer compliance report. When `paidPatientCareHoursOverride` is
 * undefined or 0, the backend auto-computes the denominator from paid-time logs
 * (PatientCare activity in the window). Pass a positive value to override with
 * a payroll-derived total.
 */
export const getVolunteerCompliance = (
  from: string,
  to: string,
  paidPatientCareHoursOverride?: number,
): Promise<VolunteerComplianceReport> => {
  const params: Record<string, string | number> = { from, to };
  if (
    paidPatientCareHoursOverride !== undefined
    && paidPatientCareHoursOverride > 0
  ) {
    params.paidPatientCareHours = paidPatientCareHoursOverride;
  }
  return apiClient
    .get<VolunteerComplianceReport>('/hospice/volunteers/compliance', { params })
    .then((r) => r.data);
};

// ─── Reg-7: CAHPS Hospice Survey ───────────────────────────────────────────

export type CahpsCaseStatus =
  | 'Pending'
  | 'Eligible'
  | 'Ineligible'
  | 'SubmittedToVendor'
  | 'Excluded';

export interface HospiceCahpsCase {
  id: number;
  patientId: number;
  hospiceElectionId: number;
  dateOfDeath: string;
  admittedAt: string;
  daysOnHospice: number;
  ageAtDeath: number;
  status: CahpsCaseStatus;
  ineligibleReason: string | null;
  exclusionReason: string | null;
  caregiverName: string | null;
  caregiverAddress: string | null;
  caregiverPhone: string | null;
  caregiverIsFamilial: boolean | null;
  submittedToVendorAt: string | null;
  vendorName: string | null;
  vendorConfirmation: string | null;
  notes: string | null;
  createdAt: string;
}

export interface EnsureCahpsCaseRequest {
  patientId: number;
  hospiceElectionId: number;
  dateOfDeath: string;
  admittedAt: string;
  ageAtDeath: number;
}

export interface UpdateCaregiverRequest {
  caregiverName: string | null;
  caregiverAddress: string | null;
  caregiverPhone: string | null;
  caregiverIsFamilial: boolean | null;
  notes: string | null;
}

export interface SubmitToVendorRequest {
  vendorName: string;
  vendorConfirmation: string | null;
  submittedAt: string | null;
}

export interface ExcludeCahpsCaseRequest {
  reason: string;
}

export interface CahpsComplianceSummary {
  calendarYear: number;
  quarter: number;
  quarterFrom: string;
  quarterTo: string;
  totalDecedents: number;
  eligibleCount: number;
  ineligibleCount: number;
  excludedCount: number;
  submittedCount: number;
  pendingCount: number;
  notYetSubmittedCount: number;
  submissionRatePercentage: number;
}

export const listCahpsCases = (
  from?: string,
  to?: string,
): Promise<{ data: HospiceCahpsCase[] }> =>
  apiClient
    .get<{ data: HospiceCahpsCase[] }>('/hospice/cahps', {
      params: from && to ? { from, to } : undefined,
    })
    .then((r) => r.data);

export const getCahpsCase = (id: number): Promise<HospiceCahpsCase> =>
  apiClient.get<HospiceCahpsCase>(`/hospice/cahps/${id}`).then((r) => r.data);

export const ensureCahpsCase = (
  req: EnsureCahpsCaseRequest,
): Promise<HospiceCahpsCase> =>
  apiClient.post<HospiceCahpsCase>('/hospice/cahps', req).then((r) => r.data);

export const updateCahpsCaregiver = (
  id: number,
  req: UpdateCaregiverRequest,
): Promise<HospiceCahpsCase> =>
  apiClient
    .patch<HospiceCahpsCase>(`/hospice/cahps/${id}/caregiver`, req)
    .then((r) => r.data);

export const submitCahpsCase = (
  id: number,
  req: SubmitToVendorRequest,
): Promise<HospiceCahpsCase> =>
  apiClient
    .post<HospiceCahpsCase>(`/hospice/cahps/${id}/submit`, req)
    .then((r) => r.data);

export const excludeCahpsCase = (
  id: number,
  req: ExcludeCahpsCaseRequest,
): Promise<HospiceCahpsCase> =>
  apiClient
    .post<HospiceCahpsCase>(`/hospice/cahps/${id}/exclude`, req)
    .then((r) => r.data);

export const getCahpsCompliance = (
  year: number,
  quarter: number,
): Promise<CahpsComplianceSummary> =>
  apiClient
    .get<CahpsComplianceSummary>(`/hospice/cahps/compliance/${year}/q/${quarter}`)
    .then((r) => r.data);

// ─── Reg-9: 837I Hospice Claim Export + Submission Tracking ─────────────────

export type Clearinghouse =
  | 'availity'
  | 'change-healthcare'
  | 'waystar'
  | 'ability-network'
  | 'office-ally'
  | 'mock';

export type ClaimSubmissionStatus =
  | 'pending'
  | 'submitted'
  | 'accepted'
  | 'rejected'
  | 'paid';

export interface Hospice837IExportResult {
  submissionId: number;
  edi837: string;
  controlNumber: string;
  typeOfBill: string;
  lineCount: number;
  totalCharges: number;
  warnings: string[];
}

export interface ClaimSubmissionSummary {
  id: number;
  claimId: number;
  clearinghouse: Clearinghouse;
  status: ClaimSubmissionStatus;
  trackingId: string | null;
  clearinghouseTrackingId: string | null;
  ackStatus: string | null;
  submittedAt: string | null;
  lastStatusCheckedAt: string | null;
  createdAt: string;
}

export interface ClaimSubmissionDetail extends ClaimSubmissionSummary {
  ackMessage: string | null;
  edi837: string | null;
}

export interface ExportHospice837IRequest {
  clearinghouse: Clearinghouse;
  priorAuthorizationNumber?: string | null;
  claimNote?: string | null;
}

export const exportHospice837I = (
  claimId: number,
  req: ExportHospice837IRequest,
): Promise<Hospice837IExportResult> =>
  apiClient
    .post<Hospice837IExportResult>(`/hospice/claims/${claimId}/export-837i`, req)
    .then((r) => r.data);

export const listClaimSubmissions = (
  claimId: number,
): Promise<{ data: ClaimSubmissionSummary[] }> =>
  apiClient
    .get<{ data: ClaimSubmissionSummary[] }>(`/hospice/claims/${claimId}/submissions`)
    .then((r) => r.data);

export const getClaimSubmission = (id: number): Promise<ClaimSubmissionDetail> =>
  apiClient
    .get<ClaimSubmissionDetail>(`/hospice/claim-submissions/${id}`)
    .then((r) => r.data);

export const markClaimSubmissionSubmitted = (
  id: number,
  clearinghouseTrackingId: string | null,
): Promise<ClaimSubmissionSummary> =>
  apiClient
    .post<ClaimSubmissionSummary>(
      `/hospice/claim-submissions/${id}/mark-submitted`,
      { clearinghouseTrackingId },
    )
    .then((r) => r.data);

// ============================================================
// Sub-system E — Discharge & Transition Management
// See cps-dotnet/docs/superpowers/specs/2026-05-26-hospice-discharge-design.md
// ============================================================

export type HospiceDischargeReason =
  | 'Transfer'
  | 'OutOfServiceArea'
  | 'NoLongerTerminal'
  | 'ForCause'
  | 'AgencyClosure';

export type HospiceDischargeTaskType =
  | 'DmeRetrieval'
  | 'RecordsTransfer'
  | 'FamilyNotification'
  | 'PhysicianSignOffConfirmation'
  | 'Other';

export interface HospiceDischarge {
  id: number;
  organizationId: number;
  electionId: number;
  reason: HospiceDischargeReason;
  effectiveDate: string;       // ISO yyyy-MM-dd
  reasonNotes: string | null;
  receivingAgencyName: string | null;
  outOfAreaDestination: string | null;
  idgApprovalDate: string | null;
  physicianSignOffUserId: number | null;
  advanceNoticeDate: string | null;
  alternativeArrangements: string | null;
  surveyRiskFlags: string[];
  isSurveyRisk: boolean;
  pendingTaskCount: number;
  recordedByUserId: number;
  createdAt: string;
  updatedAt: string;
  tasks: HospiceDischargeTask[];
}

export interface HospiceDischargeTask {
  id: number;
  dischargeId: number;
  taskType: HospiceDischargeTaskType;
  title: string;
  dueDate: string;
  completedAt: string | null;
  completedByUserId: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHospiceDischargeRequest {
  reason: HospiceDischargeReason;
  effectiveDate: string;
  reasonNotes?: string | null;
  receivingAgencyName?: string | null;
  outOfAreaDestination?: string | null;
  idgApprovalDate?: string | null;
  physicianSignOffUserId?: number | null;
  advanceNoticeDate?: string | null;
  alternativeArrangements?: string | null;
}

export interface EditHospiceDischargeRequest {
  reasonNotes?: string | null;
  receivingAgencyName?: string | null;
  outOfAreaDestination?: string | null;
  idgApprovalDate?: string | null;
  physicianSignOffUserId?: number | null;
  advanceNoticeDate?: string | null;
  alternativeArrangements?: string | null;
}

export interface CreateHospiceDischargeTaskRequest {
  taskType: HospiceDischargeTaskType;
  title: string;
  dueDate: string;
  notes?: string | null;
}

export interface UpdateHospiceDischargeTaskRequest {
  complete?: boolean;
  title?: string | null;
  dueDate?: string | null;
  notes?: string | null;
}

export const createDischarge = (
  electionId: number,
  body: CreateHospiceDischargeRequest,
): Promise<HospiceDischarge> =>
  apiClient
    .post<HospiceDischarge>(`/hospice/elections/${electionId}/discharge`, body)
    .then((r) => r.data);

export const getDischarge = (dischargeId: number): Promise<HospiceDischarge> =>
  apiClient
    .get<HospiceDischarge>(`/hospice/discharges/${dischargeId}`)
    .then((r) => r.data);

export const editDischarge = (
  dischargeId: number,
  body: EditHospiceDischargeRequest,
): Promise<HospiceDischarge> =>
  apiClient
    .patch<HospiceDischarge>(`/hospice/discharges/${dischargeId}`, body)
    .then((r) => r.data);

export const listDischarges = (
  reasonFilter?: HospiceDischargeReason,
): Promise<HospiceDischarge[]> => {
  const url = reasonFilter
    ? `/hospice/discharges?reason=${reasonFilter}`
    : '/hospice/discharges';
  return apiClient.get<HospiceDischarge[]>(url).then((r) => r.data);
};

export const addDischargeTask = (
  dischargeId: number,
  body: CreateHospiceDischargeTaskRequest,
): Promise<HospiceDischargeTask> =>
  apiClient
    .post<HospiceDischargeTask>(`/hospice/discharges/${dischargeId}/tasks`, body)
    .then((r) => r.data);

export const completeDischargeTask = (
  dischargeId: number,
  taskId: number,
  notes?: string,
): Promise<HospiceDischargeTask> =>
  apiClient
    .patch<HospiceDischargeTask>(
      `/hospice/discharges/${dischargeId}/tasks/${taskId}`,
      { complete: true, notes: notes ?? null } as UpdateHospiceDischargeTaskRequest,
    )
    .then((r) => r.data);

export const editDischargeTask = (
  dischargeId: number,
  taskId: number,
  body: Omit<UpdateHospiceDischargeTaskRequest, 'complete'>,
): Promise<HospiceDischargeTask> =>
  apiClient
    .patch<HospiceDischargeTask>(
      `/hospice/discharges/${dischargeId}/tasks/${taskId}`,
      body,
    )
    .then((r) => r.data);

export const removeDischargeTask = (
  dischargeId: number,
  taskId: number,
): Promise<void> =>
  apiClient
    .delete(`/hospice/discharges/${dischargeId}/tasks/${taskId}`)
    .then(() => undefined);

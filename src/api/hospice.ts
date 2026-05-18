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
